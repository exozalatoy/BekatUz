from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select

from app.core.database import get_db, utcnow
from app.core.errors import DomainError
from app.models import News
from app.schemas.common import build_page
from app.schemas.news import NewsOut, news_out

router = APIRouter(tags=["news"])


@router.get("/news")
def list_news(
    category: str = "all",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    db=Depends(get_db),
):
    stmt = select(News)
    if category and category != "all":
        stmt = stmt.where(News.category == category)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(or_(News.title.ilike(pattern), News.body.ilike(pattern)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(News.is_pinned.desc(), News.published_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return build_page([news_out(row) for row in rows], total, page, page_size)


@router.get("/news/{news_id}", response_model=NewsOut)
def get_news(news_id: int, db=Depends(get_db)):
    item = db.get(News, news_id)
    if item is None:
        raise DomainError("News not found", 404)
    item.views += 1
    item.updated_at = utcnow()
    db.commit()
    return news_out(item)
