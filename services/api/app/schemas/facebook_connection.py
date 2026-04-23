from pydantic import BaseModel


class FacebookConnectionStartResponse(BaseModel):
    authorization_url: str
    state: str


class FacebookPageResponse(BaseModel):
    id: int
    facebook_page_id: str
    page_name: str
    category: str | None = None
    tasks: str | None = None
    is_active: bool
    is_selected: bool
    has_access_token: bool
    connection_status: str

    class Config:
        from_attributes = True


class FacebookPagesResponse(BaseModel):
    connected: bool
    provider_user_id: str | None = None
    pages: list[FacebookPageResponse]


class SelectFacebookPageRequest(BaseModel):
    facebook_page_id: str


class DisconnectFacebookResponse(BaseModel):
    message: str
