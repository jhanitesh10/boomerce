from pydantic import BaseModel
from typing import Optional, Dict, Any, Union, List
from datetime import datetime

# --- Reference Data Schemas ---
class ReferenceDataBase(BaseModel):
    reference_data_type: str
    label: Optional[str] = None
    key: Optional[str] = None
    parent_reference_id: Optional[int] = None
    description: Optional[str] = None
    display_order: Optional[int] = 0
    is_active: Optional[bool] = True
    metadata_json: Optional[Union[Dict[str, Any], List[Any]]] = None

class ReferenceDataCreate(ReferenceDataBase):
    pass

class ReferenceData(ReferenceDataBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- SKU Master Schemas ---
class SkuMasterBase(BaseModel):
    brand_reference_id: Optional[int] = None
    category_reference_id: Optional[int] = None
    sub_category_reference_id: Optional[int] = None
    live_platform_reference_id: Optional[Union[Dict[str, Any], List[Any]]] = None
    status_reference_id: Optional[int] = None

    product_name: Optional[str] = None
    description: Optional[str] = None
    key_feature: Optional[str] = None
    caution: Optional[str] = None
    product_care: Optional[str] = None
    how_to_use: Optional[str] = None
    seo_keywords: Optional[str] = None
    key_ingredients: Optional[str] = None
    ingredients: Optional[str] = None
    catalog_url: Optional[str] = None
    primary_image_url: Optional[str] = None
    sku_code: Optional[str] = None
    barcode: Optional[str] = None

    mrp: Optional[float] = None
    purchase_cost: Optional[float] = None
    color: Optional[str] = None

    raw_product_size: Optional[str] = None
    package_size: Optional[str] = None
    package_weight: Optional[float] = None
    raw_product_weight: Optional[float] = None
    finished_product_weight: Optional[float] = None
    net_content_value: Optional[float] = None
    net_content_unit: Optional[str] = None

    metadata_json: Optional[Union[Dict[str, Any], List[Any]]] = None
    remark: Optional[str] = None
    bundle_type: Optional[Union[int, str]] = None
    product_component_group_code: Optional[str] = None
    product_type: Optional[str] = None
    pack_type: Optional[Union[int, str]] = None
    tax_rule_code: Optional[str] = None
    tax_percent: Optional[float] = None

    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

class SkuMasterCreate(SkuMasterBase):
    pass

class SkuMaster(SkuMasterBase):
    id: int
    createdAt: datetime
    udpatedAt: datetime
    deletedAt: Optional[datetime] = None
    deleted_by_id: Optional[int] = None

    class Config:
        from_attributes = True

class PlatformPatch(BaseModel):
    action: str  
    reference_id: int

class DriveFolderCreate(BaseModel):
    brand_name: str
    category_name: str
    sub_category_name: str
    sku_code: str

class ImageExportRequest(BaseModel):
    sku_ids: List[int]
    folder_template: str = "{{brand}}/{{sku_code}}"
    file_template: str = "{{sku_code}}_{{index}}"
    flatten_hierarchy: bool = False
    include_all_files: bool = True

class SkuImportRow(SkuMasterBase):
    brand_label: Optional[str] = None
    category_label: Optional[str] = None
    sub_category_label: Optional[str] = None
    status_label: Optional[str] = None
    bundle_type_label: Optional[str] = None
    pack_type_label: Optional[str] = None

class BulkImportRequest(BaseModel):
    skus: List[SkuImportRow]
