from app.core.database import utcnow
from app.models import Payment, PremiumPlan, User
from app.services.payments.base import PaymentProvider


class PaymeProvider(PaymentProvider):
    name = "payme"

    def create_payment(self, db, user: User, plan: PremiumPlan) -> Payment:
        payment = Payment(
            user_id=user.id,
            plan_id=plan.id,
            provider=self.name,
            status="pending",
            amount=plan.price,
            currency=plan.currency,
            pay_url="",
        )
        db.add(payment)
        db.flush()
        payment.pay_url = f"https://mock.payme.uz/pay/{payment.id}"
        db.commit()
        db.refresh(payment)
        return payment

    def confirm_payment(self, db, payment: Payment) -> None:
        payment.status = "paid"
        payment.paid_at = utcnow()
        db.commit()
