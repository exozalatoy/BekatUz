from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models import ChatConversation, ChatMessage, User


class ChatPeerOut(BaseModel):
    id: int
    full_name: str
    avatar_url: str | None = None
    online: bool = False


class ChatMessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    type: Literal["text", "image", "voice"]
    payload: str
    created_at: datetime


class ChatMessageSendIn(BaseModel):
    type: Literal["text", "image", "voice"] = "text"
    payload: str


class ChatMessageListOut(BaseModel):
    items: list[ChatMessageOut]


class ChatConversationOut(BaseModel):
    id: int
    peer: ChatPeerOut
    trip_id: int | None = None
    last_message: ChatMessageOut | None = None
    unread: int = 0
    created_at: datetime


class ChatConversationListOut(BaseModel):
    items: list[ChatConversationOut]


def chat_message_out(message: ChatMessage) -> ChatMessageOut:
    return ChatMessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        type=message.type,  # type: ignore[arg-type]
        payload=message.payload,
        created_at=message.created_at,
    )


def chat_peer_out(user: User) -> ChatPeerOut:
    online = False
    if user.driver_profile is not None:
        online = user.driver_profile.online
    return ChatPeerOut(
        id=user.id,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        online=online,
    )


def conversation_out(
    db,
    conversation: ChatConversation,
    me: User,
    last_message: ChatMessage | None = None,
    unread: int = 0,
) -> ChatConversationOut:
    peer = (
        conversation.driver
        if conversation.passenger_id == me.id
        else conversation.passenger
    )
    return ChatConversationOut(
        id=conversation.id,
        peer=chat_peer_out(peer) if peer is not None else None,  # type: ignore[arg-type]
        trip_id=conversation.trip_id,
        last_message=chat_message_out(last_message) if last_message else None,
        unread=unread,
        created_at=conversation.created_at,
    )