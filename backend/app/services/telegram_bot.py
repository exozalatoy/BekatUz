import asyncio
import logging

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import KeyboardButton, Message, ReplyKeyboardMarkup
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import User
from app.services.telegram import generate_code, store_code

logger = logging.getLogger("bekatuz")

PHONE_KEYBOARD = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="Telefon raqamni yuborish", request_contact=True)]
    ],
    resize_keyboard=True,
)

PHONE_PROMPT = (
    "Telefon raqamingizni yuboring (masalan: +998 90 123 45 67 yoki 901234567). "
    "Shunda tasdiqlash kodi shu chatga keladi."
)


def _normalize_phone(payload: str) -> str | None:
    digits = "".join(ch for ch in payload if ch.isdigit())
    if len(digits) == 9:
        digits = "998" + digits
    if len(digits) == 12 and digits.startswith("998"):
        return "+" + digits
    return None


async def _deliver_code(message: Message, phone: str | None) -> None:
    if phone is None:
        await message.answer(PHONE_PROMPT, reply_markup=PHONE_KEYBOARD)
        return
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.phone == phone))
        if user is None:
            await message.answer(
                "Bu raqam tizimda topilmadi. Avval ilovada ro'yxatdan o'ting.",
                reply_markup=PHONE_KEYBOARD,
            )
            return
        user.telegram_id = str(message.chat.id)
        db.commit()
        code = generate_code()
        store_code(db, phone, code)
    await message.answer(
        f"Bekat Uz tasdiqlash kodi: <b>{code}</b>\n\n"
        "Kod 10 daqiqa amal qiladi. Faqat eng oxirgi kod ishlaydi.",
        parse_mode="HTML",
    )


def create_dispatcher() -> Dispatcher:
    dispatcher = Dispatcher()

    @dispatcher.message(CommandStart(deep_link=True))
    async def handle_start_deep(message: Message, command) -> None:
        await _deliver_code(message, _normalize_phone(command.args or ""))

    @dispatcher.message(CommandStart())
    async def handle_start(message: Message) -> None:
        await message.answer(
            "Bekat Uz botiga xush kelibsiz! Kod olish uchun telefon raqamingizni "
            "shu chatga yuboring.\n\n" + PHONE_PROMPT,
            reply_markup=PHONE_KEYBOARD,
        )

    @dispatcher.message(Command("help"))
    async def handle_help(message: Message) -> None:
        await message.answer(PHONE_PROMPT, reply_markup=PHONE_KEYBOARD)

    @dispatcher.message(Command("code"))
    async def handle_code(message: Message) -> None:
        await message.answer(PHONE_PROMPT, reply_markup=PHONE_KEYBOARD)

    @dispatcher.message(F.contact)
    async def handle_contact(message: Message) -> None:
        await _deliver_code(message, _normalize_phone(message.contact.phone_number))

    @dispatcher.message(F.text & ~F.text.startswith("/"))
    async def handle_phone_text(message: Message) -> None:
        await _deliver_code(message, _normalize_phone(message.text or ""))

    return dispatcher


async def run_bot() -> None:
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    bot = Bot(token=settings.telegram_bot_token)
    dispatcher = create_dispatcher()
    logger.info("Telegram bot started")
    await dispatcher.start_polling(bot)


_bot_task: asyncio.Task | None = None


async def _poll_forever(token: str) -> None:
    bot = Bot(token=token)
    dispatcher = create_dispatcher()
    try:
        await dispatcher.start_polling(bot)
    finally:
        await bot.session.close()


def start_bot() -> "asyncio.Task | None":
    global _bot_task
    if not settings.telegram_enabled:
        logger.info("Telegram bot disabled (no token)")
        return None
    if _bot_task is not None and not _bot_task.done():
        return _bot_task
    _bot_task = asyncio.create_task(
        _poll_forever(settings.telegram_bot_token), name="telegram-bot"
    )
    logger.info("Telegram bot polling started (@%s)", settings.telegram_bot_username)
    return _bot_task


async def stop_bot() -> None:
    global _bot_task
    if _bot_task is None:
        return
    _bot_task.cancel()
    try:
        await _bot_task
    except BaseException:
        pass
    _bot_task = None
    logger.info("Telegram bot stopped")


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_bot())


if __name__ == "__main__":
    main()
