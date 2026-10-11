"""add push_subscriptions table

Revision ID: 3b7a1f0c92de
Revises: 9c4f6b2a8e7d
Create Date: 2026-10-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "3b7a1f0c92de"
down_revision = "9c4f6b2a8e7d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.String(length=255), nullable=False),
        sa.Column("auth", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("endpoint"),
    )
    with op.batch_alter_table("push_subscriptions") as batch_op:
        batch_op.create_index(
            batch_op.f("ix_push_subscriptions_user_id"), ["user_id"], unique=False
        )


def downgrade() -> None:
    with op.batch_alter_table("push_subscriptions") as batch_op:
        batch_op.drop_index(batch_op.f("ix_push_subscriptions_user_id"))
    op.drop_table("push_subscriptions")
