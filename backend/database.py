from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path
from dotenv import load_dotenv

# Load variables from .env if present. We use an absolute path relative to this file
# to ensure it works regardless of where the server is started from.
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Default to local sqlite for development if docker is not running.
# To use MySQL, set DATABASE_URL="mysql+pymysql://user:userpassword@127.0.0.1:3306/bloomerce_db"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Ensure we have a database URL
if not SQLALCHEMY_DATABASE_URL:
    # If missing, we'll try to fallback to a default but log a warning
    # For now, I will keep it clean as requested.
    raise ValueError("DATABASE_URL environment variable is not set!")

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
