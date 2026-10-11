"""add receipt_data to payments

Revision ID: 9c4f6b2a8e7d
Revises: 1d54df180e49
Create Date: 2026-10-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "9c4f6b2a8e7d"
down_revision = "1d54df180e49"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("payments") as batch_op:
        batch_op.add_column(sa.Column("receipt_data", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("payments") as batch_op:
        batch_op.drop_column("receipt_data")