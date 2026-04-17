import os
import sys
import json
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
import models
from main import parse_codes

def run_migration():
    db = SessionLocal()
    try:
        print("Starting brute-force migration with raw SQL...")
        # Get all SKUs where group code is not null
        skus = db.query(models.SkuMaster.id, models.SkuMaster.product_component_group_code).filter(
            models.SkuMaster.product_component_group_code != None,
            models.SkuMaster.deletedAt == None
        ).all()
        
        migrated_count = 0
        skipped_count = 0
        
        for s_id, raw_code in skus:
            if not raw_code:
                skipped_count += 1
                continue
            
            # Use our standardized parser
            normalized = parse_codes(raw_code)
            normalized_json = json.dumps(normalized)
            
            # Brute force update using raw SQL
            db.execute(
                text("UPDATE sku_master SET product_component_group_code = :val, \"updatedAt\" = now() WHERE id = :id"),
                {"val": normalized_json, "id": s_id}
            )
            migrated_count += 1
            if migrated_count % 50 == 0:
                print(f"Staged {migrated_count} updates...")
                
        db.commit()
        print(f"Brute-force Migration Summary:")
        print(f" - Successfully committed {migrated_count} updates using raw SQL.")
        print(f" - Skipped {skipped_count} empty entries.")
        
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
