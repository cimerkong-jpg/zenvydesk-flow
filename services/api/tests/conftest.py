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
from app.services.auth_service import AuthService, hash_password


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def test_db():
    AuthService._login_attempts = {}
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    return TestClient(app)


@pytest.fixture
def test_user(test_db):
    user = User(
        id=1,
        email="member@example.com",
        username="member@example.com",
        name="Member User",
        full_name="Member User",
        password_hash=hash_password("Member123!"),
        role="member",
        status="active",
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def admin_user(test_db):
    user = User(
        id=2,
        email="admin@example.com",
        username="admin@example.com",
        name="Admin User",
        full_name="Admin User",
        password_hash=hash_password("Admin123!"),
        role="admin",
        status="active",
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def super_admin_user(test_db):
    user = User(
        id=3,
        email="super@example.com",
        username="super@example.com",
        name="Super Admin",
        full_name="Super Admin",
        password_hash=hash_password("Super123!"),
        role="super_admin",
        status="active",
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_db):
    def _build(user: User):
        access_token = AuthService(test_db).login(user.email, {
            "member@example.com": "Member123!",
            "admin@example.com": "Admin123!",
            "super@example.com": "Super123!",
        }[user.email])["access_token"]
        return {"Authorization": f"Bearer {access_token}"}

    return _build


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
        price="99.99",
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
