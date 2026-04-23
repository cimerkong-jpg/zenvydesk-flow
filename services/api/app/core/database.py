from __future__ import annotations

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings


engine_kwargs = {}
if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


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
    additions = {
        "is_selected": "ALTER TABLE facebook_pages ADD COLUMN is_selected BOOLEAN DEFAULT 0",
        "category": "ALTER TABLE facebook_pages ADD COLUMN category VARCHAR",
        "tasks": "ALTER TABLE facebook_pages ADD COLUMN tasks VARCHAR",
        "updated_at": "ALTER TABLE facebook_pages ADD COLUMN updated_at DATETIME",
    }
    for name, ddl in additions.items():
        _add_column_if_missing("facebook_pages", name, ddl)


def ensure_automation_rules_columns() -> None:
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

    Base.metadata.create_all(bind=engine)
    ensure_users_table_columns()
    ensure_drafts_page_id_nullable()
    ensure_facebook_pages_columns()
    ensure_automation_rules_columns()
    ensure_auth_tables()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
