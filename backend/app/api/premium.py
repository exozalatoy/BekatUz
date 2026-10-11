from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import DomainError
from app.models import Payment, PremiumPlan, Subscription, User
from app.schemas.premium import (
    PaymentInfoOut,
    PremiumMeOut,
    ReceiptIn,
    ReceiptOut,
    SubscribeIn,
    SubscribeOut,
    payment_out,
    plan_out,
    subscription_plan_out,
)

router = APIRouter(tags=["premium"])


@router.get("/premium/plans")
def list_plans(db=Depends(get_db)):
    plans = db.scalars(
        select(PremiumPlan)
        .where(PremiumPlan.is_active.is_(True))
        .order_by(PremiumPlan.price)
    ).all()
    return {"items": [plan_out(plan) for plan in plans]}


@router.get("/premium/me", response_model=PremiumMeOut)
def premium_me(user: User = Depends(get_current_user), db=Depends(get_db)):
    subscription = db.scalar(
        select(Subscription)
        .where(Subscription.user_id == user.id)
        .order_by(Subscription.expires_at.desc())
    )
    payments = db.scalars(
        select(Payment)
        .where(Payment.user_id == user.id)
        .order_by(Payment.id.desc())
    ).all()
    plan = subscription_plan_out(subscription) if subscription else None
    return PremiumMeOut(
        is_premium=user.is_premium,
        plan=plan,
        expires_at=user.premium_expires_at,
        payments=[payment_out(p) for p in payments],
    )


@router.get("/premium/payment-info", response_model=PaymentInfoOut)
def payment_info():
    return PaymentInfoOut(
        card_number=settings.payment_card_number,
        card_holder=settings.payment_card_holder,
    )


@router.post("/premium/subscribe", response_model=SubscribeOut)
def subscribe(
    body: SubscribeIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    plan = db.get(PremiumPlan, body.plan_id)
    if plan is None:
        raise DomainError("Plan not found", 404)
    payment = Payment(
        user_id=user.id,
        plan_id=plan.id,
        provider="card",
        status="pending",
        amount=plan.price,
        currency=plan.currency,
        pay_url="",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return SubscribeOut(
        payment_id=payment.id,
        status=payment.status,
        amount=payment.amount,
        currency=payment.currency,
        card_number=settings.payment_card_number,
        card_holder=settings.payment_card_holder,
    )


@router.post("/premium/receipt", response_model=ReceiptOut)
def upload_receipt(
    body: ReceiptIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    payment = db.get(Payment, body.payment_id)
    if payment is None:
        raise DomainError("Payment not found", 404)
    if payment.user_id != user.id:
        raise DomainError("Forbidden", 403)
    if payment.status == "paid":
        raise DomainError("Payment already completed", 400)
    data = body.receipt_data.strip()
    if not data.startswith("data:image/"):
        raise DomainError("Receipt must be an image", 400)
    if len(data) > 8 * 1024 * 1024:
        raise DomainError("Receipt image is too large", 400)
    data = data[: 4 * 1024 * 1024]
    payment.receipt_data = data
    payment.status = "review"
    db.commit()
    return ReceiptOut(payment_id=payment.id, status=payment.status)