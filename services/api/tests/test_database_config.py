from types import SimpleNamespace

from sqlalchemy import create_mock_engine
from sqlalchemy.engine.url import make_url

from app.core.config import Settings
import app.core.database as database_module
import create_tables as create_tables_module


def test_settings_default_to_sqlite_when_database_url_is_blank():
    settings = Settings(database_url="")

    assert settings.database_url == "sqlite:///./zenvydesk.db"
    assert settings.resolved_database_backend == "sqlite"


def test_settings_use_postgresql_when_database_url_is_present():
    settings = Settings(database_url="postgresql://zenvy:secret@db.example.com:5432/zenvydesk")

    assert settings.database_url == "postgresql://zenvy:secret@db.example.com:5432/zenvydesk"
    assert settings.resolved_database_backend == "postgresql"


def test_settings_normalize_legacy_postgres_scheme():
    settings = Settings(database_url="postgres://zenvy:secret@db.example.com:5432/zenvydesk")

    assert settings.database_url == "postgresql://zenvy:secret@db.example.com:5432/zenvydesk"
    assert settings.resolved_database_backend == "postgresql"


def test_engine_kwargs_only_apply_sqlite_thread_check():
    assert database_module.build_engine_kwargs("sqlite:///./zenvydesk.db") == {
        "connect_args": {"check_same_thread": False}
    }
    assert database_module.build_engine_kwargs("postgresql://zenvy:secret@db.example.com/zenvydesk") == {}


def test_mask_database_url_hides_password():
    masked = database_module.mask_database_url("postgresql://zenvy:super-secret@db.example.com:5432/zenvydesk")

    assert masked == "postgresql://zenvy@db.example.com:5432/zenvydesk"
    assert "super-secret" not in masked


def test_init_database_runs_sqlite_compatibility_patches_for_sqlite(monkeypatch):
    calls: list[str] = []
    sqlite_engine = SimpleNamespace(url=make_url("sqlite:///:memory:"))

    monkeypatch.setattr(database_module, "engine", sqlite_engine)
    monkeypatch.setattr(database_module.Base.metadata, "create_all", lambda bind=None, tables=None: calls.append("create_all"))
    monkeypatch.setattr(database_module, "ensure_users_table_columns", lambda: calls.append("users"))
    monkeypatch.setattr(database_module, "ensure_drafts_page_id_nullable", lambda: calls.append("drafts"))
    monkeypatch.setattr(database_module, "ensure_facebook_pages_columns", lambda: calls.append("facebook_pages"))
    monkeypatch.setattr(database_module, "ensure_automation_rules_columns", lambda: calls.append("automation_rules"))
    monkeypatch.setattr(database_module, "ensure_auth_tables", lambda: calls.append("auth_tables"))

    database_module.init_database()

    assert calls == [
        "create_all",
        "users",
        "drafts",
        "facebook_pages",
        "automation_rules",
        "auth_tables",
    ]


def test_init_database_skips_sqlite_patches_for_postgresql_and_compiles_schema(monkeypatch):
    emitted_sql: list[str] = []
    postgres_engine = create_mock_engine(
        "postgresql://zenvy:secret@db.example.com:5432/zenvydesk",
        lambda sql, *multiparams, **params: emitted_sql.append(str(sql)),
    )
    postgres_engine.url = make_url("postgresql://zenvy:secret@db.example.com:5432/zenvydesk")

    monkeypatch.setattr(database_module, "engine", postgres_engine)

    skipped_calls: list[str] = []
    monkeypatch.setattr(database_module, "ensure_users_table_columns", lambda: skipped_calls.append("users"))
    monkeypatch.setattr(database_module, "ensure_drafts_page_id_nullable", lambda: skipped_calls.append("drafts"))
    monkeypatch.setattr(database_module, "ensure_facebook_pages_columns", lambda: skipped_calls.append("facebook_pages"))
    monkeypatch.setattr(database_module, "ensure_automation_rules_columns", lambda: skipped_calls.append("automation_rules"))

    database_module.init_database()

    assert skipped_calls == []
    assert any("CREATE TABLE users" in statement for statement in emitted_sql)
    assert any("CREATE TABLE products" in statement for statement in emitted_sql)


def test_create_tables_script_reuses_shared_init_database(monkeypatch):
    calls: list[str] = []

    monkeypatch.setattr(create_tables_module, "init_database", lambda: calls.append("init_database"))

    create_tables_module.create_tables()

    assert calls == ["init_database"]
