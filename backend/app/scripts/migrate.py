from pathlib import Path

from alembic import command
from alembic.config import Config

BACKEND_ROOT = Path(__file__).resolve().parents[2]
ALEMBIC_INI = BACKEND_ROOT / "alembic.ini"
ALEMBIC_DIR = BACKEND_ROOT / "alembic"


def main() -> None:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("script_location", str(ALEMBIC_DIR))
    try:
        command.upgrade(cfg, "head")
        print("Migrations applied: alembic upgrade head")
        return
    except Exception as exc:
        print(f"alembic upgrade failed: {exc}")
        print("Falling back to Base.metadata.create_all ...")

    from app.core.database import Base, engine
    import app.models  # noqa: F401

    Base.metadata.create_all(engine)
    try:
        command.stamp(cfg, "head")
    except Exception as stamp_exc:
        print(f"alembic stamp failed: {stamp_exc}")
    print("Schema created via Base.metadata.create_all")


if __name__ == "__main__":
    main()
