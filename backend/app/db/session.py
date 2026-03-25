from sqlalchemy import create_engine
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.db.models import Base

DATABASE_URL = 'sqlite:///./app.db'

engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False})
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine,
)


def _add_column_if_missing(table: str, column: str, ddl: str) -> None:
    with engine.begin() as connection:
        existing = {
            row[1]
            for row in connection.execute(text(f"PRAGMA table_info({table})")).fetchall()
        }
        if column not in existing:
            connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _add_column_if_missing("cases", "mode", "mode VARCHAR(20) NOT NULL DEFAULT 'normal'")
    _add_column_if_missing("cases", "d1_status", "d1_status VARCHAR(20) NOT NULL DEFAULT 'missing'")
