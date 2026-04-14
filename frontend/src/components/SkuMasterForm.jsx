import React, { useState, useEffect, useRef, useMemo } from 'react';
import DynamicReferenceSelect from './DynamicReferenceSelect';
import { skuApi, uploadApi, refApi } from '../api';
import { Button } from '@/components/ui/button';
import { cn, getDirectImageUrl } from '@/lib/utils';
import {
  X, Save, UploadCloud, RefreshCw, Trash2, Link, ArrowLeft,
  Package, Tag, FileText, BarChart2, Layers, Info, StickyNote,
  AlertCircle, FolderPlus, ExternalLink, BookmarkCheck, Check
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

      <div className="relative group rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-muted)]/10 transition-all hover:bg-[var(--color-muted)]/20 min-h-[120px] flex flex-col">
        {!isAddingOrReplacing ? (
          <div className="relative h-48 bg-[var(--color-card)] flex items-center justify-center p-4">
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
            <div className="hidden absolute inset-0 flex flex-col items-center justify-center text-red-500/80 gap-2">
              <AlertCircle size={24} />
              <span className="text-[10px] uppercase font-bold tracking-wider">Invalid Image URL</span>
            </div>

            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3 backdrop-blur-[2px]">
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
                 className="absolute top-4 left-4 p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)] transition-colors shadow-sm bg-[var(--color-card)]/50 border border-[var(--color-border)]"
                 title="Back to Preview"
               >
                 <ArrowLeft size={14} />
               </button>
             )}

              <div
                className={cn(
                  "w-full md:w-1/3 aspect-square max-w-[140px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/10 cursor-not-allowed opacity-50 grayscale transition-all relative overflow-hidden group/disabled"
                )}
              >
                  <UploadCloud size={32} className="text-[var(--color-muted-foreground)]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Upload</span>
                  {/* Status Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 dark:bg-slate-950/20 backdrop-blur-[1px]">
                    <span className="bg-[var(--color-card)] text-[var(--color-foreground)] text-[8px] font-black px-2 py-0.5 rounded shadow-sm border border-[var(--color-border)] uppercase tracking-tighter">Disabled</span>
                  </div>
              </div>

              <div className="flex-1 w-full space-y-3">
                 <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--color-foreground)]">Google Drive Image URL</span>
                      <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-tight bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">Cloud Active</span>
                    </div>
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
                         placeholder="Paste Google Drive image link here..."
                         className="w-full h-11 pl-10 pr-4 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all placeholder:text-[var(--color-muted-foreground)]/40 shadow-sm"
                       />
                    </div>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] leading-relaxed italic opacity-70">
                      Paste your Google Drive link above. We'll automatically convert it into a direct stream. 
                      <span className="text-[var(--color-primary)] font-bold ml-1">Note: Ensure the file is shared as "Anyone with the link".</span>
                    </p>
                 </div>
              </div>
           </div>
        )}
        {uploading && (
           <div className="absolute inset-0 bg-[var(--color-card)]/40 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="flex items-center gap-3 bg-[var(--color-card)] px-5 py-2.5 rounded-full shadow-lg border border-[var(--color-border)]">
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
    <div className={cn("grid gap-4", cols === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
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
  identity:       ['product_name', 'sku_code', 'brand_reference_id', 'product_component_group_code', 'primary_image_url'],
  content:        ['description', 'key_feature', 'key_ingredients', 'ingredients', 'how_to_use', 'product_care', 'caution', 'seo_keywords', 'catalog_url'],
  classification: ['category_reference_id', 'sub_category_reference_id', 'status_reference_id'],
  pricing:        ['mrp', 'purchase_cost', 'net_quantity', 'net_quantity_unit_reference_id', 'size_reference_id', 'color', 'raw_product_size', 'package_size', 'package_weight', 'raw_product_weight', 'finished_product_weight'],
  bundling:       ['bundle_type', 'pack_type'],
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
  net_quantity: '', net_quantity_unit_reference_id: null, size_reference_id: null,
  bundle_type: null, pack_type: null,
  tax_rule_code: '', tax_percent: '',
};

// ─── Shared input className ───────────────────────────────────────
const inputCls = (hasError) => cn(
  "w-full rounded-lg border bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all",
  hasError ? "border-red-400 focus:ring-red-400/30" : "border-[var(--color-border)]"
);

const sanitizeFolderName = (name) => {
  if (name == null) return "";
  // Ensure we're working with a string to avoid .trim() crashes on numbers
  return String(name).trim().toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_");
};

// ─── Persistence Helpers ──────────────────────────────────────────
const getDraftKey = (id) => id ? `bloomerce_sku_edit_draft_${id}` : `bloomerce_sku_add_draft`;

// ─── Main Form ────────────────────────────────────────────────────
export default function SkuMasterForm({ initialData, statusOptions, onClose, onSaved }) {
  const isEdit = Boolean(initialData?.id);
  const [form, setForm] = useState(() => {
    const draftKey = getDraftKey(initialData?.id);
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Ensure the draft matches the current initialData (for Edit mode)
        // If editing, we want to make sure we're not using a draft from a different product
        // (the ID in the key handles this, but we're being extra safe)
        return { ...EMPTY, ...parsed };
      } catch (e) {
        console.error("Failed to parse draft:", e);
      }
    }

    if (!initialData) {
      // Set default status to "Draft" if available
      const draftStatus = (statusOptions || []).find(s => s.label.toLowerCase() === 'draft');
      return {
        ...EMPTY,
        status_reference_id: draftStatus ? draftStatus.id : EMPTY.status_reference_id
      };
    }
    const merged = { ...EMPTY };
    for (const key of Object.keys(EMPTY)) {
      const v = initialData[key];
      merged[key] = v != null ? v : EMPTY[key];
    }
    return merged;
  });

  // Sync draft to localStorage
  useEffect(() => {
    const draftKey = getDraftKey(initialData?.id);
    // We only save if the form is "dirty" compared to initial state (or it's a new product)
    localStorage.setItem(draftKey, JSON.stringify(form));
  }, [form, initialData?.id]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('identity');
  const [notesOpen, setNotesOpen] = useState(() => Boolean(initialData?.remark));
  const [confirmClose, setConfirmClose] = useState(false);
  const [generatingUrl, setGeneratingUrl] = useState(false);
  const [showDrivePreview, setShowDrivePreview] = useState(false);
  const [driveDraft, setDriveDraft] = useState({
    brand_name: '',
    category_name: '',
    sub_category_name: '',
    sku_code: ''
  });

  const handleRegenerateClick = async (e) => {
    e?.stopPropagation();
    if (window.confirm("This will move the current Google Drive folder to trash and generate a new one based on current data. Are you sure?")) {
      try {
        console.log("Drive Flow: Regenerate requested", { sku: form.sku_code });
        setGeneratingUrl(true);
        // 1. Trash the old one on the server
        if (initialData?.id && form.catalog_url) {
          await skuApi.trashCatalogFolder(initialData.id);
        }
        // 2. Clear current URL in form
        set('catalog_url', '');
        // 3. Open preview to let user see/tweak the new path
        setShowDrivePreview(true);
      } catch (err) {
        console.error("Drive Flow Error (Regenerate):", err);
        alert("Failed to trash folder: " + (err.response?.data?.detail || err.message));
      } finally {
        setGeneratingUrl(false);
      }
    }
  };

  // Pre-populate driveDraft labels when editing existing product
  useEffect(() => {
    if (initialData?.id) {
      // Fetch labels for current references
      const fetchLabels = async () => {
        try {
          const promises = [];

          if (initialData.brand_reference_id) {
            promises.push(refApi.getAll('BRAND').then(list => {
              const found = list.find(r => r.id === initialData.brand_reference_id);
              if (found) setDriveDraft(d => ({ ...d, brand_name: sanitizeFolderName(found.label) }));
            }));
          }

          if (initialData.category_reference_id) {
            promises.push(refApi.getAll('CATEGORY').then(list => {
              const found = list.find(r => r.id === initialData.category_reference_id);
              if (found) setDriveDraft(d => ({ ...d, category_name: sanitizeFolderName(found.label) }));
            }));
          }

          if (initialData.sub_category_reference_id) {
            promises.push(refApi.getAll('SUB_CATEGORY').then(list => {
              const found = list.find(r => r.id === initialData.sub_category_reference_id);
              if (found) setDriveDraft(d => ({ ...d, sub_category_name: sanitizeFolderName(found.label) }));
            }));
          }

          setDriveDraft(d => ({ ...d, sku_code: initialData.sku_code || '' }));
          await Promise.all(promises);
        } catch (err) {
          console.error("Failed to pre-fetch drive labels:", err);
        }
      };
      fetchLabels();
    } else {
      // For new products, just sync SKU code
      setDriveDraft(d => ({ ...d, sku_code: form.sku_code || '' }));
    }
  }, [initialData?.id]);

  const preparePayload = (formData) => {
    const payload = { ...formData };
    ['mrp', 'purchase_cost', 'package_weight', 'raw_product_weight',
      'net_quantity', 'tax_percent',
      'brand_reference_id', 'category_reference_id', 'sub_category_reference_id',
      'status_reference_id', 'net_quantity_unit_reference_id', 'size_reference_id'
    ].forEach(k => {
      const raw = payload[k];
      if (raw === "" || raw === undefined || raw === null) {
        payload[k] = null;
      } else {
        const isNumeric = ['mrp', 'purchase_cost', 'package_weight', 'raw_product_weight', 'net_quantity', 'tax_percent'].includes(k);
        const num = Number(raw);
        payload[k] = isNumeric ? (isNaN(num) ? null : num) : (isNaN(num) ? raw : num);
      }
    });
    // Remove derived/legacy fields from payload
    delete payload.finished_product_weight;
    // Force SKU and Barcode to be identical as per user instructions
    payload.barcode = payload.sku_code;
    return payload;
  };

  const handleGenerateDriveFolder = async (e) => {
    e?.stopPropagation();

    if (!showDrivePreview) {
      console.log("Drive Flow: Opening preview panel", {
        sku: form.sku_code,
        draft: driveDraft
      });

      // Initialize driveDraft labels from the form values
      setDriveDraft(prev => ({
        ...prev,
        sku_code: sanitizeFolderName(form.sku_code) || ''
      }));
      setShowDrivePreview(true);
      return;
    }

    console.log("Drive Flow: Requesting folder creation", driveDraft);
    setGeneratingUrl(true);
    try {
      const res = await skuApi.generateCatalogUrlPreview(driveDraft);
      console.log("Drive Flow: Received response", res);

      if (!res || !res.catalog_url) {
        throw new Error("Backend failed to return a valid Catalog URL.");
      }

      const updatedUrl = res.catalog_url;
      set('catalog_url', updatedUrl);
      setShowDrivePreview(false);
      
      // We no longer auto-save and close the form here.
      // This allows the user to continue editing other fields before clicking the main "Save" button.

    } catch (err) {
      console.error("Drive Flow Error (Create):", err);
      const msg = err.response?.data?.detail || err.message || "Unknown error";
      alert(`Failed to create Google Drive folder: ${msg}`);
    } finally {
      setGeneratingUrl(false);
    }
  };

  const savedSnapshot = useRef((() => {
    const base = { ...EMPTY };
    if (initialData) {
      for (const k of Object.keys(EMPTY)) {
        const v = initialData[k];
        base[k] = v != null ? v : EMPTY[k];
      }
    } else {
      // Default to 'Draft' status for new products
      const draftStatus = (statusOptions || []).find(s => s.label.toLowerCase() === 'draft');
      if (draftStatus) {
        base.status_reference_id = draftStatus.id;
      }
    }
    return base;
  })());

  const isDirty = useMemo(() => {
    return Object.keys(EMPTY).some(k => {
      let a = form[k];
      let b = savedSnapshot.current[k];
      
      // Normalize values for comparison
      const normalize = (val) => {
        if (val === '' || val === null || val === undefined) return null;
        // Optimization: ensure numeric fields are compared strictly as strings to avoid scale issues (e.g. 499 vs 499.0)
        return String(val).trim();
      };
      
      return normalize(a) !== normalize(b);
    });
  }, [form]);

  const handleClose = () => {
    if (!isEdit) {
      // For NEW products: silently keep the draft and close — no popup needed
      // The next time they open Add Product, the draft will be restored
      onClose();
      return;
    }
    // For EDIT: only show dialog if there are unsaved changes
    if (isDirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  // Keep draft & close: closes without saving but retains localStorage draft for later
  const handleKeepDraft = () => {
    setConfirmClose(false);
    onClose();
  };

  // Discard: clears localStorage draft and reverts form
  const handleDiscard = () => {
    localStorage.removeItem(getDraftKey(initialData?.id));
    setConfirmClose(false);
    onClose();
  };
  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(p => {
      const next = { ...p, [name]: value };
      // Mirror SKU code → barcode (single input writes to both DB columns)
      if (name === 'sku_code') {
        next.barcode = value;
      }
      if (name === 'package_weight' || name === 'raw_product_weight') {
        const pWeight = parseFloat(next.package_weight) || 0;
        const rWeight = parseFloat(next.raw_product_weight) || 0;
        next.finished_product_weight = (pWeight > 0 || rWeight > 0) ? Math.round(pWeight + rWeight).toString() : '';
      }
      return next;
    });

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
      const payload = preparePayload(form);

      if (initialData?.id) await skuApi.update(initialData.id, payload);
      else await skuApi.create(payload);

      // Clear draft on success
      localStorage.removeItem(getDraftKey(initialData?.id));

      savedSnapshot.current = { ...form };
      onSaved();
    } catch (err) {
      alert(`Save failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); saveForm(); };
  const title = isEdit ? 'Edit Product' : 'Add New Product';
  const tabsWithErrors = getTabsWithErrors(errors);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm animate-[fade-in_0.2s_ease]"
        onClick={handleClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 z-[100] flex flex-col w-full md:max-w-2xl bg-[var(--color-card)] border-l border-[var(--color-border)] shadow-2xl animate-[slide-in-from-right_0.3s_cubic-bezier(0.4,0,0.2,1)]">

        {/* ── Unsaved-changes dialog (Edit mode only) ───────────── */}
        {confirmClose && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm rounded-none">
            <div className="bg-[var(--color-card)] rounded-2xl shadow-xl border border-[var(--color-border)] p-6 w-[340px] flex flex-col gap-5">
              <div>
                <p className="font-semibold text-[var(--color-foreground)] text-base">Unsaved changes</p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">You have changes that haven't been saved to the database. What would you like to do?</p>
              </div>
              <div className="flex flex-col gap-2">
                {/* Option 1: Save & Close */}
                <Button size="sm" disabled={saving} onClick={() => saveForm({ fromDialog: true })} className="w-full justify-start gap-2 h-10">
                  {saving ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save size={14} />}
                  <span>Save &amp; Close</span>
                </Button>
                {/* Option 2: Keep draft */}
                <Button variant="outline" size="sm" onClick={handleKeepDraft} className="w-full justify-start gap-2 h-12">
                  <BookmarkCheck size={14} className="text-amber-500" />
                  <span className="text-left leading-none">Keep changes, close for now
                    <span className="block text-[10px] text-[var(--color-muted-foreground)] font-normal mt-1">You can return to this product later.</span>
                  </span>
                </Button>
                {/* Option 3: Discard */}
                <Button variant="ghost" size="sm" onClick={handleDiscard} className="w-full justify-start gap-2 h-10 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                  <Trash2 size={14} />
                  <span>Discard all changes</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col border-b border-[var(--color-border)] flex-shrink-0 bg-[var(--color-card)]">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 w-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors shrink-0"
                title="Close"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shadow-inner shrink-0">
                   <BookmarkCheck size={18} className="sm:size-5" />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h2 className="text-sm sm:text-base font-bold text-[var(--color-foreground)] leading-tight truncate">{title}</h2>
                  <p className="text-[9px] sm:text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-widest truncate">Catalog Resource Entry</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setNotesOpen(!notesOpen)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  notesOpen ? "bg-amber-100 text-amber-700" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
                )}
                title="Internal Notes"
              >
                <StickyNote size={18} />
              </button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="h-9 gap-1.5 sm:gap-2 shrink-0 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white transition-all font-bold px-3 sm:px-4 shadow-lg shadow-[var(--color-primary)]/20"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <><Save size={14} className="sm:size-4" /><span className="hidden sm:inline">{isEdit ? 'Save Changes' : 'Create Product'}</span><span className="sm:hidden text-xs">Save</span></>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Notes panel ─────────────────────────────────────── */}
        {notesOpen && (
          <div className="px-5 py-3 bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/20 flex-shrink-0 animate-[fade-in_0.2s_ease]">
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1.5 uppercase tracking-wider">Internal Operational Notes</p>
            <AutoTextarea
              name="remark"
              value={form.remark}
              onChange={handleChange}
              placeholder="QC flags, artwork status, launch remarks…"
              rows={2}
              className="bg-[var(--color-card)] border-amber-500/20 focus:ring-amber-500/30 text-amber-900 dark:text-amber-100 placeholder:text-amber-500/40"
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

                  <Field label="SKU / EAN / Barcode ID" required error={errors.sku_code} hint="Saved as both SKU Code and Barcode/EAN in the database">
                    <input type="text" name="sku_code" value={form.sku_code} onChange={handleChange}
                      className={cn(inputCls(errors.sku_code), "font-mono")}
                      placeholder="e.g. BL-RFW-001 or 8901234567891" />
                  </Field>

                  <FieldRow>
                    <Field label="Brand">
                      <DynamicReferenceSelect label="" referenceType="BRAND" value={form.brand_reference_id}
                        onChange={(id, label) => {
                          set('brand_reference_id', id);
                          setDriveDraft(prev => ({ ...prev, brand_name: sanitizeFolderName(label) }));
                        }} placeholder="Select or add brand…" />
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
                        onChange={(id, label) => {
                          const hasChanged = id !== form.category_reference_id;
                          set('category_reference_id', id);
                          if (hasChanged) {
                            set('sub_category_reference_id', null);
                            setDriveDraft(prev => ({ ...prev, category_name: sanitizeFolderName(label), sub_category_name: '' }));
                          } else {
                            setDriveDraft(prev => ({ ...prev, category_name: sanitizeFolderName(label) }));
                          }
                        }} placeholder="Select or add category…" />
                    </Field>
                    <Field label="Sub-Category">
                      <DynamicReferenceSelect label="" referenceType="SUB_CATEGORY" value={form.sub_category_reference_id}
                        parentId={form.category_reference_id}
                        onChange={(id, label) => {
                          set('sub_category_reference_id', id);
                          setDriveDraft(prev => ({ ...prev, sub_category_name: sanitizeFolderName(label) }));
                        }} placeholder="Select or add sub-category…" />
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
                  <Field label="Catalog / Product Page URL">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 group min-h-[40px]">
                        {!showDrivePreview ? (
                          <>
                            <input
                              type="url"
                              name="catalog_url"
                              value={form.catalog_url}
                              onChange={handleChange}
                              className={cn(inputCls(false), "w-full sm:grow font-mono text-[11px] h-10")}
                              placeholder="https://drive.google.com/..."
                            />

                            <div className="flex items-center gap-1.5 w-full sm:w-auto">
                              {form.catalog_url ? (
                                <>
                                  <a
                                    href={form.catalog_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex flex-1 sm:flex-none items-center justify-center w-auto sm:w-10 h-10 px-4 sm:px-0 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 active:scale-95 transition-all shrink-0 shadow-sm gap-2"
                                    title="Open Drive Link"
                                  >
                                    <ExternalLink size={15} />
                                    <span className="sm:hidden text-xs font-bold uppercase tracking-wider">Open</span>
                                  </a>

                                  <button
                                    type="button"
                                    onClick={handleRegenerateClick}
                                    disabled={generatingUrl}
                                    className="flex flex-1 sm:flex-none items-center justify-center w-auto sm:w-10 h-10 px-4 sm:px-0 rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 active:scale-95 transition-all shrink-0 gap-2"
                                    title="Re-generate Google Drive Folder"
                                  >
                                    <RefreshCw size={15} className={generatingUrl ? "animate-spin" : ""} />
                                    <span className="sm:hidden text-xs font-bold uppercase tracking-wider">Reset</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleGenerateDriveFolder}
                                  disabled={generatingUrl || !form.sku_code || !form.brand_reference_id || !form.category_reference_id || !form.sub_category_reference_id}
                                  className={cn(
                                    "flex flex-1 sm:flex-none items-center justify-center gap-2 px-6 sm:px-4 h-10 rounded-xl text-xs font-bold transition-all border shrink-0 shadow-sm w-full sm:w-auto",
                                    (generatingUrl || !form.sku_code || !form.brand_reference_id || !form.category_reference_id || !form.sub_category_reference_id)
                                      ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                      : "bg-white border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 active:scale-95"
                                  )}
                                >
                                  <FolderPlus size={15} />
                                  Preview Path
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="grow flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-1.5 p-3 sm:p-0 sm:px-3 sm:py-1 rounded-2xl sm:rounded-xl bg-amber-50/50 border border-amber-200 shadow-sm animate-in slide-in-from-right-2 duration-300 h-auto sm:h-11">
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-1 grow min-w-0">
                               <div className="flex flex-col gap-1 sm:contents">
                                <span className="sm:hidden text-[9px] font-bold text-amber-600 uppercase tracking-tighter ml-1 opacity-70">Brand</span>
                                <input
                                  className="min-w-0 flex-1 bg-white/90 hover:bg-white border border-transparent focus:border-amber-300 rounded-lg sm:rounded-md px-2.5 py-1.5 sm:py-1 outline-none transition-all text-slate-600 text-[11px] truncate shadow-sm sm:shadow-none"
                                  value={driveDraft.brand_name}
                                  onChange={(e) => setDriveDraft(prev => ({ ...prev, brand_name: sanitizeFolderName(e.target.value) }))}
                                  placeholder="brand"
                                />
                              </div>

                              <span className="hidden sm:inline text-amber-300 shrink-0 select-none">/</span>

                              <div className="flex flex-col gap-1 sm:contents">
                                <span className="sm:hidden text-[9px] font-bold text-amber-600 uppercase tracking-tighter ml-1 opacity-70">Category</span>
                                <input
                                  className="min-w-0 flex-1 bg-white/90 hover:bg-white border border-transparent focus:border-amber-300 rounded-lg sm:rounded-md px-2.5 py-1.5 sm:py-1 outline-none transition-all text-slate-600 text-[11px] truncate shadow-sm sm:shadow-none"
                                  value={driveDraft.category_name}
                                  onChange={(e) => setDriveDraft(prev => ({ ...prev, category_name: sanitizeFolderName(e.target.value) }))}
                                  placeholder="category"
                                />
                              </div>

                              <span className="hidden sm:inline text-amber-300 shrink-0 select-none">/</span>

                              <div className="flex flex-col gap-1 sm:contents">
                                <span className="sm:hidden text-[9px] font-bold text-amber-600 uppercase tracking-tighter ml-1 opacity-70">Sub-Cat</span>
                                <input
                                  className="min-w-0 flex-1 bg-white/90 hover:bg-white border border-transparent focus:border-amber-300 rounded-lg sm:rounded-md px-2.5 py-1.5 sm:py-1 outline-none transition-all text-slate-600 text-[11px] truncate shadow-sm sm:shadow-none"
                                  value={driveDraft.sub_category_name}
                                  onChange={(e) => setDriveDraft(prev => ({ ...prev, sub_category_name: sanitizeFolderName(e.target.value) }))}
                                  placeholder="subcategory"
                                />
                              </div>

                              <span className="hidden sm:inline text-amber-300 shrink-0 select-none">/</span>

                              <div className="flex flex-col gap-1 sm:contents">
                                <span className="sm:hidden text-[9px] font-bold text-amber-600 uppercase tracking-tighter ml-1 opacity-70">SKU Code</span>
                                <input
                                  className="min-w-0 flex-1 bg-white font-bold border border-amber-200 focus:border-amber-400 rounded-lg sm:rounded-md px-2.5 py-1.5 sm:py-1 outline-none transition-all text-slate-900 text-[11px] truncate shadow-inner"
                                  value={driveDraft.sku_code}
                                  onChange={(e) => setDriveDraft(prev => ({ ...prev, sku_code: sanitizeFolderName(e.target.value) }))}
                                  placeholder="sku"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-1.5 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-amber-200 sm:pl-2">
                               <button
                                 type="button"
                                 onClick={handleGenerateDriveFolder}
                                 disabled={generatingUrl}
                                 className="flex grow sm:grow-0 items-center justify-center gap-2 sm:gap-0 px-4 sm:px-0 w-auto sm:w-8 h-10 sm:h-8 rounded-xl sm:rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all shadow-md shadow-amber-500/20"
                               >
                                 {generatingUrl ? <RefreshCw size={14} className="animate-spin" /> : <Check size={16} />}
                                 <span className="sm:hidden text-xs font-bold uppercase tracking-widest">Confirm & Create</span>
                               </button>
                               <button
                                 type="button"
                                 onClick={() => setShowDrivePreview(false)}
                                 className="flex items-center justify-center w-12 sm:w-8 h-10 sm:h-8 rounded-xl sm:rounded-lg bg-white border border-amber-200 text-amber-600 hover:bg-amber-100 active:scale-95 transition-all"
                               >
                                 <X size={16} />
                               </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {initialData?.id && isDirty && !form.catalog_url && !showDrivePreview && (
                        <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 ml-1 mt-1">
                          <AlertCircle size={10} /> Save product first
                        </p>
                      )}
                      {!initialData?.id && !form.catalog_url && !showDrivePreview && (!form.sku_code || !form.brand_reference_id || !form.category_reference_id || !form.sub_category_reference_id) && (
                        <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 ml-1 mt-1">
                          <AlertCircle size={10} /> Complete Identity first
                        </p>
                      )}
                    </div>
                  </Field>

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
                    <Field label="Net Quantity">
                      <input type="number" name="net_quantity" value={form.net_quantity} onChange={handleChange}
                        className={inputCls(false)} placeholder="100" min="0" step="0.01" />
                    </Field>
                    <Field label="Net Quantity Unit">
                       <DynamicReferenceSelect label="" referenceType="NET_QUANTITY_UNIT" value={form.net_quantity_unit_reference_id}
                        onChange={(v) => set('net_quantity_unit_reference_id', v)} placeholder="ml / g / pcs…" />
                    </Field>
                  </FieldRow>
                  <Field label="Size Specification">
                    <DynamicReferenceSelect label="" referenceType="SIZE" value={form.size_reference_id}
                      onChange={(v) => set('size_reference_id', v)} placeholder="Standard / Large / Custom Size…" />
                  </Field>
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
                    <Field label="Finished Product Weight (g)" hint="Auto-calculated (Raw + Package)">
                      <input type="number" name="finished_product_weight" value={form.finished_product_weight} readOnly
                        className={cn(inputCls(false), "bg-[var(--color-muted)]/50 cursor-not-allowed font-semibold")} placeholder="125" min="0" step="0.01" />
                    </Field>
                  </FieldRow>
                </>
              )}

              {/* PRODUCT & BUNDLE */}
              {activeTab === 'bundling' && (
                <FieldRow>
                  <Field label="Bundle Type">
                    <DynamicReferenceSelect label="" referenceType="BUNDLE_TYPE" value={form.bundle_type}
                      onChange={(v) => set('bundle_type', v)} placeholder="Single / Combo / Pack…" />
                  </Field>
                  <Field label="Pack Type">
                    <DynamicReferenceSelect label="" referenceType="PACK_TYPE" value={form.pack_type}
                      onChange={(v) => set('pack_type', v)} placeholder="Mono Carton / Glass Bottle…" />
                  </Field>
                </FieldRow>
              )}

              {/* TAX & COMPLIANCE */}
              {activeTab === 'tax' && (
                <FieldRow>
                  <Field label="Tax Rule Code (HSN)" error={errors.tax_rule_code}>
                    <input type="text" name="tax_rule_code" value={form.tax_rule_code} onChange={handleChange}
                      className={cn(inputCls(errors.tax_rule_code), "font-mono")} placeholder="HSN-8517" />
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
