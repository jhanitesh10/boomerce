import os
import uuid
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import datetime
from typing import List
import re

import models
import schemas
from database import engine, get_db, SessionLocal

models.Base.metadata.create_all(bind=engine)

def seed_mock_data():
    db = SessionLocal()
    if db.query(models.ReferenceData).first():
        db.close()
        return

    # ── BRANDS ────────────────────────────────────────────────────────────────
    brands = [
        models.ReferenceData(reference_data_type="BRAND", label="Bloomerce", key="brand_bloomerce", display_order=1),
        models.ReferenceData(reference_data_type="BRAND", label="Glow Republic", key="brand_glow_republic", display_order=2),
        models.ReferenceData(reference_data_type="BRAND", label="PureNatura", key="brand_purenatura", display_order=3),
    ]
    db.add_all(brands)
    db.flush()

    # ── CATEGORIES ────────────────────────────────────────────────────────────
    categories = [
        models.ReferenceData(reference_data_type="CATEGORY", label="Skin Care", key="cat_skin_care", display_order=1),
        models.ReferenceData(reference_data_type="CATEGORY", label="Hair Care", key="cat_hair_care", display_order=2),
        models.ReferenceData(reference_data_type="CATEGORY", label="Body Care", key="cat_body_care", display_order=3),
        models.ReferenceData(reference_data_type="CATEGORY", label="Lip Care", key="cat_lip_care", display_order=4),
    ]
    db.add_all(categories)
    db.flush()

    # ── SUB-CATEGORIES ────────────────────────────────────────────────────────
    sub_cats = [
        models.ReferenceData(reference_data_type="SUB_CATEGORY", label="Face Wash", key="sc_face_wash", parent_reference_id=categories[0].id),
        models.ReferenceData(reference_data_type="SUB_CATEGORY", label="Moisturiser", key="sc_moisturiser", parent_reference_id=categories[0].id),
        models.ReferenceData(reference_data_type="SUB_CATEGORY", label="Serum", key="sc_serum", parent_reference_id=categories[0].id),
        models.ReferenceData(reference_data_type="SUB_CATEGORY", label="Mask & Scrub", key="sc_mask_scrub", parent_reference_id=categories[0].id),
        models.ReferenceData(reference_data_type="SUB_CATEGORY", label="Shampoo", key="sc_shampoo", parent_reference_id=categories[1].id),
        models.ReferenceData(reference_data_type="SUB_CATEGORY", label="Conditioner", key="sc_conditioner", parent_reference_id=categories[1].id),
        models.ReferenceData(reference_data_type="SUB_CATEGORY", label="Body Lotion", key="sc_body_lotion", parent_reference_id=categories[2].id),
        models.ReferenceData(reference_data_type="SUB_CATEGORY", label="Lip Balm", key="sc_lip_balm", parent_reference_id=categories[3].id),
    ]
    db.add_all(sub_cats)
    db.flush()

    # ── STATUSES ──────────────────────────────────────────────────────────────
    statuses = [
        models.ReferenceData(reference_data_type="STATUS", label="Active", key="status_active", display_order=1),
        models.ReferenceData(reference_data_type="STATUS", label="Inactive", key="status_inactive", display_order=2),
        models.ReferenceData(reference_data_type="STATUS", label="Draft", key="status_draft", display_order=3),
    ]
    db.add_all(statuses)
    db.flush()

    # ── PLATFORMS ──────────────────────────────────────────────────────────────
    platforms = [
        models.ReferenceData(reference_data_type="PLATFORM", label="Amazon", key="plat_amz", display_order=1),
        models.ReferenceData(reference_data_type="PLATFORM", label="Myntra", key="plat_myn", display_order=2),
        models.ReferenceData(reference_data_type="PLATFORM", label="Nykaa", key="plat_nykaa", display_order=3),
        models.ReferenceData(reference_data_type="PLATFORM", label="Flipkart", key="plat_fk", display_order=4),
        models.ReferenceData(reference_data_type="PLATFORM", label="AJIO", key="plat_ajio", display_order=5),
    ]
    db.add_all(platforms)
    db.commit()

    B = brands; C = categories; SC = sub_cats; S = statuses; P = platforms

    # ── 15 REALISTIC SKUs ─────────────────────────────────────────────────────
    products = [
        models.SkuMaster(
            product_name="Bloomerce Rose Petal Face Wash", sku_code="BL-RFW-001", barcode="8901234567001",
            brand_reference_id=B[0].id, category_reference_id=C[0].id, sub_category_reference_id=SC[0].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[1].id, P[2].id],
            mrp=499.00, purchase_cost=148.00, color="Rose Pink",
            raw_product_size="15x5x5 cm", package_weight=25.0, net_content_value=100.0, net_content_unit="ml",
            description="A gentle sulphate-free face wash with rose extract for a radiant glow.",
            key_ingredients="Rose Water, Aloe Vera, Vitamin E",
            how_to_use="Apply on wet face, massage gently, rinse.",
            seo_keywords="rose face wash, gentle cleanser", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Bloomerce Aloe Vera Soothing Gel", sku_code="BL-ALG-002", barcode="8901234567002",
            brand_reference_id=B[0].id, category_reference_id=C[0].id, sub_category_reference_id=SC[1].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[2].id],
            mrp=299.00, purchase_cost=80.00, net_content_value=150.0, net_content_unit="ml",
            description="Pure aloe vera gel for deep hydration and skin soothing.",
            key_ingredients="Aloe Vera, Cucumber Extract, Hyaluronic Acid", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Bloomerce Charcoal Deep Cleanse Mask", sku_code="BL-CHM-003", barcode="8901234567003",
            brand_reference_id=B[0].id, category_reference_id=C[0].id, sub_category_reference_id=SC[3].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[1].id],
            mrp=599.00, purchase_cost=195.00, net_content_value=100.0, net_content_unit="g",
            description="Activated charcoal mask for deep pore cleansing and blackhead removal.",
            key_ingredients="Activated Charcoal, Kaolin Clay, Tea Tree Oil", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Bloomerce Vitamin C Night Serum", sku_code="BL-NSR-004", barcode="8901234567004",
            brand_reference_id=B[0].id, category_reference_id=C[0].id, sub_category_reference_id=SC[2].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[2].id, P[3].id],
            mrp=899.00, purchase_cost=260.00, net_content_value=30.0, net_content_unit="ml",
            description="High potency Vitamin C serum for overnight brightening and anti-ageing.",
            key_ingredients="15% Vitamin C, Niacinamide, Hyaluronic Acid", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Bloomerce SPF 50 Lip Balm", sku_code="BL-LBS-005", barcode="8901234567005",
            brand_reference_id=B[0].id, category_reference_id=C[3].id, sub_category_reference_id=SC[7].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[1].id, P[2].id, P[3].id],
            mrp=199.00, purchase_cost=42.00, color="Clear",
            net_content_value=4.0, net_content_unit="g",
            description="SPF 50 lip balm with shea butter for long-lasting sun protection.",
            key_ingredients="Shea Butter, SPF 50, Vitamin E", tax_percent=12.0,
            primary_image_url="https://images.unsplash.com/photo-1586495777744-4e6232bf2b33?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Glow Republic Hyaluronic Acid Toner", sku_code="GR-HAT-006", barcode="8901234567006",
            brand_reference_id=B[1].id, category_reference_id=C[0].id, sub_category_reference_id=SC[1].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[2].id, P[3].id],
            mrp=650.00, purchase_cost=180.00, net_content_value=200.0, net_content_unit="ml",
            description="Alcohol-free toner with hyaluronic acid for intense hydration.",
            key_ingredients="Hyaluronic Acid, Niacinamide, Rose Hip", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Glow Republic Retinol Anti-Ageing Serum", sku_code="GR-RAS-007", barcode="8901234567007",
            brand_reference_id=B[1].id, category_reference_id=C[0].id, sub_category_reference_id=SC[2].id,
            status_reference_id=S[1].id, live_platform_reference_id=[P[0].id],
            mrp=1299.00, purchase_cost=380.00, net_content_value=30.0, net_content_unit="ml",
            description="Encapsulated retinol serum for wrinkle reduction and cell renewal.",
            key_ingredients="0.5% Retinol, Ceramides, Peptides", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Glow Republic Brightening Papaya Scrub", sku_code="GR-BPS-008", barcode="8901234567008",
            brand_reference_id=B[1].id, category_reference_id=C[0].id, sub_category_reference_id=SC[3].id,
            status_reference_id=S[2].id, live_platform_reference_id=[],
            mrp=349.00, purchase_cost=90.00, net_content_value=100.0, net_content_unit="g",
            description="Papaya enzyme scrub for gentle exfoliation and even skin tone.",
            key_ingredients="Papaya Extract, Walnut Shell Powder, Lactic Acid", tax_percent=18.0,
        ),
        models.SkuMaster(
            product_name="PureNatura Argan Oil Shampoo", sku_code="PN-AOS-009", barcode="8901234567009",
            brand_reference_id=B[2].id, category_reference_id=C[1].id, sub_category_reference_id=SC[4].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[1].id, P[2].id, P[3].id, P[4].id],
            mrp=449.00, purchase_cost=130.00, color="Amber",
            net_content_value=250.0, net_content_unit="ml",
            description="Sulphate-free shampoo with Moroccan argan oil for frizz-free shiny hair.",
            key_ingredients="Argan Oil, Keratin, Biotin", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="PureNatura Deep Repair Conditioner", sku_code="PN-DRC-010", barcode="8901234567010",
            brand_reference_id=B[2].id, category_reference_id=C[1].id, sub_category_reference_id=SC[5].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[2].id],
            mrp=399.00, purchase_cost=110.00, net_content_value=250.0, net_content_unit="ml",
            description="Intensive repair conditioner for dry, damaged, and colour-treated hair.",
            key_ingredients="Keratin Protein, Coconut Milk, Shea Butter", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="PureNatura Lavender Body Lotion", sku_code="PN-LBL-011", barcode="8901234567011",
            brand_reference_id=B[2].id, category_reference_id=C[2].id, sub_category_reference_id=SC[6].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[1].id, P[3].id],
            mrp=349.00, purchase_cost=95.00, color="Lavender",
            net_content_value=400.0, net_content_unit="ml",
            description="Non-greasy moisturising body lotion with calming lavender oil.",
            key_ingredients="Lavender Oil, Shea Butter, Vitamin B5", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Bloomerce Niacinamide 10% Serum", sku_code="BL-NIA-012", barcode="8901234567012",
            brand_reference_id=B[0].id, category_reference_id=C[0].id, sub_category_reference_id=SC[2].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[2].id],
            mrp=599.00, purchase_cost=155.00, net_content_value=30.0, net_content_unit="ml",
            description="10% Niacinamide + 1% Zinc serum for pore minimising and oil control.",
            key_ingredients="10% Niacinamide, 1% Zinc PCA", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Glow Republic Sunscreen SPF 60 PA+++", sku_code="GR-SS6-013", barcode="8901234567013",
            brand_reference_id=B[1].id, category_reference_id=C[0].id, sub_category_reference_id=SC[1].id,
            status_reference_id=S[1].id, live_platform_reference_id=[P[0].id, P[2].id],
            mrp=499.00, purchase_cost=140.00, net_content_value=50.0, net_content_unit="ml",
            description="Lightweight, non-greasy sunscreen SPF 60 PA+++ broad spectrum protection.",
            key_ingredients="Zinc Oxide, Titanium Dioxide, Vitamin C", tax_percent=12.0,
        ),
        models.SkuMaster(
            product_name="PureNatura Onion Hair Oil", sku_code="PN-OHO-014", barcode="8901234567014",
            brand_reference_id=B[2].id, category_reference_id=C[1].id, sub_category_reference_id=SC[4].id,
            status_reference_id=S[2].id, live_platform_reference_id=[],
            mrp=299.00, purchase_cost=75.00, net_content_value=200.0, net_content_unit="ml",
            description="Cold-pressed onion seed oil for hair fall control and scalp nourishment.",
            key_ingredients="Onion Seed Oil, Castor Oil, Bhringraj",
            tax_percent=18.0, remark="Pending final label artwork approval",
        ),
        models.SkuMaster(
            product_name="Bloomerce 2-in-1 Lip & Cheek Tint", sku_code="BL-LCT-015", barcode="8901234567015",
            brand_reference_id=B[0].id, category_reference_id=C[3].id, sub_category_reference_id=SC[7].id,
            status_reference_id=S[2].id, live_platform_reference_id=[P[1].id, P[2].id],
            mrp=349.00, purchase_cost=88.00, color="Coral Red",
            net_content_value=8.0, net_content_unit="ml",
            description="Buildable, blendable tint for lips and cheeks with a dewy finish.",
            key_ingredients="Damask Rose Extract, Jojoba Oil, Vitamin E",
            tax_percent=12.0, remark="Launch batch — QC ongoing",
        ),
    ]

    db.add_all(products)
    db.commit()
    db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_mock_data()
    yield

app = FastAPI(title="Bloomerce Relational API", lifespan=lifespan)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join("uploads", filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    return {"url": f"http://localhost:8000/uploads/{filename}"}


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
    # 1. Normalize label and type
    label = data.label.strip() if data.label else ""
    ref_type = data.reference_data_type.strip().upper()
    
    # 2. Case-insensitive duplicate check
    from sqlalchemy import func
    existing = db.query(models.ReferenceData).filter(
        func.lower(models.ReferenceData.label) == label.lower(),
        models.ReferenceData.reference_data_type == ref_type,
        models.ReferenceData.deleted_at == None
    ).first()
    
    if existing:
        return existing
        
    # 3. Key Generation & Model Construction
    payload = data.model_dump()
    if not payload.get("key"):
        # Generate a safe, unique key from the label
        slug = re.sub(r'[^a-z0-9]+', '_', label.lower()).strip('_')
        unique_suffix = uuid.uuid4().hex[:6]
        payload["key"] = f"{ref_type.lower()}_{slug}_{unique_suffix}"
    
    db_item = models.ReferenceData(**payload)
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
