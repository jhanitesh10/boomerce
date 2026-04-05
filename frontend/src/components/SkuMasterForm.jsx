import React, { useState, useEffect, useRef } from 'react';
import DynamicReferenceSelect from './DynamicReferenceSelect';
import { skuApi, uploadApi } from '../api';
import '../drawer.css';
import {
  X, Save, UploadCloud, RefreshCw, Trash2,
  Package, Tag, FileText, BarChart2, Layers, Info, StickyNote
} from 'lucide-react';

// -----------------------------------------------------------------
// Auto-resizing textarea
// -----------------------------------------------------------------
function AutoTextarea({ name, value, onChange, placeholder, rows = 2 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      name={name}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="form-input auto-textarea"
    />
  );
}

// -----------------------------------------------------------------
// Image uploader block
// -----------------------------------------------------------------
function ImageBlock({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      onChange(res.url);
    } catch {
      alert('Upload failed. Try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="image-block">
      <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleFile} />

      {value ? (
        <div className="image-preview-wrap">
          <img src={value} alt="Product" className="image-preview-img" />
          <div className="image-preview-actions">
            <button type="button" className="img-action-btn" onClick={() => fileRef.current?.click()} title="Replace image">
              <RefreshCw size={16} /> Replace
            </button>
            <button type="button" className="img-action-btn danger" onClick={() => onChange('')} title="Remove image">
              <Trash2 size={16} /> Remove
            </button>
          </div>
          {uploading && <div className="image-uploading-overlay">Uploading…</div>}
        </div>
      ) : (
        <div
          className={`image-dropzone ${uploading ? 'uploading' : ''}`}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          <UploadCloud size={32} className="image-dropzone-icon" />
          <span className="image-dropzone-label">{uploading ? 'Uploading…' : 'Click to upload primary image'}</span>
          <span className="image-dropzone-hint">JPG, PNG, WEBP — recommended 800×800px</span>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------
// Field row helpers
// -----------------------------------------------------------------
function Field({ label, required, children, hint }) {
  return (
    <div className="sf-field">
      <label className="sf-label">
        {label}
        {required && <span className="sf-required">*</span>}
      </label>
      {children}
      {hint && <span className="sf-hint">{hint}</span>}
    </div>
  );
}

function FieldRow({ children }) {
  return <div className="sf-field-row">{children}</div>;
}

// Tab definitions — order matters (most used first)
const TABS = [
  { id: 'identity',       label: 'Identity',         icon: Package },
  { id: 'content',        label: 'Content',          icon: FileText },
  { id: 'classification', label: 'Classify',          icon: Tag },
  { id: 'pricing',        label: 'Pricing & Specs',   icon: BarChart2 },
  { id: 'bundling',       label: 'Product & Bundle',  icon: Layers },
  { id: 'tax',            label: 'Tax & Compliance',  icon: Info },
];

// -----------------------------------------------------------------
// Main Form
// -----------------------------------------------------------------
const EMPTY = {
  product_name: '',
  sku_code: '',
  barcode: '',
  product_component_group_code: '',
  remark: '',
  primary_image_url: '',
  brand_reference_id: null,

  description: '',
  key_feature: '',
  caution: '',
  product_care: '',
  how_to_use: '',
  ingredients: '',
  key_ingredients: '',
  seo_keywords: '',
  catalog_url: '',

  category_reference_id: null,
  sub_category_reference_id: null,
  status_reference_id: null,

  mrp: '',
  purchase_cost: '',
  color: '',
  raw_product_size: '',
  package_size: '',
  package_weight: '',
  raw_product_weight: '',
  finished_product_weight: '',
  net_content_value: '',
  net_content_unit: '',
  bundle_type: '',
  product_type: '',
  pack_type: '',

  tax_rule_code: '',
  tax_percent: '',
};

export default function SkuMasterForm({ initialData, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (!initialData) return { ...EMPTY };
    const merged = { ...EMPTY };
    for (const key of Object.keys(EMPTY)) {
      const v = initialData[key];
      merged[key] = v != null ? v : EMPTY[key];
    }
    return merged;
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('identity');
  const [notesOpen, setNotesOpen] = useState(() => Boolean(initialData?.remark));

  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    set(name, value);
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.product_name?.trim()) errs.product_name = 'Product name is required';
    if (!form.sku_code?.trim()) errs.sku_code = 'SKU code is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      // scroll to first error
      document.querySelector('.sf-input-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      // convert empty strings to null for numeric fields
      ['mrp', 'purchase_cost', 'package_weight', 'raw_product_weight',
        'finished_product_weight', 'net_content_value', 'tax_percent'].forEach(k => {
        payload[k] = payload[k] === '' ? null : Number(payload[k]) || null;
      });

      if (initialData?.id) {
        await skuApi.update(initialData.id, payload);
      } else {
        await skuApi.create(payload);
      }
      onSaved();
    } catch (err) {
      alert(`Save failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isEdit = Boolean(initialData?.id);
  const title = isEdit ? 'Edit Product' : 'Add New Product';

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel">

        {/* ── Sticky header ─────────────────────────────── */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <button className="drawer-close" onClick={onClose} type="button">
              <X size={20} />
            </button>
            <div>
              <h2 className="drawer-title">{title}</h2>
              {isEdit && <span className="drawer-subtitle">{initialData.sku_code}</span>}
            </div>
          </div>
          <div className="drawer-header-actions">
            {/* Notes toggle */}
            <button
              type="button"
              className={`notes-toggle-btn ${notesOpen ? 'active' : ''} ${form.remark ? 'has-content' : ''}`}
              onClick={() => setNotesOpen(o => !o)}
              title={notesOpen ? 'Close notes' : 'Internal notes'}
            >
              <StickyNote size={15} />
              <span>Notes</span>
              {form.remark && !notesOpen && <span className="notes-dot" />}
            </button>
            <button className="btn btn-secondary" onClick={onClose} type="button" disabled={saving}>Cancel</button>
            <button className="btn btn-primary" type="submit" form="skuForm" disabled={saving}>
              {saving ? <span className="spinner" /> : <><Save size={15} /> {isEdit ? 'Save Changes' : 'Create Product'}</>}
            </button>
          </div>
        </div>

        {/* ── Notes panel (collapsible, below header) ───────── */}
        {notesOpen && (
          <div className="drawer-notes-panel">
            <AutoTextarea
              name="remark"
              value={form.remark}
              onChange={handleChange}
              placeholder="Internal notes, QC flags, artwork status, launch remarks…"
              rows={2}
            />
          </div>
        )}

        {/* ── Tab bar ───────────────────────────────────── */}
        <div className="drawer-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`drawer-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ───────────────────────────── */}
        <div className="drawer-body">
          <form id="skuForm" onSubmit={handleSubmit} noValidate>

            {/* ── IDENTITY ──────────────────────────────────────── */}
            {activeTab === 'identity' && (
              <div className="sf-tab-pane">
                <ImageBlock value={form.primary_image_url} onChange={(val) => set('primary_image_url', val)} />

                <Field label="Product Name" required>
                  <input type="text" name="product_name" value={form.product_name} onChange={handleChange}
                    className={`form-input ${errors.product_name ? 'sf-input-error' : ''}`}
                    placeholder="e.g. Bloomerce Rose Petal Face Wash" />
                  {errors.product_name && <span className="sf-error-msg">{errors.product_name}</span>}
                </Field>

                <FieldRow>
                  <Field label="SKU Code" required>
                    <input type="text" name="sku_code" value={form.sku_code} onChange={handleChange}
                      className={`form-input mono ${errors.sku_code ? 'sf-input-error' : ''}`}
                      placeholder="e.g. BL-RFW-001" />
                    {errors.sku_code && <span className="sf-error-msg">{errors.sku_code}</span>}
                  </Field>
                  <Field label="Barcode / EAN">
                    <input type="text" name="barcode" value={form.barcode} onChange={handleChange}
                      className="form-input mono" placeholder="e.g. 8901234567891" />
                  </Field>
                </FieldRow>

                <FieldRow>
                  <Field label="Brand">
                    <DynamicReferenceSelect label="" referenceType="BRAND" value={form.brand_reference_id}
                      onChange={(v) => set('brand_reference_id', v)} placeholder="Select or add brand…" />
                  </Field>
                  <Field label="Component Group Code" hint="For bundle / kit tracking">
                    <input type="text" name="product_component_group_code" value={form.product_component_group_code}
                      onChange={handleChange} className="form-input mono" placeholder="e.g. GRP-001" />
                  </Field>
                </FieldRow>
              </div>
            )}

            {/* ── CLASSIFICATION ────────────────────────────────── */}
            {activeTab === 'classification' && (
              <div className="sf-tab-pane">
                <FieldRow>
                  <Field label="Category">
                    <DynamicReferenceSelect label="" referenceType="CATEGORY" value={form.category_reference_id}
                      onChange={(v) => set('category_reference_id', v)} placeholder="Select or add category…" />
                  </Field>
                  <Field label="Sub-Category">
                    <DynamicReferenceSelect label="" referenceType="SUB_CATEGORY" value={form.sub_category_reference_id}
                      onChange={(v) => set('sub_category_reference_id', v)} placeholder="Select or add sub-category…" />
                  </Field>
                </FieldRow>
                <Field label="Product Status">
                  <DynamicReferenceSelect label="" referenceType="STATUS" value={form.status_reference_id}
                    onChange={(v) => set('status_reference_id', v)} placeholder="Active / Inactive / Draft…" />
                </Field>
              </div>
            )}

            {/* ── CONTENT ───────────────────────────────────────── */}
            {activeTab === 'content' && (
              <div className="sf-tab-pane">
                <Field label="Description" hint="Main product description shown on listings">
                  <AutoTextarea name="description" value={form.description} onChange={handleChange}
                    placeholder="Describe the product clearly for customers and search engines…" rows={3} />
                </Field>
                <Field label="Key Features / USPs" hint="One feature per line">
                  <AutoTextarea name="key_feature" value={form.key_feature} onChange={handleChange}
                    placeholder={"Sulphate-free\npH balanced\nSuitable for all skin types"} rows={3} />
                </Field>
                <FieldRow>
                  <Field label="Key Ingredients">
                    <AutoTextarea name="key_ingredients" value={form.key_ingredients} onChange={handleChange}
                      placeholder="Rose Water, Aloe Vera…" />
                  </Field>
                  <Field label="Full Ingredients">
                    <AutoTextarea name="ingredients" value={form.ingredients} onChange={handleChange}
                      placeholder="Aqua, Glycerin, Rosa Damascena…" />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="How to Use">
                    <AutoTextarea name="how_to_use" value={form.how_to_use} onChange={handleChange}
                      placeholder="Apply on wet face, massage gently, rinse." />
                  </Field>
                  <Field label="Product Care">
                    <AutoTextarea name="product_care" value={form.product_care} onChange={handleChange}
                      placeholder="Store in a cool, dry place." />
                  </Field>
                </FieldRow>
                <Field label="Caution / Warnings">
                  <AutoTextarea name="caution" value={form.caution} onChange={handleChange}
                    placeholder="Keep out of reach of children. For external use only." />
                </Field>
                <Field label="SEO Keywords" hint="Comma-separated">
                  <input type="text" name="seo_keywords" value={form.seo_keywords} onChange={handleChange}
                    className="form-input" placeholder="rose face wash, sulphate free" />
                </Field>
                <Field label="Catalog / Product Page URL">
                  <input type="url" name="catalog_url" value={form.catalog_url} onChange={handleChange}
                    className="form-input" placeholder="https://example.com/product-page" />
                </Field>
              </div>
            )}

            {/* ── PRICING & SPECS ───────────────────────────────── */}
            {activeTab === 'pricing' && (
              <div className="sf-tab-pane">
                <FieldRow>
                  <Field label="MRP (₹)" hint="Maximum Retail Price">
                    <input type="number" name="mrp" value={form.mrp} onChange={handleChange}
                      className="form-input" placeholder="499.00" min="0" step="0.01" />
                  </Field>
                  <Field label="Purchase Cost (₹)">
                    <input type="number" name="purchase_cost" value={form.purchase_cost} onChange={handleChange}
                      className="form-input" placeholder="148.00" min="0" step="0.01" />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Net Content Value">
                    <input type="number" name="net_content_value" value={form.net_content_value} onChange={handleChange}
                      className="form-input" placeholder="100" min="0" step="0.01" />
                  </Field>
                  <Field label="Net Content Unit">
                    <input type="text" name="net_content_unit" value={form.net_content_unit} onChange={handleChange}
                      className="form-input" placeholder="ml / g / pcs" />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Color / Shade">
                    <input type="text" name="color" value={form.color} onChange={handleChange}
                      className="form-input" placeholder="e.g. Rose Pink" />
                  </Field>
                  <Field label="Raw Product Size">
                    <input type="text" name="raw_product_size" value={form.raw_product_size} onChange={handleChange}
                      className="form-input" placeholder="e.g. 15x5x5 cm" />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Package Size">
                    <input type="text" name="package_size" value={form.package_size} onChange={handleChange}
                      className="form-input" placeholder="e.g. 16x6x6 cm" />
                  </Field>
                  <Field label="Package Weight (g)">
                    <input type="number" name="package_weight" value={form.package_weight} onChange={handleChange}
                      className="form-input" placeholder="25" min="0" step="0.01" />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Raw Product Weight (g)">
                    <input type="number" name="raw_product_weight" value={form.raw_product_weight} onChange={handleChange}
                      className="form-input" placeholder="100" min="0" step="0.01" />
                  </Field>
                  <Field label="Finished Product Weight (g)">
                    <input type="number" name="finished_product_weight" value={form.finished_product_weight} onChange={handleChange}
                      className="form-input" placeholder="125" min="0" step="0.01" />
                  </Field>
                </FieldRow>
              </div>
            )}

            {/* ── PRODUCT & BUNDLE ────────────────────────────────── */}
            {activeTab === 'bundling' && (
              <div className="sf-tab-pane">
                <FieldRow>
                  <Field label="Product Type" hint="e.g. Standalone, Combo">
                    <input type="text" name="product_type" value={form.product_type} onChange={handleChange}
                      className="form-input" placeholder="Standalone" />
                  </Field>
                  <Field label="Bundle Type" hint="e.g. Kit, Gift Set">
                    <input type="text" name="bundle_type" value={form.bundle_type} onChange={handleChange}
                      className="form-input" placeholder="Kit" />
                  </Field>
                </FieldRow>
                <Field label="Pack Type" hint="e.g. Box, Tube, Pouch, Bottle">
                  <input type="text" name="pack_type" value={form.pack_type} onChange={handleChange}
                    className="form-input" placeholder="Bottle" />
                </Field>
              </div>
            )}

            {/* ── TAX & COMPLIANCE ─────────────────────────────────── */}
            {activeTab === 'tax' && (
              <div className="sf-tab-pane">
                <FieldRow>
                  <Field label="Tax Rule Code" hint="e.g. GST_18, GST_12">
                    <input type="text" name="tax_rule_code" value={form.tax_rule_code} onChange={handleChange}
                      className="form-input mono" placeholder="GST_18" />
                  </Field>
                  <Field label="Tax %">
                    <input type="number" name="tax_percent" value={form.tax_percent} onChange={handleChange}
                      className="form-input" placeholder="18" min="0" max="100" step="0.1" />
                  </Field>
                </FieldRow>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
