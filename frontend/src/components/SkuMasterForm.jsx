import React, { useState, useEffect, useRef } from 'react';
import DynamicReferenceSelect from './DynamicReferenceSelect';
import { skuApi, uploadApi } from '../api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  X, Save, UploadCloud, RefreshCw, Trash2, Link, ArrowLeft,
  Package, Tag, FileText, BarChart2, Layers, Info, StickyNote,
  AlertCircle
} from 'lucide-react';

// ─── Auto-resizing textarea ───────────────────────────────────────
function AutoTextarea({ name, value, onChange, placeholder, rows = 2, className }) {
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
      className={cn(
        "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all leading-relaxed",
        className
      )}
    />
  );
}

// ─── Helper to resolve Google Drive links ────────────────────────
const getDirectImageUrl = (url) => {
  if (!url) return '';
  // Support Google Drive view links
  // Format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const gdMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                  url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (gdMatch && gdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gdMatch[1]}`;
  }
  return url;
};

// ─── Image uploader with URL support ──────────────────────────────
function ImageBlock({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const fileRef = useRef(null);
  const [tempUrl, setTempUrl] = useState(value || '');

  useEffect(() => {
    setTempUrl(value || '');
  }, [value]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      onChange(res.url);
      setShowOptions(false);
    } catch {
      alert('Upload failed. Try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyUrl = () => {
    if (!tempUrl.trim()) return;
    const resolved = getDirectImageUrl(tempUrl.trim());
    onChange(resolved);
    setShowOptions(false);
  };

  const handleUrlBlur = () => {
    if (tempUrl.trim() && tempUrl.trim() !== value) {
      applyUrl();
    }
  };

  const isAddingOrReplacing = !value || showOptions;

  return (
    <div className="mb-6">
      <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleFile} />
      
      <div className="relative group rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-muted)]/30 transition-all hover:bg-[var(--color-muted)]/50 min-h-[120px] flex flex-col">
        {!isAddingOrReplacing ? (
          <div className="relative h-48 bg-white flex items-center justify-center p-4">
            <img 
              src={value} 
              alt="Product Preview" 
              className="max-w-full max-h-full object-contain drop-shadow-sm rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback if image fails to load */}
            <div className="hidden absolute inset-0 flex flex-col items-center justify-center text-red-500 gap-2">
              <AlertCircle size={24} />
              <span className="text-[10px] uppercase font-bold tracking-wider">Invalid Image URL</span>
            </div>
            
            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3 backdrop-blur-[2px]">
              <button
                type="button"
                onClick={() => setShowOptions(true)}
                className="flex items-center gap-2 bg-white text-slate-800 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                <RefreshCw size={14} /> Replace Options
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="flex items-center gap-2 bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-red-600 transition-all active:scale-95 shadow-sm"
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 animate-[fade-in_0.2s_ease]">
             {value && (
               <button 
                 type="button"
                 onClick={() => setShowOptions(false)}
                 className="absolute top-4 left-4 p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:bg-white hover:text-[var(--color-foreground)] transition-colors shadow-sm bg-white/50 border border-[var(--color-border)]"
                 title="Back to Preview"
               >
                 <ArrowLeft size={14} />
               </button>
             )}

             <div 
               onClick={() => !uploading && fileRef.current?.click()}
               className={cn(
                 "w-full md:w-1/3 aspect-square max-w-[140px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-white cursor-pointer transition-all",
                 "hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 active:scale-[0.98]",
                 uploading && "opacity-60 cursor-not-allowed"
               )}
             >
                {uploading ? (
                   <span className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
                ) : (
                   <>
                     <UploadCloud size={32} className="text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] transition-colors" />
                     <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Upload</span>
                   </>
                )}
             </div>

             <div className="flex-1 w-full space-y-3">
                <div className="flex flex-col gap-1.5">
                   <span className="text-xs font-semibold text-[var(--color-foreground)]">Public Image or Drive URL</span>
                   <div className="relative group/input">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-muted-foreground)] group-focus-within/input:text-[var(--color-primary)] transition-colors">
                        <Link size={14} />
                      </div>
                      <input 
                        type="url"
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                        onBlur={handleUrlBlur}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyUrl())}
                        placeholder="Paste image link here..."
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all placeholder:text-[var(--color-muted-foreground)]/60"
                      />
                   </div>
                   <p className="text-[10px] text-[var(--color-muted-foreground)] leading-relaxed italic">
                     Google Drive "view" links are auto-converted to direct image streams for preview.
                   </p>
                </div>
             </div>
          </div>
        )}
        {uploading && (
           <div className="absolute inset-0 bg-[var(--color-card)]/40 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-lg border border-[var(--color-border)]">
                 <span className="w-4 h-4 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
                 <span className="text-xs font-bold text-[var(--color-foreground)] tracking-tight">Optimizing Image…</span>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

// ─── Field + FieldRow helpers ─────────────────────────────────────
function Field({ label, required, children, hint, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--color-foreground)]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <span className="text-[11px] text-[var(--color-muted-foreground)]">{hint}</span>}
      {error && (
        <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </div>
  );
}

function FieldRow({ children, cols = 2 }) {
  return (
    <div className={cn("grid gap-4", cols === 2 ? "grid-cols-2" : "grid-cols-1")}>
      {children}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'identity',       label: 'Identity',        icon: Package },
  { id: 'content',        label: 'Content',         icon: FileText },
  { id: 'classification', label: 'Classify',         icon: Tag },
  { id: 'pricing',        label: 'Pricing & Specs',  icon: BarChart2 },
  { id: 'bundling',       label: 'Product & Bundle', icon: Layers },
  { id: 'tax',            label: 'Tax & Compliance', icon: Info },
];

const TAB_FIELDS = {
  identity:       ['product_name', 'sku_code', 'barcode', 'brand_reference_id', 'product_component_group_code', 'primary_image_url'],
  content:        ['description', 'key_feature', 'key_ingredients', 'ingredients', 'how_to_use', 'product_care', 'caution', 'seo_keywords', 'catalog_url'],
  classification: ['category_reference_id', 'sub_category_reference_id', 'status_reference_id'],
  pricing:        ['mrp', 'purchase_cost', 'net_content_value', 'net_content_unit', 'color', 'raw_product_size', 'package_size', 'package_weight', 'raw_product_weight', 'finished_product_weight'],
  bundling:       ['product_type', 'bundle_type', 'pack_type'],
  tax:            ['tax_rule_code', 'tax_percent'],
};

function getTabsWithErrors(errors) {
  const errorFields = new Set(Object.keys(errors).filter(k => errors[k]));
  const tabs = new Set();
  for (const [tabId, fields] of Object.entries(TAB_FIELDS)) {
    if (fields.some(f => errorFields.has(f))) tabs.add(tabId);
  }
  return tabs;
}

// ─── Empty form state ─────────────────────────────────────────────
const EMPTY = {
  product_name: '', sku_code: '', barcode: '', product_component_group_code: '',
  remark: '', primary_image_url: '', brand_reference_id: null,
  description: '', key_feature: '', caution: '', product_care: '', how_to_use: '',
  ingredients: '', key_ingredients: '', seo_keywords: '', catalog_url: '',
  category_reference_id: null, sub_category_reference_id: null, status_reference_id: null,
  mrp: '', purchase_cost: '', color: '', raw_product_size: '', package_size: '',
  package_weight: '', raw_product_weight: '', finished_product_weight: '',
  net_content_value: '', net_content_unit: '', bundle_type: '', product_type: '', pack_type: '',
  tax_rule_code: '', tax_percent: '',
};

// ─── Shared input className ───────────────────────────────────────
const inputCls = (hasError) => cn(
  "w-full rounded-lg border bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all",
  hasError ? "border-red-400 focus:ring-red-400/30" : "border-[var(--color-border)]"
);

// ─── Main Form ────────────────────────────────────────────────────
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
  const [confirmClose, setConfirmClose] = useState(false);

  const savedSnapshot = useRef((() => {
    const base = { ...EMPTY };
    if (initialData) {
      for (const k of Object.keys(EMPTY)) {
        const v = initialData[k];
        base[k] = v != null ? v : EMPTY[k];
      }
    }
    return base;
  })());

  const isDirty = Object.keys(EMPTY).some(k => {
    let a = form[k], b = savedSnapshot.current[k];
    a = (a === '' || a === null || a === undefined) ? null : String(a);
    b = (b === '' || b === null || b === undefined) ? null : String(b);
    return a !== b;
  });

  const handleClose = () => { if (isDirty) { setConfirmClose(true); return; } onClose(); };
  const handleDiscard = () => { setConfirmClose(false); onClose(); };
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

  const saveForm = async (opts = {}) => {
    if (opts.fromDialog) setConfirmClose(false);
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      const errTabs = getTabsWithErrors(errs);
      const firstErrTab = TABS.find(t => errTabs.has(t.id));
      if (firstErrTab) setActiveTab(firstErrTab.id);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      ['mrp', 'purchase_cost', 'package_weight', 'raw_product_weight',
        'finished_product_weight', 'net_content_value', 'tax_percent'].forEach(k => {
        payload[k] = payload[k] === '' ? null : Number(payload[k]) || null;
      });
      if (initialData?.id) await skuApi.update(initialData.id, payload);
      else await skuApi.create(payload);
      savedSnapshot.current = { ...form };
      onSaved();
    } catch (err) {
      alert(`Save failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); saveForm(); };
  const isEdit = Boolean(initialData?.id);
  const title = isEdit ? 'Edit Product' : 'Add New Product';
  const tabsWithErrors = getTabsWithErrors(errors);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm animate-[fade-in_0.2s_ease]"
        onClick={handleClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-2xl bg-[var(--color-card)] border-l border-[var(--color-border)] shadow-2xl animate-[slide-in-from-right_0.3s_cubic-bezier(0.4,0,0.2,1)]">

        {/* ── Unsaved-changes dialog ────────────────────────────── */}
        {confirmClose && (
          <div className="absolute inset-0 z-60 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm rounded-none">
            <div className="bg-[var(--color-card)] rounded-2xl shadow-xl border border-[var(--color-border)] p-6 w-80 flex flex-col gap-4">
              <div>
                <p className="font-semibold text-[var(--color-foreground)] text-base">Unsaved changes</p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">You have changes that haven't been saved yet.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleDiscard}>Discard</Button>
                <Button size="sm" disabled={saving} onClick={() => saveForm({ fromDialog: true })}>
                  {saving ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] flex-shrink-0 bg-[var(--color-card)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <X size={18} />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-foreground)] leading-tight">{title}</h2>
              {isEdit && <span className="text-xs text-[var(--color-muted-foreground)] font-mono">{initialData.sku_code}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notes toggle */}
            <button
              type="button"
              onClick={() => setNotesOpen(o => !o)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                notesOpen
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "text-[var(--color-muted-foreground)] border-[var(--color-border)] hover:bg-[var(--color-muted)]",
                form.remark && !notesOpen && "border-amber-300 text-amber-600 bg-amber-50/60"
              )}
              title={notesOpen ? 'Close notes' : 'Internal notes'}
            >
              <StickyNote size={13} />
              <span>Notes</span>
              {form.remark && !notesOpen && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              )}
            </button>

            <Button variant="secondary" size="sm" onClick={handleClose} disabled={saving}>Cancel</Button>
            <Button
              size="sm"
              type="submit"
              form="skuForm"
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Product'}</>
              )}
            </Button>
          </div>
        </div>

        {/* ── Notes panel ─────────────────────────────────────── */}
        {notesOpen && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex-shrink-0">
            <p className="text-[11px] font-semibold text-amber-700 mb-1.5 uppercase tracking-wide">Internal Notes</p>
            <AutoTextarea
              name="remark"
              value={form.remark}
              onChange={handleChange}
              placeholder="QC flags, artwork status, launch remarks…"
              rows={2}
              className="bg-white border-amber-200 focus:ring-amber-400/30 text-amber-900 placeholder:text-amber-400"
            />
          </div>
        )}

        {/* ── Tab bar ─────────────────────────────────────────── */}
        <div className="flex items-center gap-0 border-b border-[var(--color-border)] px-2 flex-shrink-0 overflow-x-auto">
          {TABS.map(t => {
            const hasErr = tabsWithErrors.has(t.id);
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-3 text-xs font-medium whitespace-nowrap relative transition-colors",
                  isActive
                    ? "text-[var(--color-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--color-primary)] after:rounded-t"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                  hasErr && "text-red-500"
                )}
              >
                <t.icon size={13} />
                {t.label}
                {hasErr && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Scrollable body ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <form id="skuForm" onSubmit={handleSubmit} noValidate>
            <div className="p-5 flex flex-col gap-5">

              {/* IDENTITY */}
              {activeTab === 'identity' && (
                <>
                  <ImageBlock value={form.primary_image_url} onChange={(val) => set('primary_image_url', val)} />

                  <Field label="Product Name" required error={errors.product_name}>
                    <input type="text" name="product_name" value={form.product_name} onChange={handleChange}
                      className={inputCls(errors.product_name)}
                      placeholder="e.g. Bloomerce Rose Petal Face Wash" />
                  </Field>

                  <FieldRow>
                    <Field label="SKU Code" required error={errors.sku_code}>
                      <input type="text" name="sku_code" value={form.sku_code} onChange={handleChange}
                        className={cn(inputCls(errors.sku_code), "font-mono")}
                        placeholder="e.g. BL-RFW-001" />
                    </Field>
                    <Field label="Barcode / EAN">
                      <input type="text" name="barcode" value={form.barcode} onChange={handleChange}
                        className={cn(inputCls(false), "font-mono")}
                        placeholder="e.g. 8901234567891" />
                    </Field>
                  </FieldRow>

                  <FieldRow>
                    <Field label="Brand">
                      <DynamicReferenceSelect label="" referenceType="BRAND" value={form.brand_reference_id}
                        onChange={(v) => set('brand_reference_id', v)} placeholder="Select or add brand…" />
                    </Field>
                    <Field label="Component Group Code" hint="For bundle / kit tracking">
                      <input type="text" name="product_component_group_code" value={form.product_component_group_code}
                        onChange={handleChange} className={cn(inputCls(false), "font-mono")} placeholder="e.g. GRP-001" />
                    </Field>
                  </FieldRow>
                </>
              )}

              {/* CLASSIFICATION */}
              {activeTab === 'classification' && (
                <>
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
                </>
              )}

              {/* CONTENT */}
              {activeTab === 'content' && (
                <>
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
                      className={inputCls(false)} placeholder="rose face wash, sulphate free" />
                  </Field>
                  <Field label="Catalog / Product Page URL">
                    <input type="url" name="catalog_url" value={form.catalog_url} onChange={handleChange}
                      className={inputCls(false)} placeholder="https://example.com/product-page" />
                  </Field>
                </>
              )}

              {/* PRICING & SPECS */}
              {activeTab === 'pricing' && (
                <>
                  <FieldRow>
                    <Field label="MRP (₹)" hint="Maximum Retail Price">
                      <input type="number" name="mrp" value={form.mrp} onChange={handleChange}
                        className={inputCls(false)} placeholder="499.00" min="0" step="0.01" />
                    </Field>
                    <Field label="Purchase Cost (₹)">
                      <input type="number" name="purchase_cost" value={form.purchase_cost} onChange={handleChange}
                        className={inputCls(false)} placeholder="148.00" min="0" step="0.01" />
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Net Content Value">
                      <input type="number" name="net_content_value" value={form.net_content_value} onChange={handleChange}
                        className={inputCls(false)} placeholder="100" min="0" step="0.01" />
                    </Field>
                    <Field label="Net Content Unit">
                      <input type="text" name="net_content_unit" value={form.net_content_unit} onChange={handleChange}
                        className={inputCls(false)} placeholder="ml / g / pcs" />
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Color / Shade">
                      <input type="text" name="color" value={form.color} onChange={handleChange}
                        className={inputCls(false)} placeholder="e.g. Rose Pink" />
                    </Field>
                    <Field label="Raw Product Size">
                      <input type="text" name="raw_product_size" value={form.raw_product_size} onChange={handleChange}
                        className={inputCls(false)} placeholder="e.g. 15x5x5 cm" />
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Package Size">
                      <input type="text" name="package_size" value={form.package_size} onChange={handleChange}
                        className={inputCls(false)} placeholder="e.g. 16x6x6 cm" />
                    </Field>
                    <Field label="Package Weight (g)">
                      <input type="number" name="package_weight" value={form.package_weight} onChange={handleChange}
                        className={inputCls(false)} placeholder="25" min="0" step="0.01" />
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Raw Product Weight (g)">
                      <input type="number" name="raw_product_weight" value={form.raw_product_weight} onChange={handleChange}
                        className={inputCls(false)} placeholder="100" min="0" step="0.01" />
                    </Field>
                    <Field label="Finished Product Weight (g)">
                      <input type="number" name="finished_product_weight" value={form.finished_product_weight} onChange={handleChange}
                        className={inputCls(false)} placeholder="125" min="0" step="0.01" />
                    </Field>
                  </FieldRow>
                </>
              )}

              {/* PRODUCT & BUNDLE */}
              {activeTab === 'bundling' && (
                <>
                  <FieldRow>
                    <Field label="Product Type" hint="e.g. Standalone, Combo">
                      <input type="text" name="product_type" value={form.product_type} onChange={handleChange}
                        className={inputCls(false)} placeholder="Standalone" />
                    </Field>
                    <Field label="Bundle Type" hint="e.g. Kit, Gift Set">
                      <input type="text" name="bundle_type" value={form.bundle_type} onChange={handleChange}
                        className={inputCls(false)} placeholder="Kit" />
                    </Field>
                  </FieldRow>
                  <Field label="Pack Type" hint="e.g. Box, Tube, Pouch, Bottle">
                    <input type="text" name="pack_type" value={form.pack_type} onChange={handleChange}
                      className={inputCls(false)} placeholder="Bottle" />
                  </Field>
                </>
              )}

              {/* TAX & COMPLIANCE */}
              {activeTab === 'tax' && (
                <FieldRow>
                  <Field label="Tax Rule Code" hint="e.g. GST_18, GST_12">
                    <input type="text" name="tax_rule_code" value={form.tax_rule_code} onChange={handleChange}
                      className={cn(inputCls(false), "font-mono")} placeholder="GST_18" />
                  </Field>
                  <Field label="Tax %">
                    <input type="number" name="tax_percent" value={form.tax_percent} onChange={handleChange}
                      className={inputCls(false)} placeholder="18" min="0" max="100" step="0.1" />
                  </Field>
                </FieldRow>
              )}

            </div>
          </form>
        </div>

        {/* ── Sticky footer ────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-muted)] flex-shrink-0">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {isDirty ? (
              <span className="text-amber-600 font-medium">● Unsaved changes</span>
            ) : (
              <span className="text-[var(--color-muted-foreground)]">All changes saved</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={saving}>Cancel</Button>
            <Button size="sm" type="submit" form="skuForm" disabled={saving}>
              {saving ? (
                <><span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving…</>
              ) : (
                <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Product'}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
