import os
import sys
from logging.config import fileConfig
import asyncio

# ensure 'backend' (parent of alembic/) is on sys.path so `import app` works
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from alembic import context
from sqlalchemy import pool
from sqlalchemy import engine_from_config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import app.db.models
from app.db.base import Base  # target metadata
from config import settings 

config = context.config

# override sqlalchemy.url in alembic config with the one from .env (settings)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging.
fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode (no DB connection)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    """Run migrations using a *synchronous* connection (called via connection.run_sync)."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    """Run migrations in 'online' mode using an AsyncEngine and connection.run_sync."""
    # create async engine from the URL in config
    connectable = create_async_engine(
        config.get_main_option("sqlalchemy.url"),
        poolclass=pool.NullPool,
        future=True,
    )

    async with connectable.connect() as async_connection:
        # run the synchronous migration logic in a thread managed by SQLAlchemy
        await async_connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
