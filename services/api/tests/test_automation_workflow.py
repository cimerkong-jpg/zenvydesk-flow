"""
Automated tests for ZenvyDesk AI Automation Workflow
Tests the actual workflow: AutomationRule -> AutomationRunner -> AI Generation -> Draft -> PostHistory
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.facebook_page import FacebookPage
from app.models.product import Product
from app.models.automation_rule import AutomationRule
from app.models.draft import Draft
from app.models.post_history import PostHistory
from app.core.config import settings


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="function")
def test_db():
    """Create test database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(test_db):
    """Create test user"""
    user = User(
        id=1,
        email="test@example.com",
        name="Test User"
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_page(test_db, test_user):
    """Create test Facebook page"""
    page = FacebookPage(
        id=1,
        user_id=test_user.id,
        page_id="987654321",
        page_name="Test Page",
        access_token="test_token"
    )
    test_db.add(page)
    test_db.commit()
    test_db.refresh(page)
    return page


@pytest.fixture
def test_product(test_db, test_user):
    """Create test product"""
    product = Product(
        id=1,
        user_id=test_user.id,
        name="Test Product",
        description="A test product for automation",
        price=99.99,
        image_url="https://example.com/image.jpg"
    )
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)
    return product


@pytest.fixture
def test_automation_rule(test_db, test_user, test_page):
    """Create test automation rule"""
    rule = AutomationRule(
        id=1,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Test Automation Rule",
        content_type="promotion",
        auto_post=False,
        scheduled_time="daily",
        is_active=True
    )
    test_db.add(rule)
    test_db.commit()
    test_db.refresh(rule)
    return rule


# TEST 1: Mock Provider Success
def test_automation_mock_provider_success(test_db, test_automation_rule, test_product):
    """
    TEST 1: Mock provider success path
    - Automation run succeeds
    - Draft is created
    - Generated content comes from mock provider
    """
    # Override config to use mock provider
    original_provider = settings.ai_provider
    settings.ai_provider = "mock"
    
    try:
        # Count drafts before
        drafts_before = test_db.query(Draft).count()
        
        # Run automation
        response = client.post(f"/automation/run/{test_automation_rule.id}")
        
        # Assert response
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "draft_created"
        assert data["draft_id"] is not None
        assert data["provider"] == "mock"
        assert data["post_history_id"] is None  # auto_post=False
        
        # Count drafts after
        drafts_after = test_db.query(Draft).count()
        assert drafts_after == drafts_before + 1
        
        # Verify draft content
        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert draft is not None
        assert "mock" in draft.content.lower()
        assert "promotion" in draft.content.lower()
        assert test_product.name in draft.content
        
        print(f"\n✓ TEST 1 PASS: Mock provider success")
        print(f"  Draft ID: {draft.id}")
        print(f"  Content: {draft.content}")
        print(f"  Provider: {data['provider']}")
        
    finally:
        settings.ai_provider = original_provider


# TEST 2: OpenAI Missing Key Failure
def test_automation_openai_missing_key_failure(test_db, test_automation_rule, test_product):
    """
    TEST 2: OpenAI provider with missing API key
    - Returns structured failure
    - No draft created
    - No post_history created
    """
    # Override config to use openai without key
    original_provider = settings.ai_provider
    original_key = settings.ai_api_key
    settings.ai_provider = "openai"
    settings.ai_api_key = None
    
    try:
        # Count records before
        drafts_before = test_db.query(Draft).count()
        posts_before = test_db.query(PostHistory).count()
        
        # Run automation
        response = client.post(f"/automation/run/{test_automation_rule.id}")
        
        # Assert response
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "generation_failed"
        assert data["draft_id"] is None
        assert data["post_history_id"] is None
        assert data["error"] is not None
        assert "API_KEY" in data["error"] or "api_key" in data["error"].lower()
        
        # Verify no records created
        drafts_after = test_db.query(Draft).count()
        posts_after = test_db.query(PostHistory).count()
        
        assert drafts_after == drafts_before, "No draft should be created on failure"
        assert posts_after == posts_before, "No post_history should be created on failure"
        
        print(f"\n✓ TEST 2 PASS: OpenAI missing key failure handled safely")
        print(f"  Status: {data['status']}")
        print(f"  Error: {data['error']}")
        print(f"  Drafts before: {drafts_before}, after: {drafts_after}")
        print(f"  Posts before: {posts_before}, after: {posts_after}")
        
    finally:
        settings.ai_provider = original_provider
        settings.ai_api_key = original_key


# TEST 3: Unknown Content Type Fallback
def test_automation_unknown_content_type_fallback(test_db, test_user, test_page, test_product):
    """
    TEST 3: Unknown content_type falls back to general_post
    - Prompt system uses fallback template
    - Generation still succeeds with mock
    """
    # Create rule with unknown content_type
    rule = AutomationRule(
        id=999,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Unknown Type Test Rule",
        content_type="unknown_type_xyz",
        auto_post=False,
        scheduled_time="daily",
        is_active=True
    )
    test_db.add(rule)
    test_db.commit()
    
    original_provider = settings.ai_provider
    settings.ai_provider = "mock"
    
    try:
        # Run automation
        response = client.post(f"/automation/run/{rule.id}")
        
        # Assert response
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "draft_created"
        assert data["draft_id"] is not None
        
        # Verify draft was created (fallback worked)
        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert draft is not None
        assert draft.content is not None
        
        print(f"\n✓ TEST 3 PASS: Unknown content_type fallback worked")
        print(f"  Requested type: unknown_type_xyz")
        print(f"  Draft created: {draft.id}")
        print(f"  Content: {draft.content}")
        
    finally:
        settings.ai_provider = original_provider


# TEST 4: Auto-Post Enabled
def test_automation_auto_post_enabled(test_db, test_user, test_page, test_product):
    """
    TEST 4: Auto-post enabled creates post_history
    - Draft created
    - PostHistory created
    - Draft status updated to 'posted'
    """
    # Create rule with auto_post=True
    rule = AutomationRule(
        id=998,
        user_id=test_user.id,
        page_id=test_page.id,
        name="Auto Post Test Rule",
        content_type="engagement",
        auto_post=True,
        scheduled_time="daily",
        is_active=True
    )
    test_db.add(rule)
    test_db.commit()
    
    original_provider = settings.ai_provider
    settings.ai_provider = "mock"
    
    try:
        # Count records before
        drafts_before = test_db.query(Draft).count()
        posts_before = test_db.query(PostHistory).count()
        
        # Run automation
        response = client.post(f"/automation/run/{rule.id}")
        
        # Assert response
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "posted"
        assert data["draft_id"] is not None
        assert data["post_history_id"] is not None
        
        # Verify records created
        drafts_after = test_db.query(Draft).count()
        posts_after = test_db.query(PostHistory).count()
        
        assert drafts_after == drafts_before + 1
        assert posts_after == posts_before + 1
        
        # Verify draft status
        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert draft.status == "posted"
        
        # Verify post_history
        post = test_db.query(PostHistory).filter(PostHistory.id == data["post_history_id"]).first()
        assert post is not None
        assert post.draft_id == draft.id
        assert post.content == draft.content
        
        print(f"\n✓ TEST 4 PASS: Auto-post creates post_history")
        print(f"  Draft ID: {draft.id}, Status: {draft.status}")
        print(f"  PostHistory ID: {post.id}")
        
    finally:
        settings.ai_provider = original_provider


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
