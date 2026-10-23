import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import get_settings

logger = logging.getLogger("gitpulse.database")
settings = get_settings()

db_url = settings.DATABASE_URL
connect_args = {}
pool_kwargs = {}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    pool_kwargs = {
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_pre_ping": True,
    }

try:
    engine = create_engine(
        db_url,
        echo=settings.DB_ECHO,
        connect_args=connect_args,
        **pool_kwargs,
    )
    # Quick connectivity test
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info(f"Connected to database successfully: {db_url.split('@')[-1] if '@' in db_url else db_url}")
except Exception as e:
    logger.warning(
        f"Unable to connect to primary DATABASE_URL ({db_url.split('@')[-1] if '@' in db_url else db_url}): {e}. "
        "Falling back to local SQLite database (sqlite:///./github_dashboard.db)..."
    )
    fallback_url = "sqlite:///./github_dashboard.db"
    engine = create_engine(fallback_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
