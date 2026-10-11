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


async def _send_telegram_message(text: str) -> None:
    from aiogram import Bot

    bot = Bot(token=settings.telegram_bot_token)
    try:
        target = settings.telegram_chat_id
        if target:
            await bot.send_message(target, text)
    finally:
        await bot.session.close()


def send_code(db, phone: str, telegram_id: str | None = None) -> str | None:
    code = generate_code()
    store_code(db, phone, code)
    if settings.telegram_enabled:
        target = settings.telegram_chat_id or telegram_id
        if target:
            try:
                _run_async(_send_telegram_message(f"Bekat Uz tasdiqlash kodi: {code}"))
                return None
            except Exception:
                logger.exception("Failed to send Telegram code to %s", target)
    # Kod faqat Telegram bot orqali yetkaziladi. Demo kod faqat lokal dev da chiqadi.
    if settings.env == "dev":
        logger.info("Telegram verification code for %s: %s", phone, code)
        return code
    logger.info("Verification code generated for %s (delivered via Telegram bot)", phone)
    return None


def send_text(text: str, telegram_id: str | None = None) -> bool:
    if not settings.telegram_enabled:
        return False
    target = settings.telegram_chat_id or telegram_id
    if not target:
        return False
    _run_async(_send_telegram_message(text))
    return True
