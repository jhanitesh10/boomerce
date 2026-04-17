import os
import sys
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
from main import parse_codes
from sqlalchemy.orm.attributes import flag_modified

def run_migration():
    db = SessionLocal()
    try:
        print("Starting full migration...")
        skus = db.query(models.SkuMaster).filter(
            models.SkuMaster.product_component_group_code != None,
            models.SkuMaster.deletedAt == None
        ).all()
        
        migrated_count = 0
        already_migrated = 0
        
        for sku in skus:
            raw = sku.product_component_group_code
            if not raw: continue
            
            # Use standardized logic
            normalized = parse_codes(raw)
            
            # check if it's already in the correct format (list)
            # if the raw input was a string that looks like an array, parse_codes returns a list.
            # but if it was ALREADY a list, we can skip.
            is_already_array = False
            if isinstance(raw, list):
                is_already_array = True
            elif isinstance(raw, str):
                try:
                    if json.loads(raw)[0].get("type"):
                        is_already_array = True
                except:
                    pass
            
            if is_already_array:
                already_migrated += 1
                continue
                
            # Perform update
            sku.product_component_group_code = normalized
            flag_modified(sku, "product_component_group_code")
            migrated_count += 1
            
            if migrated_count % 50 == 0:
                print(f"Propagating... {migrated_count} updates staged.")
        
        print(f"Summary: {migrated_count} updates needed, {already_migrated} already in array format.")
        
        if migrated_count > 0:
            print("Committing to database...")
            db.commit()
            print("Migration complete.")
        else:
            print("No updates needed.")
            
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
