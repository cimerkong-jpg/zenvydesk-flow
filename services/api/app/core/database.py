from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite database URL (for development)
SQLALCHEMY_DATABASE_URL = "sqlite:///./zenvydesk.db"

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def ensure_drafts_page_id_nullable() -> None:
    """Migrate legacy SQLite drafts table so page_id can be null."""
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
        connection.execute(text("""
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
        """))
        connection.execute(text("""
            INSERT INTO drafts (
                id, user_id, page_id, product_id, content_library_id,
                content, media_url, status, scheduled_time, is_active, created_at
            )
            SELECT
                id, user_id, page_id, product_id, content_library_id,
                content, media_url, status, scheduled_time, is_active, created_at
            FROM drafts_old
        """))
        connection.execute(text("DROP TABLE drafts_old"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_drafts_id ON drafts (id)"))
        connection.execute(text("PRAGMA foreign_keys=ON"))


def ensure_facebook_pages_selected_column() -> None:
    """Add is_selected to legacy facebook_pages table when missing."""
    inspector = inspect(engine)
    if "facebook_pages" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("facebook_pages")}
    if "is_selected" in columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE facebook_pages ADD COLUMN is_selected BOOLEAN DEFAULT 0"
            )
        )


def ensure_automation_rules_columns() -> None:
    """Add newer automation_rules columns to legacy SQLite tables when missing."""
    inspector = inspect(engine)
    if "automation_rules" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("automation_rules")}
    additions = {
        "product_id": "ALTER TABLE automation_rules ADD COLUMN product_id INTEGER",
        "content_library_id": "ALTER TABLE automation_rules ADD COLUMN content_library_id INTEGER",
        "tone": "ALTER TABLE automation_rules ADD COLUMN tone VARCHAR",
        "language": "ALTER TABLE automation_rules ADD COLUMN language VARCHAR",
        "style": "ALTER TABLE automation_rules ADD COLUMN style VARCHAR",
    }

    with engine.begin() as connection:
        for name, ddl in additions.items():
            if name not in columns:
                connection.execute(text(ddl))


def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
