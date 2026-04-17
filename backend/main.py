import os
import uuid
import json
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func, String, cast
from sqlalchemy.orm import Session
import zipfile
import io
from sqlalchemy.orm.attributes import flag_modified
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import datetime
from typing import List, Optional
import re

import models
import schemas
from database import engine, get_db, SessionLocal
from drive_service import DriveService

from sqlalchemy.exc import IntegrityError
# Table creation is handled in the lifespan to avoid crashing on module load in serverless environments
# models.Base.metadata.create_all(bind=engine)

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
        models.ReferenceData(reference_data_type="STATUS", label="Archived", key="status_archived", display_order=3),
        models.ReferenceData(reference_data_type="STATUS", label="Upcoming Launches", key="status_upcoming", display_order=4),
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

    # ── BUNDLE TYPES ──────────────────────────────────────────────────────────
    bundle_types = [
        models.ReferenceData(reference_data_type="BUNDLE_TYPE", label="Single", key="bt_single", display_order=1),
        models.ReferenceData(reference_data_type="BUNDLE_TYPE", label="Combo", key="bt_combo", display_order=2),
        models.ReferenceData(reference_data_type="BUNDLE_TYPE", label="Pack of 2", key="bt_pack2", display_order=3),
        models.ReferenceData(reference_data_type="BUNDLE_TYPE", label="Pack of 3", key="bt_pack3", display_order=4),
    ]
    db.add_all(bundle_types)

    # ── PACK TYPES ────────────────────────────────────────────────────────────
    pack_types = [
        models.ReferenceData(reference_data_type="PACK_TYPE", label="Mono Carton", key="pt_mono_carton", display_order=1),
        models.ReferenceData(reference_data_type="PACK_TYPE", label="Glass Bottle", key="pt_glass_bottle", display_order=2),
        models.ReferenceData(reference_data_type="PACK_TYPE", label="Plastic Jar", key="pt_plastic_jar", display_order=3),
        models.ReferenceData(reference_data_type="PACK_TYPE", label="Tube", key="pt_tube", display_order=4),
        models.ReferenceData(reference_data_type="PACK_TYPE", label="Box", key="pt_box", display_order=5),
    ]
    db.add_all(pack_types)
    db.flush()

    B = brands; C = categories; SC = sub_cats; S = statuses; P = platforms; BT = bundle_types; PT = pack_types

    # ── 15 REALISTIC SKUs ─────────────────────────────────────────────────────
    products = [
        models.SkuMaster(
            product_name="Bloomerce Rose Petal Face Wash", sku_code="BL-RFW-001", barcode="8901234567001",
            brand_reference_id=B[0].id, category_reference_id=C[0].id, sub_category_reference_id=SC[0].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[1].id, P[2].id],
            mrp=499.00, purchase_cost=148.00, color="Rose Pink",
            raw_product_size="15x5x5 cm", package_weight=25.0, net_quantity=100.0,
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
            mrp=299.00, purchase_cost=80.00, net_quantity=150.0,
            description="Pure aloe vera gel for deep hydration and skin soothing.",
            key_ingredients="Aloe Vera, Cucumber Extract, Hyaluronic Acid", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Bloomerce Charcoal Deep Cleanse Mask", sku_code="BL-CHM-003", barcode="8901234567003",
            brand_reference_id=B[0].id, category_reference_id=C[0].id, sub_category_reference_id=SC[3].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[1].id],
            mrp=599.00, purchase_cost=195.00, net_quantity=100.0,
            description="Activated charcoal mask for deep pore cleansing and blackhead removal.",
            key_ingredients="Activated Charcoal, Kaolin Clay, Tea Tree Oil", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Bloomerce Vitamin C Night Serum", sku_code="BL-NSR-004", barcode="8901234567004",
            brand_reference_id=B[0].id, category_reference_id=C[0].id, sub_category_reference_id=SC[2].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[2].id, P[3].id],
            mrp=899.00, purchase_cost=260.00, net_quantity=30.0,
            description="High potency Vitamin C serum for overnight brightening and anti-ageing.",
            key_ingredients="15% Vitamin C, Niacinamide, Hyaluronic Acid", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Bloomerce SPF 50 Lip Balm", sku_code="BL-LBS-005", barcode="8901234567005",
            brand_reference_id=B[0].id, category_reference_id=C[3].id, sub_category_reference_id=SC[7].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[1].id, P[2].id, P[3].id],
            mrp=199.00, purchase_cost=42.00, color="Clear",
            net_quantity=4.0,
            description="SPF 50 lip balm with shea butter for long-lasting sun protection.",
            key_ingredients="Shea Butter, SPF 50, Vitamin E", tax_percent=12.0,
            primary_image_url="https://images.unsplash.com/photo-1586495777744-4e6232bf2b33?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Glow Republic Hyaluronic Acid Toner", sku_code="GR-HAT-006", barcode="8901234567006",
            brand_reference_id=B[1].id, category_reference_id=C[0].id, sub_category_reference_id=SC[1].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[2].id, P[3].id],
            mrp=650.00, purchase_cost=180.00, net_quantity=200.0,
            description="Alcohol-free toner with hyaluronic acid for intense hydration.",
            key_ingredients="Hyaluronic Acid, Niacinamide, Rose Hip", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Glow Republic Retinol Anti-Ageing Serum", sku_code="GR-RAS-007", barcode="8901234567007",
            brand_reference_id=B[1].id, category_reference_id=C[0].id, sub_category_reference_id=SC[2].id,
            status_reference_id=S[1].id, live_platform_reference_id=[P[0].id],
            mrp=1299.00, purchase_cost=380.00, net_quantity=30.0,
            description="Encapsulated retinol serum for wrinkle reduction and cell renewal.",
            key_ingredients="0.5% Retinol, Ceramides, Peptides", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Glow Republic Brightening Papaya Scrub", sku_code="GR-BPS-008", barcode="8901234567008",
            brand_reference_id=B[1].id, category_reference_id=C[0].id, sub_category_reference_id=SC[3].id,
            status_reference_id=S[2].id, live_platform_reference_id=[],
            mrp=349.00, purchase_cost=90.00, net_quantity=100.0,
            description="Papaya enzyme scrub for gentle exfoliation and even skin tone.",
            key_ingredients="Papaya Extract, Walnut Shell Powder, Lactic Acid", tax_percent=18.0,
        ),
        models.SkuMaster(
            product_name="PureNatura Argan Oil Shampoo", sku_code="PN-AOS-009", barcode="8901234567009",
            brand_reference_id=B[2].id, category_reference_id=C[1].id, sub_category_reference_id=SC[4].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[1].id, P[2].id, P[3].id, P[4].id],
            mrp=449.00, purchase_cost=130.00, color="Amber",
            net_quantity=250.0,
            description="Sulphate-free shampoo with Moroccan argan oil for frizz-free shiny hair.",
            key_ingredients="Argan Oil, Keratin, Biotin", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="PureNatura Deep Repair Conditioner", sku_code="PN-DRC-010", barcode="8901234567010",
            brand_reference_id=B[2].id, category_reference_id=C[1].id, sub_category_reference_id=SC[5].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[2].id],
            mrp=399.00, purchase_cost=110.00, net_quantity=250.0,
            description="Intensive repair conditioner for dry, damaged, and colour-treated hair.",
            key_ingredients="Keratin Protein, Coconut Milk, Shea Butter", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="PureNatura Lavender Body Lotion", sku_code="PN-LBL-011", barcode="8901234567011",
            brand_reference_id=B[2].id, category_reference_id=C[2].id, sub_category_reference_id=SC[6].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[1].id, P[3].id],
            mrp=349.00, purchase_cost=95.00, color="Lavender",
            net_quantity=400.0,
            description="Non-greasy moisturising body lotion with calming lavender oil.",
            key_ingredients="Lavender Oil, Shea Butter, Vitamin B5", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Bloomerce Niacinamide 10% Serum", sku_code="BL-NIA-012", barcode="8901234567012",
            brand_reference_id=B[0].id, category_reference_id=C[0].id, sub_category_reference_id=SC[2].id,
            status_reference_id=S[0].id, live_platform_reference_id=[P[0].id, P[2].id],
            mrp=599.00, purchase_cost=155.00, net_quantity=30.0,
            description="10% Niacinamide + 1% Zinc serum for pore minimising and oil control.",
            key_ingredients="10% Niacinamide, 1% Zinc PCA", tax_percent=18.0,
            primary_image_url="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=300&q=80",
        ),
        models.SkuMaster(
            product_name="Glow Republic Sunscreen SPF 60 PA+++", sku_code="GR-SS6-013", barcode="8901234567013",
            brand_reference_id=B[1].id, category_reference_id=C[0].id, sub_category_reference_id=SC[1].id,
            status_reference_id=S[1].id, live_platform_reference_id=[P[0].id, P[2].id],
            mrp=499.00, purchase_cost=140.00, net_quantity=50.0,
            description="Lightweight, non-greasy sunscreen SPF 60 PA+++ broad spectrum protection.",
            key_ingredients="Zinc Oxide, Titanium Dioxide, Vitamin C", tax_percent=12.0,
        ),
        models.SkuMaster(
            product_name="PureNatura Onion Hair Oil", sku_code="PN-OHO-014", barcode="8901234567014",
            brand_reference_id=B[2].id, category_reference_id=C[1].id, sub_category_reference_id=SC[4].id,
            status_reference_id=S[2].id, live_platform_reference_id=[],
            mrp=299.00, purchase_cost=75.00, net_quantity=200.0,
            description="Cold-pressed onion seed oil for hair fall control and scalp nourishment.",
            key_ingredients="Onion Seed Oil, Castor Oil, Bhringraj",
            tax_percent=18.0, remark="Pending final label artwork approval",
        ),
        models.SkuMaster(
            product_name="Bloomerce 2-in-1 Lip & Cheek Tint", sku_code="BL-LCT-015", barcode="8901234567015",
            brand_reference_id=B[0].id, category_reference_id=C[3].id, sub_category_reference_id=SC[7].id,
            status_reference_id=S[2].id, live_platform_reference_id=[P[1].id, P[2].id],
            mrp=349.00, purchase_cost=88.00, color="Coral Red",
            net_quantity=8.0,
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
    # Ensure tables are created on startup
    try:
        models.Base.metadata.create_all(bind=engine)
        # Only seed if the flag is explicitly set to true
        if os.getenv("SEED_MOCK_DATA", "false").lower() == "true":
            seed_mock_data()
    except Exception as e:
        print(f"Startup error: {e}")
    yield

app = FastAPI(title="Bloomerce Relational API", lifespan=lifespan)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is reached"}


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request, exc):
    from fastapi import JSONResponse
    return JSONResponse(status_code=400, content={"detail": f"Database Integrity Error: {str(exc.orig)}"})

# Handle uploads directory gracefully (Vercel has a read-only filesystem except for /tmp)
try:
    os.makedirs("uploads", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
except Exception as e:
    print(f"Skipping local storage setup: {e}")

# CORS Configuration
# We explicitly list the frontend origin to support allow_credentials=True,
# which is often required for secure browser contexts and cross-origin persistence.
env_origins = os.getenv("ALLOWED_ORIGINS", "")
origins = [o.strip() for o in env_origins.split(",") if o.strip()] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "https://bloomerce.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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

@app.get("/api/skus-search")
def search_skus(q: str = "", db: Session = Depends(get_db)):
    """Search for SKUs by code or name for linking purposes."""
    return db.query(models.SkuMaster).filter(
        (models.SkuMaster.sku_code.ilike(f"%{q}%")) |
        (models.SkuMaster.product_name.ilike(f"%{q}%"))
    ).filter(models.SkuMaster.deletedAt == None).limit(20).all()

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


def _get_ref_label(db: Session, ref_id: Optional[int]) -> str:
    if not ref_id: return "unknown"
    ref = db.query(models.ReferenceData).filter(models.ReferenceData.id == ref_id).first()
    if not ref: return "unknown"
    # Create a slug from the label
    return re.sub(r'[^a-zA-Z0-9]+', '_', ref.label.lower()).strip('_')

def parse_codes(c):
    """Normalizes both old (dict) and new (list) group code formats to a list of {type, id}."""
    if not c: return []
    if isinstance(c, list): return c
    if isinstance(c, dict):
        return [{"type": k, "id": v} for k, v in c.items() if v]
    if isinstance(c, str):
        # Check for JSON first
        try:
            parsed = json.loads(c)
            if isinstance(parsed, list): return parsed
            if isinstance(parsed, dict):
                return [{"type": k, "id": v} for k, v in parsed.items() if v]
        except:
            pass

        # Handle pipe-separated legacy format (e.g. ID_PKG|ID_RAW)
        if '|' in c:
            parts = c.split('|')
            results = []
            for p in parts:
                p = p.strip()
                t = 'unknown'
                p_up = p.upper()
                if '_RAW' in p_up: t = 'raw'
                elif '_PKG' in p_up: t = 'package'
                elif '_LBL' in p_up: t = 'label'
                elif '_STK' in p_up: t = 'sticker'
                elif '_MC' in p_up: t = 'monocarton'
                results.append({'type': t, 'id': p})
            return results
    return []

def get_code(codes, t):
    """Helper to find a specific component ID within the array structure."""
    for entry in codes:
        if entry.get("type") == t:
            return entry.get("id")
    return None

def set_code(codes, t, pool_id):
    """Adds or updates a component ID within the array structure."""
    new_codes = [c for c in codes if c.get("type") != t]
    new_codes.append({"type": t, "id": pool_id})
    return new_codes

def _perform_component_link(db: Session, source_sku: models.SkuMaster, target_sku: models.SkuMaster, component_type: str):
    """Internal helper to link a specific component type between two SKUs."""

    t_codes = parse_codes(target_sku.product_component_group_code)
    s_codes = parse_codes(source_sku.product_component_group_code)

    existing_code = get_code(t_codes, component_type) or get_code(s_codes, component_type)

    if not existing_code:
        u_id = uuid.uuid4().hex[:8]
        subcat = _get_ref_label(db, target_sku.sub_category_reference_id)
        size = _get_ref_label(db, target_sku.size_reference_id)
        color = re.sub(r'[^a-zA-Z0-9]+', '_', (target_sku.color or "none").lower()).strip('_')
        pkg_size = re.sub(r'[^a-zA-Z0-9]+', '_', (target_sku.package_size or "none").lower()).strip('_')

        if component_type == 'raw':
            existing_code = f"{u_id}_{color}_{subcat}_{size}_raw"
        elif component_type == 'package':
            existing_code = f"{u_id}_{pkg_size}_{subcat}_package"
        elif component_type == 'label':
            existing_code = f"{u_id}_{subcat}_label"
        elif component_type == 'sticker':
            existing_code = f"{u_id}_sticker"
        else: # monocarton or others
            existing_code = f"{u_id}_{subcat}_{component_type}"

    new_s_codes = set_code(s_codes, component_type, existing_code)
    new_t_codes = set_code(t_codes, component_type, existing_code)

    source_sku.product_component_group_code = new_s_codes
    target_sku.product_component_group_code = new_t_codes

    flag_modified(source_sku, "product_component_group_code")
    flag_modified(target_sku, "product_component_group_code")

    return existing_code

@app.post("/api/skus/{id}/link-component")
def link_component(id: int, component_type: str, target_sku_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Links this SKU to another SKU's component pool, or creates a new one."""
    source_sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not source_sku: raise HTTPException(404, "Source SKU not found")

    target_sku = source_sku
    if target_sku_id:
        target_sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == target_sku_id).first()
        if not target_sku: raise HTTPException(404, "Target SKU not found")

    code = _perform_component_link(db, source_sku, target_sku, component_type)
    db.commit()
    return {"status": "success", "code": code}


@app.get("/api/skus/{id}/pool-info")
def get_pool_info(id: int, db: Session = Depends(get_db)):
    """Returns a flat list of all SKUs sharing ANY component pool with this one."""
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not sku: raise HTTPException(404, "SKU not found")

    codes = parse_codes(sku.product_component_group_code)
    pool_ids = [entry.get("id") for entry in codes if entry.get("id")]

    if not pool_ids:
        return []

    # Build a combined query using OR for all pool IDs
    from sqlalchemy import or_
    filters = [cast(models.SkuMaster.product_component_group_code, String).like(f'%"{p_id}"%') for p_id in pool_ids]

    peers = db.query(
        models.SkuMaster.id,
        models.SkuMaster.product_name,
        models.SkuMaster.sku_code,
        models.SkuMaster.product_component_group_code,
        models.SkuMaster.catalog_url
    ).filter(
        models.SkuMaster.id != id,
        models.SkuMaster.deletedAt == None,
        or_(*filters)
    ).all()

    return [
        {
            "id": p.id,
            "product_name": p.product_name,
            "sku_code": p.sku_code,
            "product_component_group_code": parse_codes(p.product_component_group_code),
            "catalog_url": getattr(p, 'catalog_url', None)
        }
        for p in peers
    ]

@app.delete("/api/skus/{id}/link-component/{type}")
def unlink_component(id: int, type: str, db: Session = Depends(get_db)):
    """Removes a component from its pool, making it a unique asset again."""
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not sku: raise HTTPException(404, "SKU not found")

    codes = parse_codes(sku.product_component_group_code)
    new_codes = [c for c in codes if c.get("type") != type]

    sku.product_component_group_code = new_codes
    flag_modified(sku, "product_component_group_code")
    db.commit()
    return {"status": "success"}

@app.get("/api/skus/{id}/pool-discovery")
def get_pool_discovery(id: int, comp_type: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Automatically finds existing pools that match this SKU's attributes."""
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not sku: raise HTTPException(404, "SKU not found")


    current_codes = parse_codes(sku.product_component_group_code)

    discovery = {}
    scan_types = [comp_type] if comp_type else ['raw', 'package', 'label', 'monocarton', 'sticker']

    for t in scan_types:
        # Define match logic for each component
        config = {
            'raw': {'match': {'size_reference_id': sku.size_reference_id, 'color': sku.color, 'sub_category_reference_id': sku.sub_category_reference_id}},
            'package': {'match': {'package_size': sku.package_size, 'sub_category_reference_id': sku.sub_category_reference_id}},
            'label': {'match': {'sub_category_reference_id': sku.sub_category_reference_id, 'brand_reference_id': sku.brand_reference_id}},
            'monocarton': {'match': {'sub_category_reference_id': sku.sub_category_reference_id}},
            'sticker': {'match': {'sub_category_reference_id': sku.sub_category_reference_id}}
        }.get(t)

        if not config: continue

        query = db.query(models.SkuMaster).filter(models.SkuMaster.id != id, models.SkuMaster.deletedAt == None)
        # Apply attribute matching filters
        for attr, val in config['match'].items():
            if val is not None and val != "":
                query = query.filter(getattr(models.SkuMaster, attr) == val)

        matches = query.limit(20).all()

        results = []
        seen_pools = set()

        current_pool_id = get_code(current_codes, t)

        # Priority 1: Find existing pools
        for m in matches:
            m_codes = parse_codes(m.product_component_group_code)
            p_id = get_code(m_codes, t)

            if p_id and p_id not in seen_pools:
                is_connected = (p_id == current_pool_id) if current_pool_id else False

                # Find other products that share this EXACT pool_id for this EXACT type
                pool_members = []
                sibling_candidates = db.query(models.SkuMaster.id, models.SkuMaster.sku_code, models.SkuMaster.product_component_group_code).filter(
                    models.SkuMaster.id != id,
                    models.SkuMaster.deletedAt == None,
                    cast(models.SkuMaster.product_component_group_code, String).like(f'%"{p_id}"%')
                ).limit(10).all()

                for cand in sibling_candidates:
                    if cand.id == m.id: continue
                    if parse_codes(cand.product_component_group_code).get(t) == p_id:
                        pool_members.append({"id": cand.id, "sku_code": cand.sku_code})
                        if len(pool_members) >= 4: break

                results.append({
                    "id": m.id,
                    "product_name": m.product_name,
                    "sku_code": m.sku_code,
                    "pool_id": p_id,
                    "is_existing_pool": True,
                    "is_already_connected": is_connected,
                    "pool_members": pool_members
                })
                seen_pools.add(p_id)
                if len(results) >= 5: break

        # Priority 2: Suggest individual products as potential pool starters
        if len(results) < 5:
            for m in matches:
                if any(r['id'] == m.id for r in results): continue
                m_codes = parse_codes(m.product_component_group_code)
                if get_code(m_codes, t): continue # Already in a pool (likely handled in Priority 1)

                results.append({
                    "id": m.id,
                    "product_name": m.product_name,
                    "sku_code": m.sku_code,
                    "pool_id": "NEW_POOL", # Placeholder for UI
                    "is_existing_pool": False
                })
                if len(results) >= 5: break

        discovery[comp_type] = results

    return discovery

@app.post("/api/skus/bulk-import")
def bulk_import_skus(data: schemas.BulkImportRequest, db: Session = Depends(get_db)):
    from sqlalchemy import func
    import logging

    # Set up dedicated import logger
    logger = logging.getLogger("bulk_import")
    if not logger.handlers:
        sh = logging.StreamHandler()
        sh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        logger.addHandler(sh)
        logger.setLevel(logging.INFO)

    logger.info(f"Bulk Import: Starting for {len(data.skus)} rows")

    def safe_label(val):
        if val is None: return ""
        return str(val).strip()

    try:
        # 1. Collect all unique labels to resolve
        unique_refs = {
            "BRAND": set(), "CATEGORY": set(), "SUB_CATEGORY": set(),
            "STATUS": set(), "BUNDLE_TYPE": set(), "PACK_TYPE": set(),
            "NET_QUANTITY_UNIT": set(), "SIZE": set(), "COLOR": set()
        }

        for s in data.skus:
            if s.brand_label: unique_refs["BRAND"].add(safe_label(s.brand_label))
            if s.category_label: unique_refs["CATEGORY"].add(safe_label(s.category_label))
            if s.sub_category_label: unique_refs["SUB_CATEGORY"].add(safe_label(s.sub_category_label))
            if s.status_label: unique_refs["STATUS"].add(safe_label(s.status_label))
            if s.bundle_type_label: unique_refs["BUNDLE_TYPE"].add(safe_label(s.bundle_type_label))
            if s.pack_type_label: unique_refs["PACK_TYPE"].add(safe_label(s.pack_type_label))
            if s.net_quantity_unit_label: unique_refs["NET_QUANTITY_UNIT"].add(safe_label(s.net_quantity_unit_label))
            if s.size_label: unique_refs["SIZE"].add(safe_label(s.size_label))
            if s.color_label: unique_refs["COLOR"].add(safe_label(s.color_label))

        # 2. Batch resolve existing references
        ref_map = {} # (type, label_lower) -> {"id": id, "label": label}
        for ref_type, labels in unique_refs.items():
            if not labels: continue
            existing = db.query(models.ReferenceData).filter(
                models.ReferenceData.reference_data_type == ref_type,
                func.lower(models.ReferenceData.label).in_([l.lower() for l in labels]),
                models.ReferenceData.deleted_at == None
            ).all()
            for r in existing:
                ref_map[(ref_type, r.label.lower())] = {"id": r.id, "label": r.label}

        # 3. Create missing references (Auto-create logic)
        for ref_type, labels in unique_refs.items():
            for l in labels:
                if not l: continue
                clean_l = l.strip()
                if (ref_type, clean_l.lower()) not in ref_map:
                    slug = re.sub(r'[^a-z0-9]+', '_', clean_l.lower()).strip('_')
                    unique_suffix = uuid.uuid4().hex[:6]
                    new_key = f"{ref_type.lower()}_{slug}_{unique_suffix}"

                    try:
                        new_ref = models.ReferenceData(
                            reference_data_type=ref_type,
                            label=clean_l,
                            key=new_key,
                            is_active=True
                        )
                        db.add(new_ref)
                        db.flush()
                        ref_map[(ref_type, clean_l.lower())] = {"id": new_ref.id, "label": new_ref.label}
                    except Exception as e:
                        db.rollback()
                        logger.warning(f"Failed to auto-create reference {ref_type}:{clean_l}: {e}")
                        # If creation failed, maybe it was created by another worker; try fetching again
                        existing_after_fail = db.query(models.ReferenceData).filter(
                            models.ReferenceData.reference_data_type == ref_type,
                            func.lower(models.ReferenceData.label) == clean_l.lower(),
                            models.ReferenceData.deleted_at == None
                        ).first()
                        if existing_after_fail:
                            ref_map[(ref_type, clean_l.lower())] = {"id": existing_after_fail.id, "label": existing_after_fail.label}

        # 4. Batch resolve existing SKUs by sku_code
        incoming_sku_codes = [s.sku_code for s in data.skus if s.sku_code]
        existing_skus = db.query(models.SkuMaster).filter(
            models.SkuMaster.sku_code.in_(incoming_sku_codes),
            models.SkuMaster.deletedAt == None
        ).all()

        # sku_id_map maps sku_code -> model instance
        sku_id_map = {s.sku_code: s for s in existing_skus}

        # 5. Process Import
        success_count = 0
        failed_count = 0
        errors = []

        for s_data in data.skus:
            if not s_data.sku_code:
                failed_count += 1
                errors.append({"sku_code": "UNKNOWN", "error": "Missing SKU Code"})
                continue

            try:
                # Use a nested transaction (savepoint) for each SKU
                with db.begin_nested():
                    # Prepare payload
                    payload = s_data.model_dump(exclude_unset=True)

                    # Resolve IDs from labels
                    def get_ref(rtype, rlabel):
                        res = ref_map.get((rtype, safe_label(rlabel).lower()))
                        return res if res else {"id": None, "label": None}

                    if s_data.brand_label: payload["brand_reference_id"] = get_ref("BRAND", s_data.brand_label)["id"]
                    if s_data.category_label: payload["category_reference_id"] = get_ref("CATEGORY", s_data.category_label)["id"]
                    if s_data.sub_category_label: payload["sub_category_reference_id"] = get_ref("SUB_CATEGORY", s_data.sub_category_label)["id"]
                    if s_data.status_label: payload["status_reference_id"] = get_ref("STATUS", s_data.status_label)["id"]

                    if s_data.bundle_type_label: payload["bundle_type"] = get_ref("BUNDLE_TYPE", s_data.bundle_type_label)["label"]
                    if s_data.pack_type_label: payload["pack_type"] = get_ref("PACK_TYPE", s_data.pack_type_label)["label"]

                    if s_data.net_quantity_unit_label: payload["net_quantity_unit_reference_id"] = get_ref("NET_QUANTITY_UNIT", s_data.net_quantity_unit_label)["id"]
                    if s_data.size_label: payload["size_reference_id"] = get_ref("SIZE", s_data.size_label)["id"]
                    if s_data.color_label: payload["color"] = get_ref("COLOR", s_data.color_label)["label"]

                    # Remove local label fields
                    for k in ["brand_label", "category_label", "sub_category_label", "status_label", "bundle_type_label", "pack_type_label", "net_quantity_unit_label", "size_label", "color_label"]:
                        if k in payload: del payload[k]

                    # CRITICAL: Sanitize empty strings to None to prevent DB syntax errors
                    for k, v in payload.items():
                        if v == "":
                            payload[k] = None

                    # Upsert
                    existing_sku = sku_id_map.get(s_data.sku_code)
                    if existing_sku:
                        for k, v in payload.items():
                            setattr(existing_sku, k, v)
                    else:
                        new_sku = models.SkuMaster(**payload)
                        db.add(new_sku)
                        sku_id_map[s_data.sku_code] = new_sku

                    db.flush() # Ensure it's valid for this nested transaction

                success_count += 1
            except Exception as e:
                # Rollback of the nested transaction happens automatically by 'with db.begin_nested()'
                failed_count += 1
                err_msg = str(e)
                logger.warning(f"SKU {s_data.sku_code} failed: {err_msg}")
                errors.append({"sku_code": s_data.sku_code, "error": err_msg})

        db.commit()
        logger.info(f"Bulk Import Complete: {success_count} success, {failed_count} failures")
        return {
            "message": f"Processed {len(data.skus)} items",
            "count": success_count, # keeping 'count' for backward compatibility if any
            "success_count": success_count,
            "failed_count": failed_count,
            "errors": errors
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Bulk Import CRITICAL ERROR: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Bulk Import Logic Error: {str(e)}")


# --- Sales Order Import ---
@app.post("/api/sales/bulk-import")
def bulk_import_sales(data: schemas.BulkSalesImportRequest, db: Session = Depends(get_db)):
    import logging

    logger = logging.getLogger("sales_import")
    if not logger.handlers:
        sh = logging.StreamHandler()
        sh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        logger.addHandler(sh)
        logger.setLevel(logging.INFO)

    logger.info(f"Sales Bulk Import: Starting for {len(data.orders)} rows")

    def safe_label(val):
        if val is None: return ""
        return str(val).strip()

    try:
        # 1. Resolve Platforms (Auto-create)
        unique_platforms = set(safe_label(o.platform_label) for o in data.orders if o.platform_label)
        platform_map = {}
        if unique_platforms:
            existing = db.query(models.ReferenceData).filter(
                models.ReferenceData.reference_data_type == "PLATFORM",
                func.lower(models.ReferenceData.label).in_([l.lower() for l in unique_platforms]),
                models.ReferenceData.deleted_at == None
            ).all()
            for r in existing:
                platform_map[r.label.lower()] = r.id

            for l in unique_platforms:
                if l.lower() not in platform_map:
                    slug = re.sub(r'[^a-z0-9]+', '_', l.lower()).strip('_')
                    new_ref = models.ReferenceData(
                        reference_data_type="PLATFORM",
                        label=l,
                        key=f"platform_{slug}_{uuid.uuid4().hex[:6]}",
                        is_active=True
                    )
                    db.add(new_ref)
                    db.flush()
                    platform_map[l.lower()] = new_ref.id

        # 2. Resolve SKUs
        unique_sku_codes = set(safe_label(o.sku_code) for o in data.orders if o.sku_code)
        unique_barcodes = set(safe_label(o.barcode) for o in data.orders if o.barcode)

        sku_map = {} # code -> id
        if unique_sku_codes or unique_barcodes:
            skus = db.query(models.SkuMaster).filter(
                (models.SkuMaster.sku_code.in_(list(unique_sku_codes))) |
                (models.SkuMaster.barcode.in_(list(unique_barcodes))),
                models.SkuMaster.deletedAt == None
            ).all()
            for s in skus:
                if s.sku_code: sku_map[s.sku_code] = s.id
                if s.barcode: sku_map[s.barcode] = s.id

        # 3. Process Import
        success_count = 0
        failed_count = 0
        errors = []

        for o_data in data.orders:
            try:
                with db.begin_nested():
                    payload = o_data.model_dump(exclude_unset=True)

                    # Resolve IDs
                    plt_id = platform_map.get(safe_label(o_data.platform_label).lower())
                    sku_id = sku_map.get(safe_label(o_data.sku_code or o_data.barcode))

                    if not plt_id:
                        raise ValueError(f"Platform '{o_data.platform_label}' resolution failed")
                    if not sku_id:
                        raise ValueError(f"SKU '{o_data.sku_code or o_data.barcode}' resolution failed")

                    payload["platform_reference_id"] = plt_id
                    payload["sku_master_id"] = sku_id

                    # Defaults
                    if payload.get("quantity") is None: payload["quantity"] = 1
                    if not payload.get("order_type"): payload["order_type"] = "ORDER"

                    # Cleanup labels
                    for k in ["platform_label", "sku_code", "barcode"]:
                        if k in payload: del payload[k]

                    # Deduplication (Platform + Ext Order ID + SKU Master ID)
                    ext_order_id = payload.get("external_order_id")

                    existing_order = db.query(models.SalesOrder).filter(
                        models.SalesOrder.platform_reference_id == plt_id,
                        models.SalesOrder.external_order_id == ext_order_id,
                        models.SalesOrder.sku_master_id == sku_id
                    ).first()

                    if existing_order:
                        # Update existing
                        for k, v in payload.items():
                            setattr(existing_order, k, v)
                    else:
                        # Create new
                        new_order = models.SalesOrder(**payload)
                        db.add(new_order)

                    db.flush()
                success_count += 1
            except Exception as e:
                failed_count += 1
                err_msg = str(e)
                logger.warning(f"Order {o_data.external_order_id} failed: {err_msg}")
                errors.append({"external_order_id": o_data.external_order_id or "UNKNOWN", "error": err_msg})

        db.commit()
        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "errors": errors
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Sales Bulk Import CRITICAL ERROR: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Sales Bulk Import Logic Error: {str(e)}")

@app.get("/api/sales", response_model=List[schemas.SalesOrder])
def get_sales_orders(db: Session = Depends(get_db)):
    return db.query(models.SalesOrder).order_by(models.SalesOrder.order_date.desc()).all()


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


# ==========================================
# GOOGLE DRIVE INTEGRATION
# ==========================================

def _generate_drive_url(brand_id: int, cat_id: int, subcat_id: int, sku_code: str, db: Session):
    def get_label(ref_id):
        if not ref_id: return None
        ref = db.query(models.ReferenceData).filter(models.ReferenceData.id == ref_id).first()
        return ref.label if ref else None

    brand_label = get_label(brand_id)
    cat_label = get_label(cat_id)
    subcat_label = get_label(subcat_id)

    drive = DriveService()
    if not drive.service:
        raise HTTPException(status_code=500, detail=f"Google Drive Error: {drive.last_error or 'Credentials not configured in backend.'}")

    return drive.create_sku_folder_structure(
        brand=brand_label,
        category=cat_label,
        sub_category=subcat_label,
        sku_code=sku_code
    )

@app.post("/api/skus/generate-catalog-url")
def generate_sku_catalog_url_preview(data: schemas.DriveFolderCreate, db: Session = Depends(get_db)):
    # 1. Validation
    if not data.brand_name.strip():
        raise HTTPException(status_code=400, detail="Brand name is required for catalog generation.")
    if not data.category_name.strip():
        raise HTTPException(status_code=400, detail="Category name is required for catalog generation.")
    if not data.sku_code.strip():
        raise HTTPException(status_code=400, detail="SKU Code is required for catalog generation.")

    try:
        drive = DriveService()
        if not drive.service:
            raise HTTPException(status_code=500, detail=f"Google Drive Error: {drive.last_error or 'Credentials not configured in backend.'}")

        url = drive.create_sku_folder_structure(
            brand=data.brand_name.strip(),
            category=data.category_name.strip(),
            sub_category=data.sub_category_name.strip() if data.sub_category_name else "general",
            sku_code=data.sku_code.strip()
        )
        return {"catalog_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google Drive Error: {str(e)}")

@app.post("/api/skus/{id}/generate-catalog-url", response_model=schemas.SkuMaster)
def generate_sku_catalog_url_saved(id: int, db: Session = Depends(get_db)):
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id, models.SkuMaster.deletedAt == None).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    try:
        folder_url = _generate_drive_url(
            sku.brand_reference_id,
            sku.category_reference_id,
            sku.sub_category_reference_id,
            sku.sku_code,
            db
        )

        sku.catalog_url = folder_url
        db.commit()
        db.refresh(sku)
        return sku
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google Drive Error: {str(e)}")
@app.post("/api/skus/{id}/trash-catalog-folder", response_model=schemas.SkuMaster)
def trash_sku_catalog_folder(id: int, db: Session = Depends(get_db)):
    sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    if sku.catalog_url:
        drive_service = DriveService()
        drive_service.trash_folder(sku.catalog_url)

        sku.catalog_url = None
        db.commit()
        db.refresh(sku)

    return sku
@app.post("/api/skus/export-images")
async def export_sku_images(data: schemas.ImageExportRequest, db: Session = Depends(get_db)):
    drive = DriveService()
    if not drive.service:
        raise HTTPException(status_code=500, detail=f"Google Drive Error: {drive.last_error or 'Drive service not initialized'}")

    def get_label(ref_id):
        if not ref_id: return "Unknown"
        ref = db.query(models.ReferenceData).filter(models.ReferenceData.id == ref_id).first()
        return ref.label if ref else "Unknown"

    print(f"Export Images: Starting for {len(data.sku_ids)} SKUs")

    # Memory buffer for ZIP
    zip_buffer = io.BytesIO()
    total_files_added = 0

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED, False) as zip_file:
        for sku_id in data.sku_ids:
            sku = db.query(models.SkuMaster).filter(models.SkuMaster.id == sku_id).first()
            if not sku:
                print(f"Export: SKU ID {sku_id} not found")
                continue
            if not sku.catalog_url:
                print(f"Export: SKU {sku.sku_code} has no catalog_url")
                continue

            folder_id = drive.get_id_from_url(sku.catalog_url)
            if not folder_id:
                print(f"Export: Invalid folder URL for SKU {sku.sku_code}")
                continue

            # Fetch file list
            files = drive.list_files_in_folder(folder_id)
            if not files:
                print(f"Export: No files found in Drive folder for SKU {sku.sku_code}")
                continue

            # Context for template resolution
            context = {
                "sku_code": sku.sku_code or "no_sku",
                "barcode": sku.barcode or "no_barcode",
                "brand": get_label(sku.brand_reference_id),
                "category": get_label(sku.category_reference_id),
                "sub_category": get_label(sku.sub_category_reference_id),
                "product_name": sku.product_name or "no_name"
            }

            def resolve_template(tmpl, ctx, idx=0):
                res = tmpl
                for k, v in ctx.items():
                    res = res.replace("{{ " + k + " }}", str(v)).replace("{{" + k + "}}", str(v))
                res = res.replace("{{ index }}", str(idx)).replace("{{index}}", str(idx))
                # Sanitize path segments, filter out empty parts
                segments = [drive.sanitize_name(p) for p in res.split("/") if p.strip()]
                return "/".join(segments)

            # Process files
            print(f"Export: Processing {len(files)} files for SKU {sku.sku_code}")
            for idx, f in enumerate(files, 1):
                content = drive.get_file_content(f['id'])
                if not content:
                    continue

                # Determine target path
                if data.flatten_hierarchy:
                    folder_path = drive.sanitize_name(sku.sku_code or str(sku_id))
                else:
                    folder_path = resolve_template(data.folder_template, context)

                # Determine filename
                file_ext = f['name'].split('.')[-1] if '.' in f['name'] else 'bin'
                filename = resolve_template(data.file_template, context, idx)
                if not filename.endswith(f".{file_ext}"):
                    filename = f"{filename}.{file_ext}"

                # Ensure path is valid and relative (not absolute)
                full_path = "/".join(p for p in f"{folder_path}/{filename}".split("/") if p)

                zip_file.writestr(full_path, content)
                total_files_added += 1

    print(f"Export: ZIP complete. Total files added: {total_files_added}")

    if total_files_added == 0:
        raise HTTPException(
            status_code=404,
            detail="No images found for the selected products to export. Ensure catalog URLs are correct and folders contain files."
        )

    # Prepare response using a generator for stable streaming of binary data
    def iter_buffer():
        zip_buffer.seek(0)
        while chunk := zip_buffer.read(8192):
            yield chunk

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M")
    return StreamingResponse(
        iter_buffer(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="Bloomerce_Images_{timestamp}.zip"'}
    )
