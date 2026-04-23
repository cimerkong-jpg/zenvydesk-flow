from app.core.database import describe_database_connection, engine, init_database


def create_tables() -> None:
    init_database()


if __name__ == "__main__":
    create_tables()
    print(f"All tables created successfully on {describe_database_connection(engine)}")
