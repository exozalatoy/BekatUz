"""add chat conversations and messages

Revision ID: b4a7c2d8e1f0
Revises: 3b7a1f0c92de
Create Date: 2026-10-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b4a7c2d8e1f0"
down_revision = "3b7a1f0c92de"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_conversations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("passenger_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=True),
        sa.Column("last_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["driver_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["passenger_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("chat_conversations") as batch_op:
        batch_op.create_index(
            batch_op.f("ix_chat_conversations_passenger_id"),
            ["passenger_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_chat_conversations_driver_id"), ["driver_id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_chat_conversations_last_at"), ["last_at"], unique=False
        )

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=10), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["chat_conversations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("chat_messages") as batch_op:
        batch_op.create_index(
            batch_op.f("ix_chat_messages_conversation_id"),
            ["conversation_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_chat_messages_sender_id"), ["sender_id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_chat_messages_type"), ["type"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_chat_messages_created_at"), ["created_at"], unique=False
        )


def downgrade() -> None:
    with op.batch_alter_table("chat_messages") as batch_op:
        batch_op.drop_index(batch_op.f("ix_chat_messages_created_at"))
        batch_op.drop_index(batch_op.f("ix_chat_messages_type"))
        batch_op.drop_index(batch_op.f("ix_chat_messages_sender_id"))
        batch_op.drop_index(batch_op.f("ix_chat_messages_conversation_id"))
    op.drop_table("chat_messages")
    with op.batch_alter_table("chat_conversations") as batch_op:
        batch_op.drop_index(batch_op.f("ix_chat_conversations_last_at"))
        batch_op.drop_index(batch_op.f("ix_chat_conversations_driver_id"))
        batch_op.drop_index(batch_op.f("ix_chat_conversations_passenger_id"))
    op.drop_table("chat_conversations")