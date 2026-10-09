import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.filters import Command, CommandStart
from aiogram.types import Message

from app.core.config import settings

logger = logging.getLogger("bekatuz")


def create_dispatcher() -> Dispatcher:
    dispatcher = Dispatcher()

    @dispatcher.message(CommandStart())
    async def handle_start(message: Message) -> None:
        await message.answer(
            "Bekat Uz boti. Tasdiqlash kodlaringiz shu yerga yuboriladi."
        )

    @dispatcher.message(Command("help"))
    async def handle_help(message: Message) -> None:
        await message.answer(
            "Ro'yxatdan o'tganda Telegram orqali 6 xonali kod yuboriladi."
        )

    @dispatcher.message(Command("code"))
    async def handle_code(message: Message) -> None:
        await message.answer(
            "Kod avtomatik yuboriladi. Agar kod kelmasa, ilovada "
            "\"Kodni qayta yuborish\" tugmasini bosing."
        )

    return dispatcher


async def run_bot() -> None:
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    bot = Bot(token=settings.telegram_bot_token)
    dispatcher = create_dispatcher()
    logger.info("Telegram bot started")
    await dispatcher.start_polling(bot)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_bot())


if __name__ == "__main__":
    main()
