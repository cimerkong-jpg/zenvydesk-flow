from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.draft import Draft
from app.models.facebook_page import FacebookPage
from app.schemas.post_history import PostHistoryResponse
from app.services.posting_service import PostingService

router = APIRouter()


@router.post("/from-draft/{draft_id}", response_model=PostHistoryResponse)
def post_from_draft(
    draft_id: int,
    mock_mode: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Post a draft using the selected Facebook page when available."""
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    selected_page = (
        db.query(FacebookPage)
        .filter(
            FacebookPage.user_id == draft.user_id,
            FacebookPage.is_selected.is_(True),
            FacebookPage.is_active.is_(True),
        )
        .first()
    )
    if selected_page:
        draft.page_id = selected_page.id
        db.commit()
        db.refresh(draft)

    if draft.page_id is None:
        raise HTTPException(status_code=400, detail="Select a Facebook page before posting this draft")

    posting_service = PostingService(db, mock_mode=mock_mode)
    success, post_history, error = posting_service.post_draft_to_facebook(
        draft_id=draft.id,
        user_id=draft.user_id,
    )
    if not success or not post_history:
        raise HTTPException(status_code=502, detail=error or "Facebook posting failed")

    return post_history
