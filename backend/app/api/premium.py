from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import DomainError
from app.models import Payment, PremiumPlan, Subscription, User
from app.schemas.premium import (
    ConfirmIn,
    ConfirmOut,
    PremiumMeOut,
    SubscribeIn,
    SubscribeOut,
    WebhookIn,
    payment_out,
    plan_out,
    subscription_plan_out,
)
from app.services.payments import activate_subscription, get_provider

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


@router.post("/premium/subscribe", response_model=SubscribeOut)
def subscribe(
    body: SubscribeIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    plan = db.get(PremiumPlan, body.plan_id)
    if plan is None:
        raise DomainError("Plan not found", 404)
    provider = get_provider(body.provider)
    payment = provider.create_payment(db, user, plan)
    return SubscribeOut(
        payment_id=payment.id,
        provider=payment.provider,
        pay_url=payment.pay_url,
        status=payment.status,
    )


@router.post("/premium/confirm", response_model=ConfirmOut)
def confirm(
    body: ConfirmIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    payment = db.get(Payment, body.payment_id)
    if payment is None:
        raise DomainError("Payment not found", 404)
    if payment.user_id != user.id and user.role != "admin":
        raise DomainError("Forbidden", 403)
    if payment.status != "paid":
        provider = get_provider(payment.provider)
        provider.confirm_payment(db, payment)
        activate_subscription(db, user, payment)
    return ConfirmOut(is_premium=user.is_premium, expires_at=user.premium_expires_at)


@router.post("/payments/webhook/{provider_name}")
def payment_webhook(
    provider_name: str,
    body: WebhookIn,
    db=Depends(get_db),
):
    if body.payment_id is None:
        raise DomainError("payment_id is required", 400)
    payment = db.get(Payment, body.payment_id)
    if payment is None:
        raise DomainError("Payment not found", 404)
    if payment.provider != provider_name:
        raise DomainError("Provider mismatch", 400)
    payer = db.get(User, payment.user_id)
    if payment.status != "paid":
        provider = get_provider(payment.provider)
        provider.confirm_payment(db, payment)
        if payer is not None:
            activate_subscription(db, payer, payment)
    return {"detail": "Webhook processed", "payment_id": payment.id, "status": payment.status}
