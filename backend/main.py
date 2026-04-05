from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from contextlib import asynccontextmanager
import datetime
from typing import List

import models
import schemas
from database import engine, get_db, SessionLocal

models.Base.metadata.create_all(bind=engine)

def seed_mock_data():
    db = SessionLocal()
    # Execute only if database is completely blank
    if db.query(models.ReferenceData).first():
        db.close()
        return

    # 1. Init Config Dictionary 
    ref_brand = models.ReferenceData(reference_data_type="BRAND", label="Bloomerce", key="b_1")
    ref_cat = models.ReferenceData(reference_data_type="CATEGORY", label="Skin Care", key="c_1")
    ref_plat1 = models.ReferenceData(reference_data_type="PLATFORM", label="Amazon", key="p_amz")
    ref_plat2 = models.ReferenceData(reference_data_type="PLATFORM", label="Myntra", key="p_myn")
    ref_stat = models.ReferenceData(reference_data_type="STATUS", label="Active", key="s_act")
    
    db.add_all([ref_brand, ref_cat, ref_plat1, ref_plat2, ref_stat])
    db.commit()
    
    # 2. Add 5 Mock Products connecting to the IDs
    products = [
        models.SkuMaster(
            product_name="Bloomerce Rose Face Wash",
            sku_code="BL-RFW-001",
            barcode="8901234567891",
            brand_reference_id=ref_brand.id,
            category_reference_id=ref_cat.id,
            status_reference_id=ref_stat.id,
            live_platform_reference_id=[ref_plat1.id, ref_plat2.id],
            mrp=499.00, purchase_cost=150.00, color="Rose Pink",
            raw_product_size="15x5x5", package_weight=20.0,
            raw_product_weight=100.0, finished_product_weight=120.0,
            net_content_value=100.0, net_content_unit="ml"
        ),
        models.SkuMaster(
            product_name="Bloomerce Aloe Gel", sku_code="BL-ALG-002", barcode="8901234567892",
            brand_reference_id=ref_brand.id, category_reference_id=ref_cat.id, status_reference_id=ref_stat.id,
            live_platform_reference_id=[ref_plat1.id], mrp=299.00, purchase_cost=80.00
        ),
        models.SkuMaster(
            product_name="Bloomerce Charcoal Mask", sku_code="BL-CHM-003", barcode="8901234567893",
            brand_reference_id=ref_brand.id, category_reference_id=ref_cat.id, status_reference_id=ref_stat.id,
            live_platform_reference_id=[ref_plat2.id], mrp=599.00, purchase_cost=200.00
        ),
        models.SkuMaster(
            product_name="Bloomerce Night Serum", sku_code="BL-NSR-004", barcode="8901234567894",
            brand_reference_id=ref_brand.id, category_reference_id=ref_cat.id, status_reference_id=ref_stat.id,
            live_platform_reference_id=[], mrp=899.00, purchase_cost=250.00
        ),
        models.SkuMaster(
            product_name="Bloomerce Lip Balm SPF", sku_code="BL-LBS-005", barcode="8901234567895",
            brand_reference_id=ref_brand.id, category_reference_id=ref_cat.id, status_reference_id=ref_stat.id,
            live_platform_reference_id=[ref_plat1.id, ref_plat2.id], mrp=199.00, purchase_cost=40.00
        )
    ]
    
    db.add_all(products)
    db.commit()
    db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_mock_data()
    yield

app = FastAPI(title="Bloomerce Relational API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)


# ==========================================
# REFERENCE DATA CONTROLLERS
# ==========================================

@app.get("/api/references", response_model=List[schemas.ReferenceData])
def get_references(ref_type: str = None, db: Session = Depends(get_db)):
    query = db.query(models.ReferenceData).filter(models.ReferenceData.deleted_at == None)
    if ref_type:
        query = query.filter(models.ReferenceData.reference_data_type == ref_type)
    return query.all()

@app.post("/api/references", response_model=schemas.ReferenceData)
def create_reference(data: schemas.ReferenceDataCreate, db: Session = Depends(get_db)):
    db_item = models.ReferenceData(**data.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/references/{id}", response_model=schemas.ReferenceData)
def update_reference(id: int, data: schemas.ReferenceDataCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.ReferenceData).filter(models.ReferenceData.id == id, models.ReferenceData.deleted_at == None).first()
    if not db_item: raise HTTPException(404, "Not Found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/references/{id}")
def delete_reference(id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.ReferenceData).filter(models.ReferenceData.id == id).first()
    if not db_item: raise HTTPException(404, "Not Found")
    db_item.deleted_at = datetime.datetime.utcnow()
    db.commit()
    return {"message": "Deleted securely"}


# ==========================================
# SKU MASTER CONTROLLERS
# ==========================================

@app.get("/api/skus", response_model=List[schemas.SkuMaster])
def get_skus(db: Session = Depends(get_db)):
    return db.query(models.SkuMaster).filter(models.SkuMaster.deletedAt == None).all()

@app.get("/api/skus/{id}", response_model=schemas.SkuMaster)
def get_sku(id: int, db: Session = Depends(get_db)):
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id, models.SkuMaster.deletedAt == None).first()
    if not sku: raise HTTPException(404, "Not Found")
    return sku

@app.post("/api/skus", response_model=schemas.SkuMaster)
def create_sku(data: schemas.SkuMasterCreate, db: Session = Depends(get_db)):
    db_item = models.SkuMaster(**data.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/skus/{id}", response_model=schemas.SkuMaster)
def update_sku(id: int, data: schemas.SkuMasterCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.SkuMaster).filter(models.SkuMaster.id == id, models.SkuMaster.deletedAt == None).first()
    if not db_item: raise HTTPException(404, "Not Found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/skus/{id}")
def delete_sku(id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not db_item: raise HTTPException(404, "Not Found")
    db_item.deletedAt = datetime.datetime.utcnow()
    db.commit()
    return {"message": "Deleted securely"}


# ==========================================
# JSON ARRAY HANDLER (Dynamic Tagging)
# ==========================================

@app.patch("/api/skus/{id}/platforms", response_model=schemas.SkuMaster)
def patch_sku_platforms(id: int, patch_data: schemas.PlatformPatch, db: Session = Depends(get_db)):
    db_item = db.query(models.SkuMaster).filter(models.SkuMaster.id == id, models.SkuMaster.deletedAt == None).first()
    if not db_item: raise HTTPException(404, "Not Found")
        
    current_arr = db_item.live_platform_reference_id or []
    if type(current_arr) != list: current_arr = []
        
    if patch_data.action == "add":
        if patch_data.reference_id not in current_arr:
            current_arr.append(patch_data.reference_id)
    elif patch_data.action == "remove":
        if patch_data.reference_id in current_arr:
            current_arr.remove(patch_data.reference_id)
            
    db_item.live_platform_reference_id = current_arr
    flag_modified(db_item, "live_platform_reference_id")
    
    db.commit()
    db.refresh(db_item)
    return db_item
