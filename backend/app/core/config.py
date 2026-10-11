from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "dev"
    secret_key: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14

    database_url: str = "sqlite:///./bekatuz.db"
    redis_url: str = "redis://localhost:6379/0"

    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    telegram_bot_username: str = "bekatuzz_bot"

    payment_card_number: str = "5614 6818 8670 3564"
    payment_card_holder: str = ""

    simulate_vehicles: bool = True

    @field_validator("database_url")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return "postgresql+psycopg://" + value[len("postgres://"):]
        if value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value[len("postgresql://"):]
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def telegram_enabled(self) -> bool:
        return bool(self.telegram_bot_token)

    def telegram_link(self, phone: str) -> str:
        payload = phone.replace("+", "").strip()
        return f"https://t.me/{self.telegram_bot_username}?start={payload}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
