from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


def build_page(items: list, total: int, page: int, page_size: int) -> dict:
    pages = (total + page_size - 1) // page_size if page_size else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


class MessageOut(BaseModel):
    message: str


class DevMessageOut(BaseModel):
    message: str
    dev_code: str | None = None


class DetailOut(BaseModel):
    detail: str


class ItemsOut(BaseModel):
    items: list
