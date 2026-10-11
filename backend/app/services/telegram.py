import asyncio
import logging
import random
import threading
from datetime import timedelta

from app.core.config import settings
from app.core.database import utcnow
from app.models import TelegramCode

logger = logging.getLogger("bekatuz")

CODE_TTL_MINUTES = 5
MAX_ATTEMPTS = 5


def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def store_code(db, phone: str, code: str) -> TelegramCode:
    db.query(TelegramCode).filter(TelegramCode.phone == phone).delete()
    row = TelegramCode(
        phone=phone,
        code=code,
        expires_at=utcnow() + timedelta(minutes=CODE_TTL_MINUTES),
    )
    db.add(row)
    db.commit()
    return row


def _run_async(coro):
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    result: dict = {}

    def runner() -> None:
        try:
            result["value"] = asyncio.run(coro)
        except Exception as exc:  # pragma: no cover
            result["error"] = exc

    thread = threading.Thread(target=runner)
    thread.start()
    thread.join()
    if "error" in result:
        raise result["error"]
    return result.get("value")


def is_chat_id(value: str | None) -> bool:
    """Telegram chat_id raqamli bo'ladi (masalan -1001234567890 yoki 123456789).

    '@username' ko'rinishidagi qiymatga bot xabar yubora olmaydi, chunki foydalanuvchi
    botga oldin yozmagan bo'lsa username orqali chat_id aniqlanmaydi.
    """
    if not value:
        return False
    return value.lstrip("-").isdigit()


async def _send_telegram_message(text: str, chat_id: str | int) -> None:
    from aiogram import Bot

    bot = Bot(token=settings.telegram_bot_token)
    try:
        await bot.send_message(chat_id, text)
    finally:
        await bot.session.close()


def send_code(db, phone: str, telegram_id: str | None = None) -> str | None:
    """Har bir raqam uchun alohida kod yaratadi va faqat o'sha raqamga
    bog'langan Telegram chatga yuboradi."""
    code = generate_code()
    store_code(db, phone, code)
    if settings.telegram_enabled and is_chat_id(telegram_id):
        try:
            _run_async(
                _send_telegram_message(
                    f"Bekat Uz tasdiqlash kodi: {code}\n\nKod 5 daqiqa amal qiladi.",
                    telegram_id,  # type: ignore[arg-type]
                )
            )
            return None
        except Exception:
            logger.exception("Failed to send Telegram code to %s", telegram_id)
    # Kod faqat Telegram bot orqali yetkaziladi. Demo kod faqat lokal dev da chiqadi.
    if settings.env == "dev":
        logger.info("Telegram verification code for %s: %s", phone, code)
        return code
    logger.info(
        "Verification code generated for %s (deliver via Telegram bot deep link)", phone
    )
    return None


def send_text(text: str, telegram_id: str | None = None) -> bool:
    if not settings.telegram_enabled or not is_chat_id(telegram_id):
        return False
    try:
        _run_async(_send_telegram_message(text, telegram_id))  # type: ignore[arg-type]
        return True
    except Exception:
        logger.exception("Failed to send Telegram message to %s", telegram_id)
        return False
