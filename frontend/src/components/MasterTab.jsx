import {
  Plus, Search, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown,
  ArrowUpDown, LayoutGrid, Rocket, FileEdit, Download, Upload,
  SquarePen, Check, X, Filter, Maximize2, Minimize2, StickyNote, Send, Trash2, RefreshCcw, ExternalLink,
  AlertCircle, Copy, Layers, Command, MoreVertical
} from 'lucide-react';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './MasterGrid.css';

// Register all community modules
ModuleRegistry.registerModules([AllCommunityModule]);

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

  // -- AG Grid State & Hooks --
  const [gridApi, setGridApi] = useState(null);
  const onGridReady = useCallback((params) => setGridApi(params.api), []);

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

  // -- AG Grid Handlers --
  const onCellValueChanged = useCallback(async (params) => {
     const { data, colDef, newValue } = params;
     const colId = colDef.field;
     if (newValue !== undefined) {
        setSkus(prev => prev.map(s => s.id === data.id ? { ...s, [colId]: newValue } : s));
        try {
           await skuApi.update(data.id, { [colId]: newValue });
        } catch (err) {
           console.error('Grid save failed:', err);
           loadAll();
        }
     }
  }, [loadAll]);

  const columnDefs = useMemo(() => {
    const baseCols = [
      {
        headerName: 'Identity',
        pinned: 'left',
        lockPinned: true,
        children: [
          {
            headerCheckboxSelection: true,
            checkboxSelection: true,
            width: 45,
            pinned: 'left',
            suppressHeaderMenuButton: true,
          },
          {
            headerName: 'Img',
            field: 'primary_image_url',
            width: 55,
            pinned: 'left',
            cellRenderer: (p) => p.value ? (
               <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 mt-2">
                 <img src={p.value} className="w-full h-full object-cover" />
               </div>
            ) : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mt-2 text-slate-300"><ImageIcon size={14}/></div>
          },
          {
            headerName: 'Product Name',
            field: 'product_name',
            width: 250,
            pinned: 'left',
            sortable: true,
            filter: true,
            editable: true,
            cellClass: 'font-bold text-slate-900',
          },
          {
            headerName: 'SKU/Barcode',
            field: 'sku_code',
            width: 160,
            pinned: 'left',
            editable: true,
            cellClass: 'font-mono text-[11px] text-slate-500',
            valueGetter: p => p.data.sku_code || p.data.barcode || '—'
          }
        ]
      }
    ];

    const groupCols = GROUPS.map(g => ({
      headerName: g.label,
      marryChildren: true,
      headerClass: `ag-group-header-${g.color}`,
      children: g.cols.map(c => {
        const isRef = !!REF_MAP[c.id];
        const refKey = REF_MAP[c.id];
        
        return {
          headerName: c.label,
          field: c.id,
          width: c.width || 120,
          editable: !c.noInline,
          sortable: !!c.sortable,
          cellClass: cn(
            c.align === 'right' && 'text-right',
            c.isMono && 'font-mono text-[11px]',
            c.isNum && 'tabular-nums font-semibold',
            isRef && 'cursor-pointer hover:bg-slate-50/50'
          ),
          valueFormatter: p => {
             if (isRef && references[refKey]) return references[refKey][p.value] || p.value || '—';
             if (c.id === 'mrp' || c.id === 'purchase_cost') return p.value ? `₹${Number(p.value).toLocaleString('en-IN')}` : '—';
             return p.value || '—';
          },
          cellEditor: isRef ? 'agSelectCellEditor' : (c.isNum ? 'agNumberCellEditor' : 'agTextCellEditor'),
          cellEditorParams: isRef ? {
             values: refLists[refKey]?.map(r => r.id) || [],
             useFormatter: true,
          } : {},
          cellRenderer: c.id === 'status_reference_id' ? (p) => {
             const lbl = references.STATUS[p.value];
             return <StatusBadge label={lbl} />;
          } : undefined
        };
      })
    }));

    return [...baseCols, ...groupCols, [
        {
          headerName: 'Actions',
          pinned: 'right',
          lockPinned: true,
          width: 80,
          cellRenderer: (p) => (
            <div className="flex items-center gap-1 mt-1.5">
               <button 
                  onClick={() => { setEditingSku(p.data); setIsFormOpen(true); }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
               >
                 <SquarePen size={15} />
               </button>
               <button 
                  onClick={() => setActiveNoteSkuId(p.data.id)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
               >
                 <StickyNote size={15} />
               </button>
            </div>
          )
        }
    ][0]];
  }, [references, refLists, isMobile]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    suppressHeaderMenuButton: false,
  }), []);

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
      {/* ── Table / Grid Section ── */}
      <div className="flex-1 min-h-0 relative group">
        {loading ? (
          <div className="h-[calc(100vh-280px)] w-full flex items-center justify-center bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)]">
             <div className="flex flex-col items-center gap-4">
                <RefreshCcw size={32} className="text-[var(--color-primary)] animate-spin opacity-50" />
                <p className="text-sm font-bold text-[var(--color-muted-foreground)]">Loading high-performance catalog...</p>
             </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-[calc(100vh-280px)] w-full flex flex-col items-center justify-center bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] gap-4">
             <div className="w-12 h-12 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-muted-foreground)]/30">
                <Search size={24} />
             </div>
             <div className="text-center">
                <p className="text-sm font-bold text-[var(--color-foreground)]">No products found</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Try adjusting your filters or search terms.</p>
             </div>
             <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearch(''); setFilters(initialFilters); setStatusFilter('all'); setPage(1); }}
                className="mt-2 text-xs font-bold"
             >
                Clear all filters
             </Button>
          </div>
        ) : (
          <div className="h-[calc(100vh-280px)] w-full ag-theme-quartz ag-theme-quartz-bloomerce relative">
            <AgGridReact
              rowData={filtered}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              onSelectionChanged={(e) => {
                const selected = e.api.getSelectedRows();
                setSelectedSkus(new Set(selected.map(s => s.id)));
              }}
              onCellValueChanged={onCellValueChanged}
              rowSelection="multiple"
              suppressRowClickSelection={true}
              enableRangeSelection={true}
              copyHeadersToClipboard={false}
              stopEditingWhenCellsLoseFocus={true}
              animateRows={false}
              headerHeight={45}
              rowHeight={52}
              getContextMenuItems={() => [
                'copy',
                'separator',
                {
                  name: 'Duplicate SKU',
                  action: () => {
                    const selected = gridApi.getSelectedRows();
                    if (selected.length > 0) handleDuplicate(selected[0]);
                  },
                  icon: '<span class="lucide lucide-copy"></span>'
                }
              ]}
              gridOptions={{
                suppressCellFocus: false,
                ensureDomOrder: true,
              }}
            />
          </div>
        )}

        {/* Floating Bulk Action Bar (Spreadsheet Feel) */}
        {selectedSkus.size > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[var(--color-card)]/90 backdrop-blur-xl border border-[var(--color-primary)]/20 shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[var(--color-primary)] tracking-wider">Bulk Actions</span>
                <span className="text-xs font-medium text-[var(--color-foreground)]">{selectedSkus.size} SKUs selected</span>
              </div>
              <div className="w-[1px] h-8 bg-[var(--color-border)]" />
              <div className="flex gap-2">
                <Button 
                   variant="ghost" 
                   size="sm" 
                   className="h-9 gap-2 text-violet-600 hover:bg-violet-500/10 font-bold"
                   onClick={() => {
                      const selected = gridApi.getSelectedRows();
                      selected.forEach(s => handleDuplicate(s));
                   }}
                >
                  <Copy size={14} /> Duplicate ({selectedSkus.size}x)
                </Button>
                <Button 
                   variant="ghost" 
                   size="sm" 
                   className="h-9 gap-2 text-red-600 hover:bg-red-500/10 font-bold"
                   onClick={handleBulkDelete}
                >
                  <Trash2 size={14} /> Delete Selection
                </Button>
              </div>
              <button 
                onClick={() => { gridApi.deselectAll(); setSelectedSkus(new Set()); }}
                className="p-1.5 hover:bg-[var(--color-muted)] rounded-full transition-colors"
              >
                <X size={16} className="text-[var(--color-muted-foreground)]" />
              </button>
            </div>
          </div>
        )}
        )}
      </div>

      {/* Pagination View Controls (Bottom Bar) */}
      <div className="flex items-center justify-between bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm">
        <div className="flex gap-4 items-center overflow-x-auto no-scrollbar py-1">
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
