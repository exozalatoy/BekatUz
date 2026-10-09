from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models import Payment, PremiumPlan, Subscription


class PlanOut(BaseModel):
    id: int
    name: str
    price: float
    currency: str
    duration_days: int
    features: list[str]
    is_first_month_free: bool


class PlanCreateIn(BaseModel):
    name: str
    price: float = 0.0
    currency: str = "USD"
    duration_days: int = 30
    features: list[str] = []
    is_first_month_free: bool = False
    is_active: bool = True


class PlanUpdateIn(BaseModel):
    name: str | None = None
    price: float | None = None
    currency: str | None = None
    duration_days: int | None = None
    features: list[str] | None = None
    is_first_month_free: bool | None = None
    is_active: bool | None = None


class PaymentOut(BaseModel):
    id: int
    provider: str
    status: str
    amount: float
    currency: str
    pay_url: str
    created_at: datetime
    paid_at: datetime | None = None


class PremiumMeOut(BaseModel):
    is_premium: bool
    plan: PlanOut | None = None
    expires_at: datetime | None = None
    payments: list[PaymentOut] = []


class SubscribeIn(BaseModel):
    plan_id: int
    provider: Literal["payme", "click"] = "payme"


class SubscribeOut(BaseModel):
    payment_id: int
    provider: str
    pay_url: str
    status: str


class ConfirmIn(BaseModel):
    payment_id: int


class ConfirmOut(BaseModel):
    is_premium: bool
    expires_at: datetime | None = None


class WebhookIn(BaseModel):
    payment_id: int | None = None
    status: str | None = None


def plan_out(plan: PremiumPlan) -> PlanOut:
    return PlanOut(
        id=plan.id,
        name=plan.name,
        price=plan.price,
        currency=plan.currency,
        duration_days=plan.duration_days,
        features=list(plan.features or []),
        is_first_month_free=plan.is_first_month_free,
    )


def payment_out(payment: Payment) -> PaymentOut:
    return PaymentOut(
        id=payment.id,
        provider=payment.provider,
        status=payment.status,
        amount=payment.amount,
        currency=payment.currency,
        pay_url=payment.pay_url,
        created_at=payment.created_at,
        paid_at=payment.paid_at,
    )


def subscription_plan_out(subscription: Subscription) -> PlanOut | None:
    if subscription.plan is not None:
        return plan_out(subscription.plan)
    return PlanOut(
        id=0,
        name=subscription.name,
        price=subscription.price,
        currency=subscription.currency,
        duration_days=subscription.duration_days,
        features=[],
        is_first_month_free=False,
    )
