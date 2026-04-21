"""
Tests for Claude Provider Integration
Verifies Claude provider works correctly and doesn't break existing providers
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
    user = User(id=1, email="test@example.com", name="Test User")
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_page(test_db, test_user):
    """Create test Facebook page"""
    page = FacebookPage(id=1, user_id=test_user.id, page_id="987654321", page_name="Test Page", access_token="test_token")
    test_db.add(page)
    test_db.commit()
    test_db.refresh(page)
    return page


@pytest.fixture
def test_product(test_db, test_user):
    """Create test product"""
    product = Product(id=1, user_id=test_user.id, name="Test Product", description="A test product", price=99.99)
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)
    return product


# TEST 1: Mock Provider Regression
def test_mock_provider_still_works(test_db, test_user, test_page, test_product):
    """
    TEST 1: Verify mock provider still works after adding Claude
    """
    rule = AutomationRule(id=1, user_id=test_user.id, page_id=test_page.id, name="Mock Test Rule", content_type="promotion", auto_post=False, scheduled_time="daily", is_active=True)
    test_db.add(rule)
    test_db.commit()
    
    original_provider = settings.ai_provider
    settings.ai_provider = "mock"
    
    try:
        drafts_before = test_db.query(Draft).count()
        
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "draft_created"
        assert data["provider"] == "mock"
        assert data["draft_id"] is not None
        
        drafts_after = test_db.query(Draft).count()
        assert drafts_after == drafts_before + 1
        
        draft = test_db.query(Draft).filter(Draft.id == data["draft_id"]).first()
        assert "mock" in draft.content.lower()
        
        print(f"\n✓ TEST 1 PASS: Mock provider regression test")
        print(f"  Provider: {data['provider']}")
        print(f"  Draft ID: {draft.id}")
        print(f"  Content: {draft.content}")
        
    finally:
        settings.ai_provider = original_provider


# TEST 2: Claude Missing Key Failure
def test_claude_missing_key_safe_failure(test_db, test_user, test_page, test_product):
    """
    TEST 2: Claude with missing API key fails safely
    """
    rule = AutomationRule(id=2, user_id=test_user.id, page_id=test_page.id, name="Claude Missing Key Test", content_type="engagement", auto_post=False, scheduled_time="daily", is_active=True)
    test_db.add(rule)
    test_db.commit()
    
    original_provider = settings.ai_provider
    original_key = settings.ai_api_key
    settings.ai_provider = "claude"
    settings.ai_api_key = None
    
    try:
        drafts_before = test_db.query(Draft).count()
        posts_before = test_db.query(PostHistory).count()
        
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "generation_failed"
        assert data["draft_id"] is None
        assert data["post_history_id"] is None
        assert data["error"] is not None
        assert "API_KEY" in data["error"] or "api_key" in data["error"].lower()
        
        drafts_after = test_db.query(Draft).count()
        posts_after = test_db.query(PostHistory).count()
        
        assert drafts_after == drafts_before, "No draft should be created"
        assert posts_after == posts_before, "No post_history should be created"
        
        print(f"\n✓ TEST 2 PASS: Claude missing key safe failure")
        print(f"  Status: {data['status']}")
        print(f"  Error: {data['error']}")
        print(f"  Drafts before: {drafts_before}, after: {drafts_after}")
        print(f"  Posts before: {posts_before}, after: {posts_after}")
        
    finally:
        settings.ai_provider = original_provider
        settings.ai_api_key = original_key


# TEST 3: Claude Provider Wiring
def test_claude_provider_wiring(test_db, test_user, test_page, test_product):
    """
    TEST 3: Claude provider selection and wiring
    """
    rule = AutomationRule(id=3, user_id=test_user.id, page_id=test_page.id, name="Claude Wiring Test", content_type="product_intro", auto_post=False, scheduled_time="daily", is_active=True)
    test_db.add(rule)
    test_db.commit()
    
    original_provider = settings.ai_provider
    original_key = settings.ai_api_key
    settings.ai_provider = "claude"
    settings.ai_api_key = "test_fake_key_for_wiring_test"
    
    try:
        response = client.post(f"/api/v1/automation-runner/run/{rule.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # With fake key, should fail at API call but provider should be selected
        assert data["provider"] == "claude"
        assert data["status"] == "generation_failed"
        assert "Claude" in data["error"] or "claude" in data["error"].lower()
        
        print(f"\n✓ TEST 3 PASS: Claude provider wiring verified")
        print(f"  Provider selected: {data['provider']}")
        print(f"  Status: {data['status']}")
        print(f"  Error (expected API failure): {data['error']}")
        
    finally:
        settings.ai_provider = original_provider
        settings.ai_api_key = original_key


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
