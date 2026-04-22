"""Shared test configuration and fixtures for backend test files."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.content_library import ContentLibrary
from app.models.facebook_page import FacebookPage
from app.models.product import Product
from app.models.user import User


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for tests."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def test_db():
    """Create a fresh in-memory database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """Provide a FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def test_user(test_db):
    user = User(id=1, email="test@example.com", name="Test User")
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_page(test_db, test_user):
    page = FacebookPage(
        id=1,
        user_id=test_user.id,
        page_id="987654321",
        page_name="Test Page",
        access_token="test_token",
    )
    test_db.add(page)
    test_db.commit()
    test_db.refresh(page)
    return page


@pytest.fixture
def test_product(test_db, test_user):
    product = Product(
        id=1,
        user_id=test_user.id,
        name="Test Product",
        description="A test product",
        price=99.99,
        image_url="https://example.com/image.jpg",
    )
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)
    return product


@pytest.fixture
def test_content_library(test_db, test_user):
    item = ContentLibrary(
        id=1,
        user_id=test_user.id,
        title="Launch Angle",
        content="Highlight the fastest onboarding path and strong CTA.",
        content_type="promotion",
    )
    test_db.add(item)
    test_db.commit()
    test_db.refresh(item)
    return item
