import {
  Plus, Search, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown,
  ArrowUpDown, LayoutGrid, Rocket, FileEdit, Download, Upload,
  SquarePen, Check, X, Filter, Maximize2, Minimize2, StickyNote, Send, Trash2, RefreshCcw, ExternalLink,
  AlertCircle, Copy, Layers, Command, MoreVertical
} from 'lucide-react';


import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SkuMasterForm from './SkuMasterForm';
import InlineCellEditor from './InlineCellEditor';
import EmptyState from './EmptyState';
import ExportCenterSlideOver from './ExportCenterSlideOver';
import ImportSlideOver from './ImportSlideOver';
import TopFilterBar from './TopFilterBar';
import CopyButton from './CopyButton';

import { skuApi, refApi } from '../api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, getDirectImageUrl } from '@/lib/utils';

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_VARIANTS = { active:'success', inactive:'destructive', draft:'draft', development:'development', 'in development':'development' };
function StatusBadge({ label }) {
  const key = label?.toLowerCase();
  const display = (key === 'in development' || key === 'development') ? 'New Launch' : label;
  return <Badge variant={STATUS_VARIANTS[key] || 'secondary'}>{display || 'Unknown'}</Badge>;
}

// ── Base columns (always visible, rowSpan=2, pinned left) ─────────────────────
const BASE_COLS = [
  { id: 'actions',            label: '',         width: 82,  align: 'center', noInline: true, sticky: true, stickyLeft: 0 },
  { id: 'primary_image_url',  label: 'Image',    width: 76,  align: 'center', noInline: true, sticky: true, stickyLeft: 82 },
  { id: 'product_name',       label: 'Product',  width: 260, sortable: true,  sticky: true, stickyLeft: 158 },
  { id: 'barcode',            label: 'SKU / EAN / Barcode ID',  width: 140, isMono: true,    sticky: true, stickyLeft: 418 },
  { id: 'brand_reference_id', label: 'Brand',    width: 120, sortable: true,  sticky: true, stickyLeft: 558 },
];

const REMARKS_COL = { id: 'remark', label: 'Notes', width: 62, align: 'center', sticky: true, isRight: true };


// ── Column groups (collapsed → only first col shown) ──────────────────────────
const GROUPS = [
  {
    id: 'classification', label: 'Classification', color: 'violet',
    cols: [
      { id: 'status_reference_id',       label: 'Status',         width: 140 },
      { id: 'category_reference_id',     label: 'Category',       width: 180 },
      { id: 'sub_category_reference_id', label: 'Sub-Category',   width: 200 },
    ],
  },
  {
    id: 'pricing_specs', label: 'Pricing & Specs', color: 'emerald',
    cols: [
      { id: 'mrp',            label: 'MRP (₹)',  width: 85, align: 'right', sortable: true, isNum: true },
      { id: 'purchase_cost',  label: 'Cost (₹)', width: 85, align: 'right', isNum: true },
      { id: 'net_quantity',          label: 'Net Qty',  width: 90, align: 'right' },
      { id: 'net_quantity_unit_reference_id', label: 'Unit',  width: 100 },
      { id: 'size_reference_id',     label: 'Size Spec',    width: 110 },
      { id: 'color',                 label: 'Color',        width: 120 },
      { id: 'raw_product_size',      label: 'Raw Size',     width: 100 },
      { id: 'package_size',          label: 'Pack Size',    width: 100 },
      { id: 'package_weight',        label: 'Pack Wt (g)',  width: 95, align: 'right' },
      { id: 'raw_product_weight',    label: 'Raw Wt (g)',   width: 95, align: 'right' },
      { id: 'finished_product_weight', label: 'Fin Wt (g)', width: 95, align: 'right', noInline: true },
    ],
  },
  {
    id: 'bundling', label: 'Product & Bundle', color: 'amber',
    cols: [
      { id: 'bundle_type',                  label: 'Bundle Type',  width: 120 },
      { id: 'pack_type',                    label: 'Pack Type',    width: 115 },
      { id: 'product_component_group_code', label: 'Group Code',   width: 120, isMono: true },
    ],
  },
  {
     id: 'tax', label: 'Tax & Compliance', color: 'blue',
     cols: [
      { id: 'tax_percent',    label: 'Tax %',    width: 65,  align: 'right' },
      { id: 'tax_rule_code',  label: 'Tax Rule (HSN)', width: 105, isMono: true },
     ]
  },
  {
    id: 'content', label: 'Content', color: 'orange',
    cols: [
      { id: 'description',  label: 'Description',  width: 260, isContent: true },
      { id: 'key_feature',  label: 'Key Features', width: 260, isContent: true },
      { id: 'key_ingredients', label: 'Key Ingredients', width: 260, isContent: true },
      { id: 'ingredients',  label: 'Ingredients',  width: 260, isContent: true },
      { id: 'how_to_use',   label: 'How to Use',   width: 260, isContent: true },
      { id: 'product_care', label: 'Product Care', width: 260, isContent: true },
      { id: 'caution',      label: 'Caution',      width: 220, isContent: true },
      { id: 'seo_keywords', label: 'SEO Keywords', width: 200, isContent: true },
      { id: 'createdAt',    label: 'Published',    width: 140, sortable: true, noInline: true },
      { id: 'catalog_url',  label: 'Catalog URL',  width: 140, noInline: true },

    ],
  },
];

// ── Group colour tokens ───────────────────────────────────────────────────────
// ── Group colour tokens ───────────────────────────────────────────────────────
const GC = {
  violet:  {
    row1: 'bg-[var(--color-primary)]/5  text-[var(--color-primary)]  border-[var(--color-primary)]/20',
    row2: 'bg-[var(--color-primary)]/[0.03]',
    td: 'bg-[var(--color-primary)]/[0.01]',
    pill: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'
  },
  emerald: {
    row1: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    row2: 'bg-emerald-500/[0.03]',
    td: 'bg-emerald-500/[0.01]',
    pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
  },
  blue:    {
    row1: 'bg-blue-500/5    text-blue-600    border-blue-500/20    dark:text-blue-400',
    row2: 'bg-blue-500/[0.03]',
    td: 'bg-blue-500/[0.01]',
    pill: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
  },
  amber:   {
    row1: 'bg-amber-500/5   text-amber-600   border-amber-500/20   dark:text-amber-400',
    row2: 'bg-amber-500/[0.03]',
    td: 'bg-amber-500/[0.01]',
    pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
  },
  orange:  {
    row1: 'bg-orange-500/5  text-orange-600  border-orange-500/20  dark:text-orange-400',
    row2: 'bg-orange-500/[0.03]',
    td: 'bg-orange-500/[0.01]',
    pill: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20'
  },
};

// ── Skeleton Loaders ──────────────────────────────────────────────────────────
function TableRowSkeleton({ visibleCols }) {
  return (
    <tr className="border-b border-[var(--color-border)]">
      {visibleCols.map(col => (
        <td key={col.id} className="px-4 py-4" style={{ width: col.width }}>
           <div className={cn(
             "skeleton-box h-4",
             col.id === 'primary_image_url' ? "w-10 h-10 rounded-xl" : "w-2/3"
           )} />
        </td>
      ))}
    </tr>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 shadow-sm">
      <div className="flex gap-4 items-start mb-4">
        <div className="w-16 h-16 rounded-xl skeleton-box" />
        <div className="flex-1 space-y-2">
          <div className="h-4 skeleton-box w-3/4" />
          <div className="h-3 skeleton-box w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border)]">
        <div className="h-3 skeleton-box w-2/3" />
        <div className="h-3 skeleton-box w-1/2" />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const NON_INLINE = new Set(['primary_image_url', 'net_content', 'content_trigger', 'catalog_url', 'remark']);
const REF_MAP    = {
  brand_reference_id: 'BRAND',
  category_reference_id: 'CATEGORY',
  sub_category_reference_id: 'SUB_CATEGORY',
  status_reference_id: 'STATUS',
  bundle_type: 'BUNDLE_TYPE',
  pack_type: 'PACK_TYPE',
  net_quantity_unit_reference_id: 'NET_QUANTITY_UNIT',
  size_reference_id: 'SIZE',
  color: 'COLOR'
};
const FILTER_TABS = [
  { key: 'all',               icon: LayoutGrid, label: (c, t) => `All (${t})` },
  { key: 'archived',          icon: FileEdit,   label: c => `Archived (${c['archived'] || 0})` },
  { key: 'upcoming launches', icon: Rocket,     label: c => `Upcoming Launches (${c['upcoming launches'] || 0})` },
];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 80, 100];

// ── Note Popover Component (Portaled & Spacious) ─────────────────────────────
function NotePopover({ sku, onSave, onClose, onDraftChange }) {
  const [val, setVal] = useState(() => {
    const draft = localStorage.getItem(`bloomerce_note_draft_${sku.id}`);
    return draft !== null ? draft : (sku.remark || '');
  });
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
       textareaRef.current.focus();
       textareaRef.current.setSelectionRange(val.length, val.length);
    }
    onDraftChange(val);
  }, []);

  const handleChange = (newVal) => {
    setVal(newVal);
    onDraftChange(newVal);
    localStorage.setItem(`bloomerce_note_draft_${sku.id}`, newVal);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    await onSave(val);
    localStorage.removeItem(`bloomerce_note_draft_${sku.id}`);
    setSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop for focus */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        className="note-popover relative w-full max-w-[520px] bg-[var(--color-card)] rounded-3xl shadow-[0_30px_90px_var(--color-shadow)] border border-[var(--color-border)] overflow-hidden animate-[scale-in_0.2s_ease-out] text-left"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[var(--color-muted)]/50 px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
             <div className="w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
             <span className="text-[12px] font-black uppercase tracking-[0.15em] text-[var(--color-muted-foreground)]">Edit SKU Remark</span>
          </div>
          <div className="flex items-center gap-2">
            {val && (
              <button
                onClick={() => setVal('')}
                className="p-2 hover:bg-red-500/10 text-[var(--color-muted-foreground)] hover:text-red-500 rounded-full transition-all flex items-center gap-1.5"
                title="Clear content"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-[var(--color-muted)] rounded-full transition-colors group">
              <X size={18} className="text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-[var(--color-card)]">
          <textarea
            autoFocus
            ref={textareaRef}
            value={val}
            onChange={e => handleChange(e.target.value)}
            placeholder="Add internal product remarks or operational notes here..."
            className="w-full h-48 p-5 text-[14px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 focus:bg-[var(--color-card)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/5 focus:border-[var(--color-primary)] transition-all resize-none text-[var(--color-foreground)] leading-relaxed placeholder:opacity-40"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
              if (e.key === 'Escape') onClose();
            }}
          />

          <div className="flex items-center justify-between mt-6">
             <button
                onClick={onClose}
                className="text-[12px] font-bold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors px-2"
              >
                Discard Changes
              </button>

            <div className="flex items-center gap-4">
              <span className="text-[11px] text-[var(--color-muted-foreground)] font-bold italic hidden sm:block opacity-60">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to Save
              </span>
              <Button
                size="default"
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "h-11 px-7 rounded-2xl font-black text-[12px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl",
                  val !== (sku.remark || '')
                    ? "bg-[var(--color-primary)] text-white shadow-[var(--color-primary)]/30 scale-105 active:scale-95"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] shadow-none cursor-default"
                )}
              >
                {saving ? (
                   <RefreshCcw size={14} className="animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                <span>Save Remark</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


// ── SkuCard for Mobile View ────────────────────────────────────────────────
function SkuCard({ sku, references, onEdit, onNote }) {
  const brand = references.BRAND[sku.brand_reference_id] || '—';
  const statusLbl = references.STATUS[sku.status_reference_id];

  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-4">
        {/* thumbnail */}
        <div className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--color-border)] flex-shrink-0 bg-[var(--color-muted)]">
          {sku.primary_image_url ? (
            <img src={sku.primary_image_url} alt="product" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-muted-foreground)]">
              <ImageIcon size={20} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-[14px] text-[var(--color-foreground)] leading-tight line-clamp-2">{sku.product_name}</h3>
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-[var(--color-sidebar-accent)] text-[var(--color-muted-foreground)] transition-colors">
              <SquarePen size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[11px] font-mono text-[var(--color-muted-foreground)]">{sku.sku_code || sku.barcode || 'NO SKU CODE'}</p>
            <CopyButton value={sku.sku_code || sku.barcode} className="h-5 w-5 opacity-70" iconSize={10} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-bold text-[var(--color-primary)]/80 uppercase tracking-tighter">{brand}</span>
            <div className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
            <span className="text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-tighter">₹{Number(sku.mrp || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[var(--color-border)] opacity-50 my-1" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           {statusLbl && <StatusBadge label={statusLbl} />}
        </div>
        <button
          onClick={onNote}
          className="note-trigger flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors active:scale-95"
        >
          <StickyNote size={13} />
          <span>{sku.remark ? 'View Note' : 'Add Note'}</span>
        </button>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MasterTab({ isMobile }) {
  const [skus,           setSkus]           = useState([]);
  const [references,     setReferences]     = useState({ BRAND:{}, CATEGORY:{}, STATUS:{}, SUB_CATEGORY:{}, BUNDLE_TYPE:{}, PACK_TYPE:{}, NET_QUANTITY_UNIT:{}, SIZE:{}, COLOR:{} });
  const [refLists,       setRefLists]       = useState({ BRAND:[], CATEGORY:[], STATUS:[], SUB_CATEGORY:[], BUNDLE_TYPE:[], PACK_TYPE:[], NET_QUANTITY_UNIT:[], SIZE:[], COLOR:[] });
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [sortCol,        setSortCol]        = useState('product_name');
  const [sortDir,        setSortDir]        = useState('asc');
  const [page,           setPage]           = useState(1);
  const [pageSize,       setPageSize]       = useState(80);
  const [isFormOpen,     setIsFormOpen]     = useState(false);
  const [isExportCenterOpen, setIsExportCenterOpen] = useState(false);
  const [isImportOpen,   setIsImportOpen]   = useState(false);
  const [isFilterOpen,   setIsFilterOpen]   = useState(false);

  // Advanced Filtering State
  const initialFilters = {
    brandIds: [],
    categoryIds: [],
    subCategoryIds: [],
    statusIds: [],
    minPrice: '',
    maxPrice: '',
    hasImage: null,
    hasNotes: null,
  };
  const [filters, setFilters] = useState(initialFilters);
  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.brandIds?.length) count += filters.brandIds.length;
    if (filters.categoryIds?.length) count += filters.categoryIds.length;
    if (filters.subCategoryIds?.length) count += filters.subCategoryIds.length;
    if (filters.statusIds?.length) count += filters.statusIds.length;
    if (filters.minPrice !== '') count += 1;
    if (filters.maxPrice !== '') count += 1;
    if (filters.hasImage !== null) count += 1;
    if (filters.hasNotes !== null) count += 1;
    return count;
  }, [filters]);

  const isFilterActive = activeAdvancedFiltersCount > 0;

  const [editingSku,     setEditingSku]     = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [inlineEdit,     setInlineEdit]     = useState(null); // { skuId, colId }
  const [selectedCell,   setSelectedCell]   = useState(null); // { skuId, colId }
  const [activeNoteSkuId, setActiveNoteSkuId] = useState(() => {
    return localStorage.getItem('bloomerce_active_note_id') || null;
  });
  const noteDraftRef   = useRef('');
  const savingRef      = useRef(false);

  // Sync active note ID to localStorage — validate against loaded SKUs to avoid broken popovers
  useEffect(() => {
    if (activeNoteSkuId) {
      localStorage.setItem('bloomerce_active_note_id', activeNoteSkuId);
    } else {
      localStorage.removeItem('bloomerce_active_note_id');
    }
  }, [activeNoteSkuId]);

  // After SKUs load, validate the restored note ID — clear it if the SKU no longer exists
  useEffect(() => {
    if (activeNoteSkuId && skus.length > 0) {
      const exists = skus.some(s => s.id === activeNoteSkuId);
      if (!exists) {
        localStorage.removeItem(`bloomerce_note_draft_${activeNoteSkuId}`);
        localStorage.removeItem('bloomerce_active_note_id');
        setActiveNoteSkuId(null);
      }
    }
  }, [skus, activeNoteSkuId]);



  // ── Component Helpers ───────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [skuData, brands, cats, statuses, bundles, packs, nqUnits, sizes, colors] = await Promise.all([
        skuApi.getAll(),
        refApi.getAll('BRAND'),
        refApi.getAll('CATEGORY'),
        refApi.getAll('STATUS'),
        refApi.getAll('BUNDLE_TYPE'),
        refApi.getAll('PACK_TYPE'),
        refApi.getAll('NET_QUANTITY_UNIT'),
        refApi.getAll('SIZE'),
        refApi.getAll('COLOR')
      ]);
      let subcats = [];
      try { subcats = await refApi.getAll('SUB_CATEGORY'); } catch { /* ignore */ }
      const toMap = arr => (arr || []).reduce((a, r) => ({ 
        ...a, 
        [r.id]: r.label,
        [r.key]: r.label,
        [String(r.id)]: r.label 
      }), {});
      setSkus(skuData || []);
      setReferences({
        BRAND: toMap(brands),
        CATEGORY: toMap(cats),
        STATUS: toMap(statuses),
        SUB_CATEGORY: toMap(subcats),
        BUNDLE_TYPE: toMap(bundles),
        PACK_TYPE: toMap(packs),
        NET_QUANTITY_UNIT: toMap(nqUnits),
        SIZE: toMap(sizes),
        COLOR: toMap(colors)
      });
      setRefLists({
        BRAND: brands,
        CATEGORY: cats,
        STATUS: statuses,
        SUB_CATEGORY: subcats,
        BUNDLE_TYPE: bundles,
        PACK_TYPE: packs,
        NET_QUANTITY_UNIT: nqUnits,
        SIZE: sizes,
        COLOR: colors
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const saveInlineEdit = useCallback(async (skuId, colId, value) => {
    if (savingRef.current) return;
    savingRef.current = true;
    let parsed = value === '' ? null : value;

    // Special handling for color: resolve ID to label string if needed
    if (colId === 'color' && parsed && typeof parsed === 'number') {
      const colorLabel = references.COLOR[parsed];
      if (colorLabel) parsed = colorLabel;
    }

    // Only clear if this specific cell is still the active editor
    setInlineEdit(prev => (prev?.skuId === skuId && prev?.colId === colId) ? null : prev);

    if (parsed !== undefined) {
      setSkus(prev => prev.map(s => s.id === skuId ? { ...s, [colId]: parsed } : s));
      try { await skuApi.update(skuId, { [colId]: parsed }); }
      catch (err) { console.error('Save failed:', err); loadAll(); }
    }
    savingRef.current = false;
  }, [loadAll, references.COLOR]);

  const handleNoteClose = useCallback(async () => {
    if (!activeNoteSkuId) return;
    const sku = skus.find(s => s.id === activeNoteSkuId);
    const draft = noteDraftRef.current;

    // Only save if changed
    if (sku && draft !== (sku.remark || '')) {
      await saveInlineEdit(activeNoteSkuId, 'remark', draft);
    }
    // Clear draft storage on close/save
    localStorage.removeItem(`bloomerce_note_draft_${activeNoteSkuId}`);
    setActiveNoteSkuId(null);
  }, [activeNoteSkuId, skus, saveInlineEdit]);

  const toggleGroup      = useCallback(gid => setExpandedGroups(prev => { const n = new Set(prev); n.has(gid) ? n.delete(gid) : n.add(gid); return n; }), []);
  const startInlineEdit   = useCallback((sku, colId) => { if (NON_INLINE.has(colId)) return; savingRef.current = false; setInlineEdit({ skuId: sku.id, colId }); }, []);
  const cancelInlineEdit  = useCallback(() => { savingRef.current = false; setInlineEdit(null); }, []);

  // ── Global Event Listeners ──────────────────────────────────────────────────
  useEffect(() => { loadAll(); }, [loadAll]);

  // Handle clicking outside of cells, editors or notes
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // Deselect cell if click is outside any td
      if (!e.target.closest('td')) setSelectedCell(null);

      // Auto-save and close Note if click is outside the popover/trigger
      if (activeNoteSkuId && !e.target.closest('.note-popover') && !e.target.closest('.note-trigger')) {
        handleNoteClose();
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [activeNoteSkuId, handleNoteClose]);

  // Flatten visible columns for data rows
  const visibleCols = useMemo(() => {
    const cols = [...BASE_COLS];
    for (const g of GROUPS) {
      const expanded = expandedGroups.has(g.id);
      cols.push(...(expanded ? g.cols : [g.cols[0]]));
    }
    cols.push(REMARKS_COL);
    return cols;
  }, [expandedGroups]);


  const filtered = useMemo(() => skus.filter(s => {
    // 1. Search Query
    const q = search.toLowerCase();
    const matchSearch = !q || s.product_name?.toLowerCase().includes(q) || s.sku_code?.toLowerCase().includes(q) || s.barcode?.toLowerCase().includes(q);
    if (!matchSearch) return false;

    // 2. Status Tab
    const statusLabel = (references.STATUS?.[s.status_reference_id] || '').toLowerCase();
    if (statusFilter !== 'all' && statusLabel !== statusFilter) return false;

    // 3. Multi-Select Status
    if (filters.statusIds.length > 0 && !filters.statusIds.includes(s.status_reference_id)) return false;

    // 4. Brands
    if (filters.brandIds.length > 0 && !filters.brandIds.includes(s.brand_reference_id)) return false;

    // 5. Categories
    if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(s.category_reference_id)) return false;

    // 6. Sub Categories
    if (filters.subCategoryIds?.length > 0 && !filters.subCategoryIds.includes(s.sub_category_reference_id)) return false;

    // 7. Price Range
    const price = s.mrp || 0;
    if (filters.minPrice !== '' && price < parseFloat(filters.minPrice)) return false;
    if (filters.maxPrice !== '' && price > parseFloat(filters.maxPrice)) return false;

    // 8. Boolean / Quality Checks
    if (filters.hasImage === true && !s.primary_image_url) return false;
    if (filters.hasImage === false && s.primary_image_url) return false;

    if (filters.hasNotes === true && !s.remark) return false;
    if (filters.hasNotes === false && s.remark) return false;

    return true;
  }).sort((a, b) => {

    let va = a[sortCol] ?? '', vb = b[sortCol] ?? '';
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    return va < vb ? (sortDir === 'asc' ? -1 : 1) : va > vb ? (sortDir === 'asc' ? 1 : -1) : 0;
  }), [skus, search, statusFilter, filters, references, sortCol, sortDir]);

  const [selectedSkus, setSelectedSkus] = useState(new Set());
  const toggleSelected = useCallback((skuId) => {
    setSelectedSkus(prev => {
      const n = new Set(prev);
      if (n.has(skuId)) n.delete(skuId);
      else n.add(skuId);
      return n;
    });
  }, []);

  const totalPages    = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated     = filtered.slice((page - 1) * pageSize, page * pageSize);
  const handleSort = useCallback((colId) => {
    // If colId is an event or not a string, we toggle existing sort direction
    if (!colId || typeof colId !== 'string') {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      setPage(1);
      return;
    }

    const allCols = [...BASE_COLS, ...GROUPS.flatMap(g => g.cols)];
    const c = allCols.find(col => col.id === colId);
    if (!c?.sortable) return;

    if (sortCol === colId) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colId);
      setSortDir('asc');
    }
    setPage(1);
  }, [sortCol]);

  const statusCounts  = useMemo(() => skus.reduce((acc, s) => { const l = references.STATUS[s.status_reference_id]?.toLowerCase()||'unknown'; acc[l]=(acc[l]||0)+1; return acc; }, {}), [skus, references]);
  const pageNums      = Array.from({ length: totalPages }, (_, i) => i+1).filter(n => n===1||n===totalPages||Math.abs(n-page)<=1).reduce((acc,n,i,arr)=>{if(i>0&&n-arr[i-1]>1)acc.push('…');acc.push(n);return acc;},[]);

  const colGroupMap = useMemo(() => {
    const map = {};
    for (const g of GROUPS) for (const col of g.cols) map[col.id] = g;
    return map;
  }, []);

// ── Cell renderer ───────────────────────────────────────────────────────────
const renderCell = (col, sku, openFullEdit) => {
  const isEditing = inlineEdit?.skuId === sku.id && inlineEdit?.colId === col.id;
  const isSelected = selectedCell?.skuId === sku.id && selectedCell?.colId === col.id;

  if (isEditing) {
    return (
      <InlineCellEditor
        col={col}
        sku={sku}
        initialValue={sku[col.id]}
        refLists={refLists}
        onSave={(val) => saveInlineEdit(sku.id, col.id, val)}
        onCancel={cancelInlineEdit}
      />
    );
  }
  const val = sku[col.id];
  switch (col.id) {
    case 'actions': return (
      <button onClick={openFullEdit} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] text-[var(--color-muted-foreground)] transition-all mx-auto focus:opacity-100" title="Edit Full Product">
        <SquarePen size={15} />
      </button>
    );
    case 'primary_image_url': {
      const directUrl = getDirectImageUrl(val);
      return (
        <div className="w-10 h-10 mx-auto rounded-xl overflow-hidden border border-[var(--color-border)]">
          {directUrl ? <img src={directUrl} alt="sku" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-[var(--color-muted)]"><ImageIcon size={16} className="text-[var(--color-muted-foreground)]"/></div>}
        </div>
      );
    }
    case 'barcode': {
      const barcodeVal = sku.sku_code || sku.barcode || '';
      return (
        <div className="flex items-center justify-between gap-1 group/item">
          <span className="font-mono text-xs font-semibold text-[var(--color-foreground)] truncate">
            {barcodeVal || <EmptyState isLine />}
          </span>
          {barcodeVal && (
            <CopyButton
              value={barcodeVal}
              className="opacity-100 md:opacity-0 group-hover/item:opacity-100"
              title="Copy SKU/Barcode"
            />
          )}
        </div>
      );
    }
    case 'product_name': return (
      <div className="flex items-center justify-between gap-2 group/item min-w-0">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="font-medium text-[var(--color-foreground)]/85 text-[13.5px] leading-snug whitespace-normal break-words line-clamp-2" title={val}>
            {val || <span className="text-[var(--color-muted-foreground)] font-normal italic text-[11px]">Unnamed Product</span>}
          </span>
        </div>
        {val && (
          <CopyButton
            value={val}
            className="opacity-100 md:opacity-0 group-hover/item:opacity-100 flex-shrink-0"
            title="Copy Product Name"
          />
        )}
      </div>
    );
    case 'status_reference_id': {
      const lbl = references.STATUS[val];
      return (
        <div className="flex items-center justify-between gap-1 w-full group/ref bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-2 py-1 shadow-sm hover:border-[var(--color-primary)]/50 transition-all">
          {lbl ? <StatusBadge label={lbl}/> : <EmptyState isLine />}
          <ChevronDown size={14} className="text-[var(--color-muted-foreground)] opacity-70 group-hover/ref:text-[var(--color-primary)] transition-colors" />
        </div>
      );
    }
    case 'brand_reference_id': {
      const label = references.BRAND[val];
      return (
        <div className="flex items-center justify-between gap-2 w-full group/ref cursor-pointer bg-[var(--color-muted)]/20 border border-[var(--color-border)]/50 rounded-lg px-2.5 py-1.5 shadow-sm hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-card)] transition-all">
          <span className={cn("text-[13px] font-bold truncate flex items-center gap-1.5", label ? "text-[var(--color-foreground)]" : "text-amber-600 italic font-medium")}>
            {!label && val && <AlertCircle size={10} className="text-amber-500" />}
            {label || val || <EmptyState isLine />}
          </span>
          <ChevronDown size={14} className="text-[var(--color-muted-foreground)] opacity-70 group-hover/ref:text-[var(--color-primary)] transition-colors flex-shrink-0" />
        </div>
      );
    }
    case 'category_reference_id': {
      const label = references.CATEGORY[val];
      return (
        <div className="flex items-center justify-between gap-2 w-full group/ref cursor-pointer bg-[var(--color-muted)]/10 border border-[var(--color-border)]/40 rounded-lg px-2.5 py-1.5 shadow-sm hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-card)] transition-all">
          <span className={cn("text-[13px] truncate flex items-center gap-1.5", label ? "text-[var(--color-foreground)]" : "text-amber-600 italic font-medium")}>
            {!label && val && <AlertCircle size={10} className="text-amber-500" />}
            {label || <EmptyState isLine />}
          </span>
          <ChevronDown size={14} className="text-[var(--color-muted-foreground)] opacity-60 group-hover/ref:text-[var(--color-primary)] transition-colors flex-shrink-0" />
        </div>
      );
    }
    case 'sub_category_reference_id': {
      const label = references.SUB_CATEGORY[val];
      return (
        <div className="flex items-center justify-between gap-2 w-full group/ref cursor-pointer bg-[var(--color-muted)]/10 border border-[var(--color-border)]/40 rounded-lg px-2.5 py-1.5 shadow-sm hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-card)] transition-all">
          <span className={cn("text-[13px] truncate flex items-center gap-1.5", label ? "text-[var(--color-muted-foreground)]" : "text-amber-600 italic font-medium")}>
            {!label && val && <AlertCircle size={10} className="text-amber-500" />}
            {label || <EmptyState isLine />}
          </span>
          <ChevronDown size={14} className="text-[var(--color-muted-foreground)] opacity-60 group-hover/ref:text-[var(--color-primary)] transition-colors flex-shrink-0" />
        </div>
      );
    }
    case 'bundle_type': {
      const label = references.BUNDLE_TYPE[val];
      return (
        <div className="flex items-center justify-between gap-2 w-full group/ref cursor-pointer bg-amber-50/20 border border-amber-200/50 rounded-lg px-2.5 py-1.5 shadow-sm hover:border-amber-400/50 hover:bg-white transition-all">
          <span className={cn("text-[13px] font-medium truncate flex items-center gap-1.5", label ? "text-amber-900" : "text-amber-600 italic")}>
            {!label && val && <AlertCircle size={10} className="text-amber-500" />}
            {label || val || <EmptyState isLine />}
          </span>
          <ChevronDown size={14} className="text-amber-500/60 group-hover/ref:text-amber-600 transition-colors flex-shrink-0" />
        </div>
      );
    }
    case 'pack_type': {
      const label = references.PACK_TYPE[val];
      return (
        <div className="flex items-center justify-between gap-2 w-full group/ref cursor-pointer bg-amber-50/10 border border-amber-200/30 rounded-lg px-2.5 py-1.5 shadow-sm hover:border-amber-400/50 hover:bg-white transition-all">
          <span className={cn("text-[13px] truncate flex items-center gap-1.5", label ? "text-amber-800/80" : "text-amber-600 italic font-medium")}>
            {!label && val && <AlertCircle size={10} className="text-amber-500" />}
            {label || val || <EmptyState isLine />}
          </span>
          <ChevronDown size={14} className="text-amber-500/50 group-hover/ref:text-amber-600 transition-colors flex-shrink-0" />
        </div>
      );
    }
    case 'net_quantity_unit_reference_id': {
      const label = references.NET_QUANTITY_UNIT[val];
      return (
        <div className="flex items-center justify-between gap-2 w-full group/ref cursor-pointer bg-emerald-50/20 border border-emerald-200/30 rounded-lg px-2.5 py-1.5 shadow-sm hover:border-emerald-400/50 hover:bg-white transition-all">
          <span className={cn("text-[13px] font-medium truncate flex items-center gap-1.5", label ? "text-emerald-900" : "text-amber-600 italic")}>
            {!label && val && <AlertCircle size={10} className="text-amber-500" />}
            {label || val || <EmptyState isLine />}
          </span>
          <ChevronDown size={14} className="text-emerald-500/60 group-hover/ref:text-emerald-600 transition-colors flex-shrink-0" />
        </div>
      );
    }
    case 'size_reference_id': {
      const label = references.SIZE[val];
      return (
        <div className="flex items-center justify-between gap-2 w-full group/ref cursor-pointer bg-emerald-50/10 border border-emerald-200/30 rounded-lg px-2.5 py-1.5 shadow-sm hover:border-emerald-400/50 hover:bg-white transition-all">
          <span className={cn("text-[13px] truncate flex items-center gap-1.5", label ? "text-emerald-800/80" : "text-amber-600 italic font-medium")}>
            {!label && val && <AlertCircle size={10} className="text-amber-500" />}
            {label || val || <EmptyState isLine />}
          </span>
          <ChevronDown size={14} className="text-emerald-500/50 group-hover/ref:text-emerald-600 transition-colors flex-shrink-0" />
        </div>
      );
    }
    case 'color': {
      // Priority 1: Direct lookup in COLOR references (handles IDs, Numeric Strings, and Keys)
      // Priority 2: Fallback to the raw value
      const label = references.COLOR[val] || val;
      return (
        <div className="flex items-center justify-between gap-2 w-full group/ref cursor-pointer bg-emerald-50/5 border border-emerald-200/20 rounded-lg px-2.5 py-1.5 shadow-sm hover:border-emerald-400/50 hover:bg-white transition-all">
          <span className={cn("text-[13px] truncate flex items-center gap-1.5", label ? "text-emerald-800/70" : "text-amber-600 italic font-medium")}>
            {label || <EmptyState isLine />}
          </span>
          <ChevronDown size={14} className="text-emerald-500/40 group-hover/ref:text-emerald-600 transition-colors flex-shrink-0" />
        </div>
      );
    }
    case 'finished_product_weight': {
      const pWeight = parseFloat(sku.package_weight) || 0;
      const rWeight = parseFloat(sku.raw_product_weight) || 0;
      const total = (pWeight > 0 || rWeight > 0) ? Math.round(pWeight + rWeight) : null;
      return total != null ? <span className="text-sm font-bold text-[var(--color-primary)] tabular-nums">{total}</span> : <EmptyState />;
    }
    case 'tax_percent':  return val != null ? <span className="text-sm text-[var(--color-muted-foreground)] opacity-70">{`${val}%`}</span> : <EmptyState />;
    case 'catalog_url':  return val ? (
      <div className="flex items-center justify-center gap-1 group/item">
        <a
          href={val}
          target="_blank"
          rel="noreferrer"
          onClick={e=>e.stopPropagation()}
          className="flex items-center justify-center p-1.5 rounded-lg hover:bg-[var(--color-primary)]/10 text-[var(--color-primary)] transition-all shadow-sm border border-[var(--color-primary)]/20"
          title="Open in Google Drive"
        >
          <ExternalLink size={14} />
        </a>
        <CopyButton
          value={val}
          className="opacity-100 md:opacity-0 group-hover/item:opacity-100"
          title="Copy Drive Link"
        />
      </div>
    ) : <EmptyState />;
    case 'createdAt': {
      if (!val) return <EmptyState />;
      const d = new Date(val);
      return (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--color-foreground)] leading-tight">{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span className="text-[10px] text-[var(--color-muted-foreground)] tabular-nums opacity-70 uppercase">{d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        </div>
      );
    }

    case 'remark': return (
      <div className="flex items-center justify-center w-full h-full">
        <button
          onClick={(e) => { e.stopPropagation(); setActiveNoteSkuId(prev => prev === sku.id ? null : sku.id); }}
          className={cn(
            "note-trigger p-2 rounded-lg transition-all relative",
            val ? "text-[var(--color-primary)] bg-[var(--color-primary)]/10" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          )}
          title={val || "Add Note"}
        >
          <StickyNote size={15} fill={val ? "currentColor" : "none"} fillOpacity={0.2} />
          {val && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full border border-white" />}
        </button>
      </div>
    );

    default:
      if (val==null||val==='') return <EmptyState />;
      if (col.isNum)    return (
        <div className="group/item flex items-center justify-end gap-1.5">
          <span className="font-semibold text-sm tabular-nums text-[var(--color-foreground)]">₹{Number(val).toLocaleString('en-IN')}</span>
          <CopyButton value={val} className="opacity-100 md:opacity-0 group-hover/item:opacity-100 h-6 w-6" iconSize={12} title={`Copy ${col.labelValue || col.label}`} />
        </div>
      );
      if (col.isMono)   return (
        <div className="group/item flex items-center justify-between gap-1.5">
          <span className="font-mono text-xs text-[var(--color-muted-foreground)] truncate">{val}</span>
          <CopyButton value={val} className="opacity-100 md:opacity-0 group-hover/item:opacity-100 h-6 w-6" iconSize={12} title={`Copy ${col.label}`} />
        </div>
      );
      if (col.isContent) return (
        <div className="group/item relative max-w-full flex items-start justify-between gap-1">
          <span className="text-[10.5px] text-[var(--color-muted-foreground)]/60 line-clamp-3 leading-relaxed cursor-help hover:text-[var(--color-foreground)] transition-colors flex-1" title={val}>
            {val}
          </span>
          <CopyButton
            value={val}
            className="opacity-100 md:opacity-0 group-hover/item:opacity-100 flex-shrink-0"
            title={`Copy ${col.label}`}
          />
        </div>
      );
      return <span className={cn("text-sm transition-colors", isSelected ? "text-[var(--color-primary)] font-semibold" : "text-[var(--color-foreground)]")}>{val}</span>;
  }
};


  // Expand / Collapse All
  const allGroupIds = GROUPS.map(g => g.id);
  const isAllExpanded = expandedGroups.size === GROUPS.length;
  const isAllCollapsed = expandedGroups.size === 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* ── Top Header & Global Actions ── */}
      <div className={cn("flex justify-between gap-4", isMobile ? "flex-col items-stretch" : "items-center")}>
        <div className={cn(isMobile && "text-center")}>
          <h2 className="text-2xl font-bold text-[var(--color-foreground)] tracking-tight">Products Master</h2>
          {!isMobile && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 animate-in fade-in slide-in-from-top-1 duration-500">
              Click any cell to edit inline · Hover image to open full form
            </p>
          )}
        </div>
        <div className={cn("flex flex-wrap items-center gap-2", isMobile ? "grid grid-cols-2" : "")}>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5 h-[36px] font-semibold transition-all", isMobile && "w-full text-[11px] px-2 h-[38px] active:scale-95")}
            onClick={()=>setIsImportOpen(true)}
          >
            <Upload size={13}/> Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5 h-[36px] bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] shadow-sm font-semibold transition-all", isMobile && "w-full text-[11px] px-2 h-[38px] active:scale-95")}
            onClick={() => setIsExportCenterOpen(true)}
          >
            <Download size={13} className="text-[var(--color-muted-foreground)]" /> Export
            {selectedSkus.size > 0 && <span className="ml-0.5 bg-[var(--color-primary)] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{selectedSkus.size}</span>}
          </Button>
          {!isMobile && <Button size="sm" className="gap-1.5 ml-1 h-[36px] font-semibold shadow-sm" onClick={()=>{setEditingSku(null);setIsFormOpen(true);}}><Plus size={14}/> Add Product</Button>}
        </div>
        {isMobile && (
          <Button size="sm" className="w-full gap-1.5 h-[42px] shadow-lg shadow-[var(--color-primary)]/20 font-bold active:scale-[0.98] transition-all" onClick={()=>{setEditingSku(null);setIsFormOpen(true);}}><Plus size={16}/> Add New Product</Button>
        )}
      </div>

      {/* ── Table Global Toolbar ── */}
      <div className={cn("flex bg-[var(--color-card)] p-2 rounded-xl border border-[var(--color-border)] shadow-sm gap-4", isMobile ? "flex-col" : "items-center justify-between")}>

        {/* Left: View Controls */}
        <div className={cn("flex gap-2", isMobile ? "flex-col" : "items-center")}>
          {/* Status Tabs */}
          <div className="flex items-center border border-[var(--color-border)] rounded-lg p-1 bg-[var(--color-muted)] overflow-x-auto no-scrollbar">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap",
                  statusFilter === tab.key
                    ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                )}
              >
                {tab.label(statusCounts, skus.length)}
              </button>
            ))}
          </div>

          {!isMobile && <div className="w-px h-6 bg-slate-200 mx-1" />}

          {/* Search */}
          <div className={cn("flex items-center gap-1.5 border border-[var(--color-border)] rounded-lg px-2.5 h-[32px] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all bg-[var(--color-card)]", isMobile && "h-[38px]")}>
            <Search size={14} className="text-[var(--color-muted-foreground)]" />
            <input
              type="text"
              placeholder="Search product, SKU..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="bg-transparent text-xs w-full outline-none text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]/50"
            />
          </div>

          {(search || isFilterActive || statusFilter !== 'all') && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              {!isMobile && <div className="w-px h-6 bg-[var(--color-border)] mx-1 hidden sm:block" />}
              <button
                onClick={() => { setSearch(''); setFilters(initialFilters); setStatusFilter('all'); setPage(1); }}
                className={cn("group flex items-center gap-1.5 px-3 h-[32px] text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 rounded-lg transition-all shadow-sm", isMobile && "h-[38px] w-full justify-center")}
                title="Clear all search and filters"
              >
                <RefreshCcw size={12} className="group-hover:-rotate-180 transition-transform duration-500" />
                Clear All
              </button>
            </div>
          )}
        </div>



        {/* Right: Actions & View Controls */}
        <div className={cn("flex items-center gap-2", isMobile && "w-full")}>
          {/* Advanced Filter Toggle */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "relative flex items-center gap-2 px-3.5 h-[32px] text-xs font-semibold border rounded-lg transition-all",
              isMobile && "flex-1 h-[38px] justify-center",
              isFilterOpen
                ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                : isFilterActive
                  ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15"
                  : "bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-muted-foreground)]/30 hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
            )}
            title="Toggle Advanced Filters"
          >
            <Filter size={13} />
            <span>Filters</span>
            {isFilterActive && (
              <span className={cn(
                "flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-black rounded-full tabular-nums",
                isFilterOpen ? "bg-white text-[var(--color-primary)]" : "bg-[var(--color-primary)] text-white shadow-sm"
              )}>
                {activeAdvancedFiltersCount}
              </span>
            )}
          </button>

          {!isMobile && (
            <>
              <div className="w-px h-6 bg-[var(--color-border)] mx-1 hidden sm:block" />

              {/* Expand / Collapse All */}
              <div className="flex items-center border border-[var(--color-border)] rounded-md overflow-hidden bg-[var(--color-card)] shadow-sm">
                <button
                  onClick={() => setExpandedGroups(new Set(allGroupIds))}
                  disabled={isAllExpanded}
                  className="flex items-center gap-1.5 px-3 h-[32px] text-xs font-semibold border-r border-[var(--color-border)] transition-colors text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-40 disabled:hover:bg-[var(--color-card)]"
                >
                  <Maximize2 size={13}/> Expand All
                </button>
                <button
                  onClick={() => setExpandedGroups(new Set())}
                  disabled={isAllCollapsed}
                  className="flex items-center gap-1.5 px-3 h-[32px] text-xs font-semibold transition-colors text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-40 disabled:hover:bg-[var(--color-card)]"
                >
                  <Minimize2 size={13}/> Collapse All
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Advanced Filter Bar ── */}
      {isFilterOpen && (
        <TopFilterBar
          filters={filters}
          onFilterChange={(newFilters) => {
            setFilters(prev => ({ ...prev, ...newFilters }));
            setPage(1);
          }}
          onClearAll={() => {
            setFilters(initialFilters);
            setPage(1);
          }}
          references={references}
          refLists={refLists}
          matchCount={filtered.length}
          totalCount={skus.length}
        />
      )}

      {/* ── Table or Card view ── */}
      {isMobile ? (
        <div className="flex flex-col gap-4">
          {loading ? (
             <>
               <CardSkeleton />
               <CardSkeleton />
               <CardSkeleton />
               <CardSkeleton />
             </>
          ) : paginated.length === 0 ? (
            <div className="py-24 text-center bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)]">
               <div className="flex flex-col items-center justify-center gap-3">
                  <Search size={32} className="text-slate-300" />
                  <p className="text-sm font-bold text-slate-900">No products found</p>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {paginated.map(sku => (
                <SkuCard
                  key={sku.id}
                  sku={sku}
                  references={references}
                  onEdit={() => { setEditingSku(sku); setIsFormOpen(true); }}
                  onNote={(e) => { e?.stopPropagation(); setActiveNoteSkuId(prev => prev === sku.id ? null : sku.id); }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto" style={{scrollbarWidth:'thin'}}>
            <table className="w-full border-collapse" style={{borderSpacing:0}}>
              <thead>
                {/* ── Row 1: base cols (rowSpan=2) + group parent headers ── */}
                <tr>
                  <th colSpan={BASE_COLS.length}
                    className="px-3 pt-2 pb-1 text-center border-b border-b-transparent sticky z-30 bg-[var(--color-muted)] shadow-[inset_-1px_0_0_var(--color-border)]"
                    style={{ left: 0, minWidth: BASE_COLS.reduce((sum, c) => sum + (c.width || 0), 0) }}>
                    <div className="flex items-center justify-center gap-2">
                       <span className="text-[11px] font-bold tracking-wider uppercase">Identity</span>
                    </div>
                  </th>

                  {GROUPS.map(g => {
                    const expanded = expandedGroups.size > 0 && expandedGroups.has(g.id);
                    const colSpan  = expanded ? g.cols.length : 1;
                    const hiddenN  = g.cols.length - 1;
                    const gc       = GC[g.color];
                    return (
                      <th key={g.id} colSpan={colSpan}
                        className={cn("px-3 pt-2 pb-1 text-center border-l border-[var(--color-border)] border-b border-b-transparent", gc.row1)}
                        style={{minWidth: expanded ? g.cols.reduce((s,c)=>s+c.width,0) : g.cols[0].width}}>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[11px] font-bold tracking-wider uppercase">{g.label}</span>
                          <button onClick={()=>toggleGroup(g.id)} className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all", gc.pill)}>
                            {expanded
                              ? <><Minimize2 size={12}/><span>Collapse</span></>
                              : <><Maximize2 size={12}/><span>Expand ({hiddenN})</span></>}
                          </button>
                        </div>
                      </th>
                    );
                  })}

                  {/* Placeholder for Sticky Notes in Group Row */}
                  <th className="sticky top-0 right-0 z-30 bg-[var(--color-muted)] border-b border-l border-[var(--color-border)] shadow-[inset_1px_0_0_var(--color-border)]" />
                </tr>


                {/* ── Row 2: group sub-column names ── */}
                <tr>
                  {BASE_COLS.map((col) => (
                    <th key={col.id}
                      className={cn("px-4 py-2.5 text-left whitespace-nowrap select-none border-b-2 border-l border-[var(--color-border)]/30 bg-[var(--color-muted)]",
                        col.sticky && "sticky z-20 shadow-[inset_-1px_0_0_var(--color-border)]")}
                       style={{width:col.width, minWidth:col.width, textAlign:col.align||'left', left:col.sticky? col.stickyLeft :undefined}}>
                      <span onClick={()=>col.sortable&&handleSort(col.id)} className={cn("text-[10.5px] font-semibold tracking-wider uppercase text-[var(--color-muted-foreground)]/80", col.sortable&&"cursor-pointer hover:text-[var(--color-primary)] transition-colors")}>
                        {col.label}
                        {col.sortable&&sortCol===col.id&&<ArrowUpDown size={10} className="inline ml-1 text-[var(--color-primary)]"/>}
                        {col.sortable&&sortCol!==col.id&&<ArrowUpDown size={10} className="inline ml-1 opacity-20"/>}
                      </span>
                    </th>
                  ))}

                  {GROUPS.map(g => {
                    const expanded  = expandedGroups.has(g.id);
                    const shownCols = expanded ? g.cols : [g.cols[0]];
                    const gc        = GC[g.color];
                    return shownCols.map((col, idx) => (
                      <th key={col.id}
                        className={cn("px-4 py-2.5 text-left whitespace-nowrap select-none border-b-2 border-[var(--color-border)] border-l",
                           gc.row2)}
                        style={{width:col.width, minWidth:col.width, textAlign:col.align||'left'}}>
                        <span onClick={()=>col.sortable&&handleSort(col.id)} className={cn("text-[10.5px] font-semibold tracking-wider uppercase text-[var(--color-muted-foreground)]/80", col.sortable&&"cursor-pointer hover:text-[var(--color-primary)] transition-colors")}>
                          {col.label}
                          {col.sortable&&sortCol===col.id&&<ArrowUpDown size={10} className="inline ml-1 text-[var(--color-primary)]"/>}
                          {col.sortable&&sortCol!==col.id&&<ArrowUpDown size={10} className="inline ml-1 opacity-20"/>}
                        </span>
                      </th>
                    ));
                  })}


                  {/* Content for Sticky Notes in Sub-column Row */}
                  <th className="sticky top-0 right-0 z-40 p-3 bg-[var(--color-muted)] border-b-2 border-l border-[var(--color-border)] shadow-[inset_1px_0_0_var(--color-border)]">
                    <div className="flex items-center justify-center gap-1.5 opacity-60">
                      <StickyNote size={13} className="text-[var(--color-muted-foreground)]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Notes</span>
                    </div>
                  </th>
                </tr>
              </thead>


              <tbody>
                {loading ? (
                   <>
                     <TableRowSkeleton visibleCols={visibleCols} />
                     <TableRowSkeleton visibleCols={visibleCols} />
                     <TableRowSkeleton visibleCols={visibleCols} />
                     <TableRowSkeleton visibleCols={visibleCols} />
                     <TableRowSkeleton visibleCols={visibleCols} />
                     <TableRowSkeleton visibleCols={visibleCols} />
                     <TableRowSkeleton visibleCols={visibleCols} />
                     <TableRowSkeleton visibleCols={visibleCols} />
                   </>
                ) : paginated.length===0 ? (
                  <tr>
                    <td colSpan={visibleCols.length} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-muted-foreground)]/30">
                          <Search size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--color-foreground)]">No products found</p>
                          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Try adjusting your filters or search terms to find what you're looking for.</p>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => { setSearch(''); setFilters(initialFilters); setStatusFilter('all'); setPage(1); }}
                          className="mt-2 h-9 px-5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-bold text-xs gap-2 shadow-lg shadow-[var(--color-primary)]/20"
                        >
                          <RefreshCcw size={14} />
                          Clear all filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(sku => {
                  const openFullEdit = () => { setEditingSku(sku); setIsFormOpen(true); };
                  return (
                    <tr key={sku.id} className="group transition-colors bg-[var(--color-card)] hover:bg-[var(--color-muted)]/30">
                      {visibleCols.map((col) => {
                        const isActive   = inlineEdit?.skuId===sku.id && inlineEdit?.colId===col.id;
                        const isSelected = selectedCell?.skuId===sku.id && selectedCell?.colId===col.id && !isActive;
                        const canInline  = !col.noInline && !NON_INLINE.has(col.id) && col.id!=='primary_image_url';
                        const grp        = colGroupMap[col.id];
                        const gc         = grp ? GC[grp.color] : null;
                        // First col of a group gets a left border
                        const isFirstGroupCol = grp && GROUPS.find(g=>g.id===grp.id)?.cols[0]?.id===col.id;
                        const isNoteActive = activeNoteSkuId === sku.id;
                        const isRefField = !!REF_MAP[col.id];
                        return (
                          <td key={`${sku.id}-${col.id}`}
                            tabIndex={-1}
                            onMouseDown={isActive ? undefined : (e) => {
                              e.currentTarget.focus();
                              setSelectedCell({skuId: sku.id, colId: col.id});
                              if (isRefField && canInline) {
                                startInlineEdit(sku, col.id);
                                setSelectedCell(null);
                              }
                            }}
                            onClick={(e) => { e.preventDefault(); }}
                            onDoubleClick={(isActive || !canInline || isRefField) ? undefined : () => { startInlineEdit(sku, col.id); setSelectedCell(null); }}
                            className={cn(
                              "transition-all relative group/cell outline-none animate-in fade-in duration-300",
                              "border-b border-[var(--color-border)] py-2.5 cursor-default align-middle",
                              (col.id === 'product_name' || col.id === 'barcode') ? "px-4" : "px-2",
                              isActive && "z-10",
                              isSelected && "cell-active z-10 outline-none animate-focus-pulse",
                              col.sticky && "sticky z-20 bg-[var(--color-card)]",
                               col.sticky && !col.isRight && "shadow-[4px_0_12px_var(--color-shadow)] after:absolute after:inset-y-0 after:right-0 after:w-[1px] after:bg-[var(--color-border)]",
                              col.sticky && col.isRight && "right-0 shadow-[inset_1px_0_0_var(--color-border)]",
                              /* Ensure open popover is above everything */
                              isNoteActive && col.id === 'remark' && "z-[50] overflow-visible",
                              /* Ensure base columns have a right border when scrolling */
                              col.sticky && !col.isRight && (col.id === 'brand_reference_id' ? "!shadow-[inset_-1px_0_0_var(--color-border)]" : ""),
                              gc && !isActive && !isSelected && gc.td,
                              "border-l border-[var(--color-border)]/30",
                              isFirstGroupCol && "border-l border-[var(--color-border)]",
                            )}
                            style={{
                              width: col.width, minWidth: col.width,
                              maxWidth: col.width,
                              left: col.sticky && !col.isRight ? col.stickyLeft : undefined,
                              right: col.sticky && col.isRight ? 0 : undefined,
                              textAlign: col.align||'left',
                              overflow: (isActive || isNoteActive) ? 'visible' : 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: (isActive || col.id === 'product_name' || col.isContent) ? 'normal' : 'nowrap',
                            }}>
                            {renderCell(col, sku, openFullEdit)}
                          </td>

                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer - Visible on both Desktop and Mobile */}
      <div className="mt-4 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-sm px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
          <span>Showing {Math.min((page-1)*pageSize+1,filtered.length)}–{Math.min(page*pageSize,filtered.length)} of {filtered.length}</span>
          <select
            value={pageSize}
            onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}
            className="border border-[var(--color-border)] rounded-md bg-[var(--color-card)] text-[var(--color-foreground)] text-xs px-1.5 py-1 outline-none cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map(n=><option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={()=>setPage(p=>Math.max(1,p-1))}
            disabled={page===1}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15}/>
          </button>

          <div className="flex items-center gap-1">
            {pageNums.map((n,i)=>n==='…'
              ? <span key={`g${i}`} className="px-1 text-xs text-[var(--color-muted-foreground)]">…</span>
              : <button
                  key={n}
                  onClick={()=>setPage(n)}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg border text-xs transition-colors",
                    page===n ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white font-semibold" : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
                  )}
                >
                  {n}
                </button>)}
          </div>

          <button
            onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
            disabled={page===totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={15}/>
          </button>
        </div>
      </div>

      {isFormOpen && <SkuMasterForm initialData={editingSku} statusOptions={refLists.STATUS} onClose={()=>setIsFormOpen(false)} onSaved={()=>{setIsFormOpen(false);loadAll();}}/>}
      {isExportCenterOpen && (
        <ExportCenterSlideOver
          onClose={() => setIsExportCenterOpen(false)}
          skus={skus}
          filtered={filtered}
          selected={selectedSkus}
          references={references}
        />
      )}
      {isImportOpen && <ImportSlideOver skus={skus} refLists={refLists} onClose={()=>setIsImportOpen(false)} onImportComplete={()=>{setIsImportOpen(false);loadAll();}} />}

      {/* Global Note Editor */}
      {activeNoteSkuId && (() => {
         const sku = skus.find(s => s.id === activeNoteSkuId);
         if (!sku) return null;
         return (
           <NotePopover
             sku={sku}
             onSave={(v) => saveInlineEdit(sku.id, 'remark', v).then(() => setActiveNoteSkuId(null))}
             onClose={handleNoteClose}
             onDraftChange={(v) => { noteDraftRef.current = v; }}
           />
         );
      })()}
    </div>
  );
}
