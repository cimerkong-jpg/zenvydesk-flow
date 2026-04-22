from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductResponse

router = APIRouter()


@router.post("/", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product"""
    db_product = Product(
        user_id=1,  # Hardcoded for now
        name=product.name,
        description=product.description,
        price=product.price,
        image_url=product.image_url
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.get("/", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db)):
    """Get all products"""
    products = db.query(Product).order_by(Product.created_at.desc(), Product.id.desc()).all()
    return products


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product: ProductCreate, db: Session = Depends(get_db)):
    """Update a product"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product not found")
    
    db_product.name = product.name
    db_product.description = product.description
    db_product.price = product.price
    db_product.image_url = product.image_url
    
    db.commit()
    db.refresh(db_product)
    return db_product


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted successfully"}
