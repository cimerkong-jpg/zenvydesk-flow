from __future__ import annotations

import logging

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import URL, make_url
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)


def build_engine_kwargs(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {}


def get_database_backend(database_url: str | URL) -> str:
    url = make_url(str(database_url))
    backend = url.get_backend_name()
    if backend == "postgres":
        return "postgresql"
    return backend


def mask_database_url(database_url: str | URL) -> str:
    url = make_url(str(database_url))
    backend = get_database_backend(url)
    if backend == "sqlite":
        database = url.database or "./zenvydesk.db"
        return f"sqlite:///{database}"

    host = url.host or "localhost"
    port = f":{url.port}" if url.port else ""
    database = f"/{url.database}" if url.database else ""
    username = f"{url.username}@" if url.username else ""
    return f"{backend}://{username}{host}{port}{database}"


def create_db_engine(database_url: str) -> Engine:
    return create_engine(database_url, **build_engine_kwargs(database_url))


engine = create_db_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def is_sqlite_engine(target_engine: Engine) -> bool:
    return get_database_backend(target_engine.url) == "sqlite"


def describe_database_connection(target_engine: Engine) -> str:
    return f"{get_database_backend(target_engine.url)} ({mask_database_url(target_engine.url)})"


def _add_column_if_missing(table_name: str, column_name: str, ddl: str) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name in columns:
        return
    with engine.begin() as connection:
        connection.execute(text(ddl))


def ensure_drafts_page_id_nullable() -> None:
    if not is_sqlite_engine(engine):
        return

    inspector = inspect(engine)
    if "drafts" not in inspector.get_table_names():
        return

    columns = inspector.get_columns("drafts")
    page_id_column = next((column for column in columns if column["name"] == "page_id"), None)
    if not page_id_column or page_id_column.get("nullable", True):
        return

    with engine.begin() as connection:
        connection.execute(text("PRAGMA foreign_keys=OFF"))
        connection.execute(text("ALTER TABLE drafts RENAME TO drafts_old"))
        connection.execute(
            text(
                """
                CREATE TABLE drafts (
                    id INTEGER NOT NULL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    page_id INTEGER,
                    product_id INTEGER,
                    content_library_id INTEGER,
                    content VARCHAR NOT NULL,
                    media_url VARCHAR,
                    status VARCHAR,
                    scheduled_time DATETIME,
                    is_active BOOLEAN,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users (id),
                    FOREIGN KEY(page_id) REFERENCES facebook_pages (id),
                    FOREIGN KEY(product_id) REFERENCES products (id),
                    FOREIGN KEY(content_library_id) REFERENCES content_library (id)
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO drafts (
                    id, user_id, page_id, product_id, content_library_id,
                    content, media_url, status, scheduled_time, is_active, created_at
                )
                SELECT
                    id, user_id, page_id, product_id, content_library_id,
                    content, media_url, status, scheduled_time, is_active, created_at
                FROM drafts_old
                """
            )
        )
        connection.execute(text("DROP TABLE drafts_old"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_drafts_id ON drafts (id)"))
        connection.execute(text("PRAGMA foreign_keys=ON"))


def ensure_users_table_columns() -> None:
    if not is_sqlite_engine(engine):
        return

    additions = {
        "username": "ALTER TABLE users ADD COLUMN username VARCHAR",
        "full_name": "ALTER TABLE users ADD COLUMN full_name VARCHAR",
        "password_hash": "ALTER TABLE users ADD COLUMN password_hash VARCHAR",
        "role": "ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'member' NOT NULL",
        "status": "ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'active' NOT NULL",
        "is_email_verified": "ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 0 NOT NULL",
        "last_login_at": "ALTER TABLE users ADD COLUMN last_login_at DATETIME",
        "created_by": "ALTER TABLE users ADD COLUMN created_by INTEGER",
        "updated_by": "ALTER TABLE users ADD COLUMN updated_by INTEGER",
        "deleted_at": "ALTER TABLE users ADD COLUMN deleted_at DATETIME",
        "updated_at": "ALTER TABLE users ADD COLUMN updated_at DATETIME",
    }
    for name, ddl in additions.items():
        _add_column_if_missing("users", name, ddl)

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE users
                SET full_name = COALESCE(full_name, name),
                    role = COALESCE(role, 'member'),
                    status = COALESCE(status, 'active'),
                    is_email_verified = COALESCE(is_email_verified, 0),
                    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
                """
            )
        )


def ensure_facebook_pages_columns() -> None:
    if not is_sqlite_engine(engine):
        return

    additions = {
        "is_selected": "ALTER TABLE facebook_pages ADD COLUMN is_selected BOOLEAN DEFAULT 0",
        "category": "ALTER TABLE facebook_pages ADD COLUMN category VARCHAR",
        "tasks": "ALTER TABLE facebook_pages ADD COLUMN tasks VARCHAR",
        "updated_at": "ALTER TABLE facebook_pages ADD COLUMN updated_at DATETIME",
    }
    for name, ddl in additions.items():
        _add_column_if_missing("facebook_pages", name, ddl)


def ensure_automation_rules_columns() -> None:
    if not is_sqlite_engine(engine):
        return

    additions = {
        "product_id": "ALTER TABLE automation_rules ADD COLUMN product_id INTEGER",
        "content_library_id": "ALTER TABLE automation_rules ADD COLUMN content_library_id INTEGER",
        "market": "ALTER TABLE automation_rules ADD COLUMN market VARCHAR",
        "tone": "ALTER TABLE automation_rules ADD COLUMN tone VARCHAR",
        "language": "ALTER TABLE automation_rules ADD COLUMN language VARCHAR",
        "style": "ALTER TABLE automation_rules ADD COLUMN style VARCHAR",
    }
    for name, ddl in additions.items():
        _add_column_if_missing("automation_rules", name, ddl)


def ensure_auth_tables() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(
        bind=engine,
        tables=[
            models.RefreshToken.__table__,
            models.PasswordResetToken.__table__,
            models.OAuthIdentity.__table__,
            models.OAuthConnectionSession.__table__,
        ],
    )


def init_database() -> None:
    from app import models  # noqa: F401

    logger.info("Initializing database using %s", describe_database_connection(engine))
    Base.metadata.create_all(bind=engine)
    if is_sqlite_engine(engine):
        ensure_users_table_columns()
        ensure_drafts_page_id_nullable()
        ensure_facebook_pages_columns()
        ensure_automation_rules_columns()
    else:
        logger.info("Skipping SQLite compatibility patches for backend=%s", get_database_backend(engine.url))
    ensure_auth_tables()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
