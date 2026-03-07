import os
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

load_dotenv()

# ─── Connection config ────────────────────────────────────────────────────────
MYSQL_USER     = os.getenv("MYSQL_USER", "user")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "password")
MYSQL_HOST     = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT     = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_DB       = os.getenv("MYSQL_DB", "tutor_db")


def get_connection() -> pymysql.connections.Connection:
    """
    Return a new pymysql connection with DictCursor as default cursor.
    The caller is responsible for closing (or using it as a context manager).
    """
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def init_db():
    """
    Verify that a connection can be established.
    Tables are created via tables.sql DDL – we do NOT auto-create them here.
    """
    try:
        conn = get_connection()
        conn.close()
        print("[DB] Connection established successfully.")
    except Exception as e:
        print(f"[DB] WARNING – could not connect to MySQL: {e}")
