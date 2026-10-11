from pydantic import BaseModel, Field


class PushKeysIn(BaseModel):
    p256dh: str
    auth: str


class PushSubscribeIn(BaseModel):
    endpoint: str
    keys: PushKeysIn


class PushSubscriptionIn(BaseModel):
    endpoint: str


class PushPublicKeyOut(BaseModel):
    public_key: str
    enabled: bool = Field(default=True)
