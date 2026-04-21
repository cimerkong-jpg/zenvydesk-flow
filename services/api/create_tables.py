from app.core.database import Base, engine
from app.models import User, FacebookPage, Product, ContentLibrary, Draft, MediaLibrary, PostHistory

# Create all tables
Base.metadata.create_all(bind=engine)
print("All tables created successfully!")
