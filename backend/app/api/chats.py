from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select

from app.core.database import get_db, utcnow
from app.core.deps import get_current_user
from app.core.errors import DomainError
from app.models import ChatConversation, ChatMessage, User
from app.schemas.chat import (
    ChatConversationListOut,
    ChatConversationOut,
    ChatMessageListOut,
    ChatMessageOut,
    ChatMessageSendIn,
    chat_message_out,
    conversation_out,
)
from app.schemas.common import DetailOut
from app.services.push import notify_user
from app.services.realtime import manager

router = APIRouter(tags=["chats"])


def _get_conversation(db, user: User, conversation_id: int) -> ChatConversation:
    conversation = db.get(ChatConversation, conversation_id)
    if conversation is None or user.id not in (
        conversation.passenger_id,
        conversation.driver_id,
    ):
        raise DomainError("Conversation not found", 404)
    return conversation


def _last_message(db, conversation_id: int) -> ChatMessage | None:
    return db.scalar(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.id.desc())
        .limit(1)
    )


def _unread_count(db, conversation_id: int, user_id: int) -> int:
    return (
        db.scalar(
            select(func.count(ChatMessage.id)).where(
                ChatMessage.conversation_id == conversation_id,
                ChatMessage.sender_id != user_id,
                ChatMessage.is_read.is_(False),
            )
        )
        or 0
    )


@router.get("/chats/conversations", response_model=ChatConversationListOut)
def list_conversations(
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    conversations = db.scalars(
        select(ChatConversation)
        .where(
            or_(
                ChatConversation.passenger_id == user.id,
                ChatConversation.driver_id == user.id,
            )
        )
        .order_by(ChatConversation.last_at.desc())
    ).all()
    items = [
        conversation_out(
            db,
            conversation,
            user,
            last_message=_last_message(db, conversation.id),
            unread=_unread_count(db, conversation.id, user.id),
        )
        for conversation in conversations
    ]
    return ChatConversationListOut(items=items)


@router.get("/chats/conversation", response_model=ChatConversationOut)
def get_or_create_conversation(
    peer_id: int,
    trip_id: int | None = None,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if peer_id == user.id:
        raise DomainError("Cannot chat with yourself", 400)
    peer = db.get(User, peer_id)
    if peer is None:
        raise DomainError("User not found", 404)
    conversation = db.scalar(
        select(ChatConversation)
        .where(
            or_(
                (ChatConversation.passenger_id == user.id)
                & (ChatConversation.driver_id == peer_id),
                (ChatConversation.passenger_id == peer_id)
                & (ChatConversation.driver_id == user.id),
            )
        )
        .order_by(ChatConversation.id.desc())
    )
    if conversation is None:
        if user.role == "passenger":
            passenger_id, driver_id = user.id, peer_id
        elif peer.role == "passenger":
            passenger_id, driver_id = peer_id, user.id
        else:
            raise DomainError("Chat only between passenger and driver", 400)
        conversation = ChatConversation(
            passenger_id=passenger_id,
            driver_id=driver_id,
            trip_id=trip_id,
            last_at=utcnow(),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    return conversation_out(
        db,
        conversation,
        user,
        last_message=_last_message(db, conversation.id),
        unread=_unread_count(db, conversation.id, user.id),
    )


@router.get("/chats/{conversation_id}", response_model=ChatConversationOut)
def get_conversation(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    conversation = _get_conversation(db, user, conversation_id)
    return conversation_out(
        db,
        conversation,
        user,
        last_message=_last_message(db, conversation.id),
        unread=_unread_count(db, conversation.id, user.id),
    )


@router.get("/chats/{conversation_id}/messages", response_model=ChatMessageListOut)
def list_messages(
    conversation_id: int,
    after_id: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    _get_conversation(db, user, conversation_id)
    stmt = select(ChatMessage).where(
        ChatMessage.conversation_id == conversation_id
    )
    if after_id:
        rows = db.scalars(
            stmt.where(ChatMessage.id > after_id).order_by(ChatMessage.id).limit(limit)
        ).all()
    else:
        rows = db.scalars(
            stmt.order_by(ChatMessage.id.desc()).limit(limit)
        ).all()
        rows.reverse()
    return ChatMessageListOut(items=[chat_message_out(row) for row in rows])


@router.post(
    "/chats/{conversation_id}/messages",
    response_model=ChatMessageOut,
    status_code=201,
)
def send_message(
    conversation_id: int,
    body: ChatMessageSendIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    conversation = _get_conversation(db, user, conversation_id)
    value = body.payload.strip()
    if body.type != "voice" and not value:
        raise DomainError("Message is empty", 400)
    if len(value) > 3_000_000:
        raise DomainError("Message is too large", 400)
    message = ChatMessage(
        conversation_id=conversation.id,
        sender_id=user.id,
        type=body.type,
        payload=value,
    )
    conversation.last_at = utcnow()
    db.add(message)
    db.commit()
    db.refresh(message)

    peer_id = (
        conversation.driver_id
        if conversation.passenger_id == user.id
        else conversation.passenger_id
    )
    payload = {
        "type": "chat:message",
        "data": chat_message_out(message).model_dump(mode="json"),
        "conversation_id": conversation.id,
    }
    if not manager.send_to_user_sync(peer_id, payload):
        peer = db.get(User, peer_id)
        if peer is not None:
            preview = value[:80] if body.type == "text" else None
            body_text = (
                preview
                if preview is not None
                else ("Rasm" if body.type == "image" else "Ovozli xabar")
            )
            notify_user(
                db,
                peer,
                user.full_name,
                body_text,
                f"/app/chat/{conversation.id}",
            )
    return chat_message_out(message)


@router.post("/chats/{conversation_id}/read", response_model=DetailOut)
def mark_read(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    conversation = _get_conversation(db, user, conversation_id)
    rows = db.scalars(
        select(ChatMessage).where(
            ChatMessage.conversation_id == conversation.id,
            ChatMessage.sender_id != user.id,
            ChatMessage.is_read.is_(False),
        )
    ).all()
    for row in rows:
        row.is_read = True
    db.commit()
    return DetailOut(detail="Marked as read")