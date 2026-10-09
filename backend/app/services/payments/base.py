from abc import ABC, abstractmethod
from datetime import timedelta

from app.core.database import utcnow
from app.core.errors import DomainError
from app.models import Payment, PremiumPlan, Subscription, User


class PaymentProvider(ABC):
    name: str

    @abstractmethod
    def create_payment(self, db, user: User, plan: PremiumPlan) -> Payment:
        raise NotImplementedError

    @abstractmethod
    def confirm_payment(self, db, payment: Payment) -> None:
        raise NotImplementedError


def activate_subscription(db, user: User, payment: Payment) -> Subscription:
    plan = payment.plan
    if plan is None and payment.plan_id is not None:
        plan = db.get(PremiumPlan, payment.plan_id)
    duration_days = plan.duration_days if plan is not None else 30
    now = utcnow()
    base = user.premium_expires_at
    if base is None or base < now:
        base = now
    expires_at = base + timedelta(days=duration_days)
    subscription = Subscription(
        user_id=user.id,
        plan_id=plan.id if plan is not None else None,
        name=plan.name if plan is not None else "Premium",
        price=payment.amount,
        currency=payment.currency,
        duration_days=duration_days,
        provider=payment.provider,
        status="active",
        starts_at=now,
        expires_at=expires_at,
    )
    db.add(subscription)
    user.is_premium = True
    user.premium_expires_at = expires_at
    db.commit()
    return subscription


def _get_provider_class(provider: str) -> type[PaymentProvider]:
    from app.services.payments.click import ClickProvider
    from app.services.payments.payme import PaymeProvider

    registry: dict[str, type[PaymentProvider]] = {
        "payme": PaymeProvider,
        "click": ClickProvider,
    }
    provider_class = registry.get(provider)
    if provider_class is None:
        raise DomainError("Unknown payment provider", 400)
    return provider_class


def get_provider(provider: str) -> PaymentProvider:
    return _get_provider_class(provider)()
