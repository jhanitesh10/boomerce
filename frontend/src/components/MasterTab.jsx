import {
  Plus, Search, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown,
  ArrowUpDown, LayoutGrid, Rocket, FileEdit, Download, Upload,
  SquarePen, Check, X, Filter, Maximize2, Minimize2, StickyNote, Send, Trash2, RefreshCcw
} from 'lucide-react';


import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import SkuMasterForm from './SkuMasterForm';
import InlineCellEditor from './InlineCellEditor';
import ExportSlideOver from './ExportSlideOver';
import ImportSlideOver from './ImportSlideOver';
import TopFilterBar from './TopFilterBar';

import { skuApi, refApi } from '../api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_VARIANTS = { active:'success', inactive:'destructive', draft:'draft', development:'development', 'in development':'development' };
function StatusBadge({ label }) {
  const key = label?.toLowerCase();
  const display = (key === 'in development' || key === 'development') ? 'New Launch' : label;
  return <Badge variant={STATUS_VARIANTS[key] || 'secondary'}>{display || 'Unknown'}</Badge>;
}

// ── Base columns (always visible, rowSpan=2, pinned left) ─────────────────────
const BASE_COLS = [
  { id: 'actions',            label: '',         width: 44,  align: 'center', noInline: true, sticky: true, stickyLeft: 0 },
  { id: 'primary_image_url',  label: 'Image',    width: 68,  align: 'center', noInline: true, sticky: true, stickyLeft: 44 },
  { id: 'product_name',       label: 'Product',  width: 260, sortable: true,  sticky: true, stickyLeft: 112 },
  { id: 'barcode',            label: 'SKU / EAN / Barcode ID',  width: 160, isMono: true,    sticky: true, stickyLeft: 372 },
];

const REMARKS_COL = { id: 'remark', label: 'Notes', width: 62, align: 'center', sticky: true, isRight: true };


// ── Column groups (collapsed → only first col shown) ──────────────────────────
const GROUPS = [
  {
    id: 'classification', label: 'Classification', color: 'violet',
    cols: [
      { id: 'status_reference_id',       label: 'Status',         width: 115 },
      { id: 'brand_reference_id',        label: 'Brand',          width: 140 },
      { id: 'category_reference_id',     label: 'Category',       width: 140 },
      { id: 'sub_category_reference_id', label: 'Sub-Category',   width: 150 },
    ],
  },
  {
    id: 'pricing_specs', label: 'Pricing & Specs', color: 'emerald',
    cols: [
      { id: 'mrp',            label: 'MRP (₹)',  width: 100, align: 'right', sortable: true, isNum: true },
      { id: 'purchase_cost',  label: 'Cost (₹)', width: 100, align: 'right', isNum: true },
      { id: 'net_content',           label: 'Net Content',  width: 120, align: 'right', noInline: true },
      { id: 'color',                 label: 'Color',        width: 110 },
      { id: 'raw_product_size',      label: 'Raw Size',     width: 110 },
      { id: 'package_size',          label: 'Pack Size',    width: 110 },
      { id: 'package_weight',        label: 'Pack Wt (g)',  width: 105, align: 'right' },
      { id: 'raw_product_weight',    label: 'Raw Wt (g)',   width: 105, align: 'right' },
      { id: 'finished_product_weight', label: 'Fin Wt (g)', width: 105, align: 'right' },
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
       { id: 'tax_percent',    label: 'Tax %',    width: 82,  align: 'right' },
       { id: 'tax_rule_code',  label: 'Tax Rule (HSN)', width: 110, isMono: true },
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
const GC = {
  violet:  { row1: 'bg-violet-50  text-violet-700  border-violet-200',  row2: 'bg-violet-50/70',  td: 'bg-violet-50/25',  pill: 'bg-violet-100 text-violet-700 hover:bg-violet-200'  },
  emerald: { row1: 'bg-emerald-50 text-emerald-700 border-emerald-200', row2: 'bg-emerald-50/70', td: 'bg-emerald-50/25', pill: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  blue:    { row1: 'bg-blue-50    text-blue-700    border-blue-200',    row2: 'bg-blue-50/70',    td: 'bg-blue-50/25',    pill: 'bg-blue-100 text-blue-700 hover:bg-blue-200'    },
  amber:   { row1: 'bg-amber-50   text-amber-700   border-amber-200',   row2: 'bg-amber-50/70',   td: 'bg-amber-50/25',   pill: 'bg-amber-100 text-amber-700 hover:bg-amber-200'   },
  orange:  { row1: 'bg-orange-50  text-orange-700  border-orange-200',  row2: 'bg-orange-50/70',  td: 'bg-orange-50/25',  pill: 'bg-orange-100 text-orange-700 hover:bg-orange-200'  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const NON_INLINE = new Set(['primary_image_url', 'net_content', 'content_trigger', 'catalog_url', 'remark']);
const REF_MAP    = { 
  brand_reference_id: 'BRAND', 
  category_reference_id: 'CATEGORY', 
  sub_category_reference_id: 'SUB_CATEGORY', 
  status_reference_id: 'STATUS',
  bundle_type: 'BUNDLE_TYPE',
  pack_type: 'PACK_TYPE'
};
const FILTER_TABS = [
  { key: 'all',            icon: LayoutGrid, label: (c, t) => `All (${t})` },
  { key: 'draft',          icon: FileEdit,   label: c => `Draft (${c['draft'] || 0})` },
  { key: 'in development', icon: Rocket,     label: c => `New Launches (${c['in development'] || c['development'] || 0})` },
];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ── Note Popover Component ──────────────────────────────────────────────────
function NotePopover({ sku, onSave, onClose, onDraftChange }) {
  const [val, setVal] = useState(sku.remark || '');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
       textareaRef.current.focus();
       // Place cursor at end
       textareaRef.current.setSelectionRange(val.length, val.length);
    }
    onDraftChange(val); // Initialize draft
  }, []);

  const handleChange = (newVal) => {
    setVal(newVal);
    onDraftChange(newVal);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    await onSave(val);
    setSaving(false);
  };


  return (
    <div 
      className="note-popover absolute bottom-full right-0 mb-2 w-64 bg-white rounded-2xl shadow-2xl border border-[var(--color-border)] p-4 z-[100] animate-[scale-in_0.15s_ease-out] text-left"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)] pb-2 -mx-1">
        <div className="flex items-center gap-1.5 px-1">
           <div className="w-1.5 h-4 bg-[var(--color-primary)] rounded-full" />
           <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-foreground)]">SKU Notes</span>
        </div>
        <div className="flex items-center gap-1">
          {val && (
            <button 
              onClick={() => setVal('')} 
              className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-md transition-all text-[var(--color-muted-foreground)] flex items-center gap-1 px-2"
              title="Clear text"
            >
              <Trash2 size={13} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Clear</span>
            </button>
          )}
          <button onClick={onClose} className="p-1 px-2 hover:bg-slate-100 rounded-md transition-colors text-[var(--color-muted-foreground)]">
            <X size={14} />
          </button>
        </div>
      </div>

      
      <textarea
        ref={textareaRef}
        value={val}
        onChange={e => handleChange(e.target.value)}
        placeholder="Add product remarks or comments here..."

        className="w-full h-24 p-3 text-xs rounded-xl border border-[var(--color-border)] bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all resize-none text-[var(--color-foreground)] leading-relaxed"
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
          if (e.key === 'Escape') onClose();
        }}
      />
      
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <span className="text-[10px] text-[var(--color-muted-foreground)] italic whitespace-nowrap opacity-70">
          Ctrl + Enter to save
        </span>
        <div className="flex-1" />
        <Button 
          size="sm" 
          onClick={handleSave} 
          disabled={saving}
          className="h-8 px-4 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-md shadow-[var(--color-primary)]/20 min-w-[120px]"
        >
          {saving ? <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Send size={12} />}
          <span>{sku.remark ? 'Update & Close' : 'Add Note & Close'}</span>
        </Button>
      </div>

      
      {/* Tiny arrow pointing to the icon */}
      <div className="absolute top-full right-5 w-3 h-3 bg-white border-r border-b border-[var(--color-border)] rotate-45 -translate-y-[6px]" />
    </div>
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
          <p className="text-[11px] font-mono text-[var(--color-muted-foreground)] mt-1">{sku.sku_code || sku.barcode || 'NO SKU CODE'}</p>
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
           {sku.remark && (
             <div className="flex items-center gap-1 text-[var(--color-primary)] text-[10px] font-bold bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
               <StickyNote size={10} fill="currentColor" fillOpacity={0.2} />
               <span>Note</span>
             </div>
           )}
        </div>
        <button 
          onClick={onNote}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors active:scale-95"
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
  const [references,     setReferences]     = useState({ BRAND:{}, CATEGORY:{}, STATUS:{}, SUB_CATEGORY:{}, BUNDLE_TYPE:{}, PACK_TYPE:{} });
  const [refLists,       setRefLists]       = useState({ BRAND:[], CATEGORY:[], STATUS:[], SUB_CATEGORY:[], BUNDLE_TYPE:[], PACK_TYPE:[] });
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [sortCol,        setSortCol]        = useState('product_name');
  const [sortDir,        setSortDir]        = useState('asc');
  const [page,           setPage]           = useState(1);
  const [pageSize,       setPageSize]       = useState(25);
  const [isFormOpen,     setIsFormOpen]     = useState(false);
  const [isExportOpen,   setIsExportOpen]   = useState(false);
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
  const [activeNoteSkuId, setActiveNoteSkuId] = useState(null);
  const noteDraftRef   = useRef('');
  const savingRef      = useRef(false);



  // ── Component Helpers ───────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [skuData, brands, cats, statuses, bundles, packs] = await Promise.all([
        skuApi.getAll(),
        refApi.getAll('BRAND'),
        refApi.getAll('CATEGORY'),
        refApi.getAll('STATUS'),
        refApi.getAll('BUNDLE_TYPE'),
        refApi.getAll('PACK_TYPE')
      ]);
      let subcats = [];
      try { subcats = await refApi.getAll('SUB_CATEGORY'); } catch { /* ignore */ }
      const toMap = arr => (arr || []).reduce((a, r) => ({ ...a, [r.id]: r.label }), {});
      setSkus(skuData || []);
      setReferences({ 
        BRAND: toMap(brands), 
        CATEGORY: toMap(cats), 
        STATUS: toMap(statuses), 
        SUB_CATEGORY: toMap(subcats),
        BUNDLE_TYPE: toMap(bundles),
        PACK_TYPE: toMap(packs)
      });
      setRefLists({ 
        BRAND: brands, 
        CATEGORY: cats, 
        STATUS: statuses, 
        SUB_CATEGORY: subcats,
        BUNDLE_TYPE: bundles,
        PACK_TYPE: packs
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const saveInlineEdit = useCallback(async (skuId, colId, value) => {
    if (savingRef.current) return; savingRef.current = true;
    const parsed = value === '' ? null : value;
    setInlineEdit(null);
    if (parsed !== undefined) {
      setSkus(prev => prev.map(s => s.id === skuId ? { ...s, [colId]: parsed } : s));
      try { await skuApi.update(skuId, { [colId]: parsed }); }
      catch (err) { console.error('Save failed:', err); loadAll(); }
    }
    savingRef.current = false;
  }, [loadAll]);

  const handleNoteClose = useCallback(async () => {
    if (!activeNoteSkuId) return;
    const sku = skus.find(s => s.id === activeNoteSkuId);
    const draft = noteDraftRef.current;
    
    // Only save if changed
    if (sku && draft !== (sku.remark || '')) {
      await saveInlineEdit(activeNoteSkuId, 'remark', draft);
    }
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

  // ── Inline editor ───────────────────────────────────────────────────────────
  // ── Cell renderer ───────────────────────────────────────────────────────────
  const renderCell = (col, sku, openFullEdit) => {
    if (inlineEdit?.skuId===sku.id && inlineEdit?.colId===col.id) {
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
      case 'primary_image_url': return (
        <div className="w-10 h-10 mx-auto rounded-xl overflow-hidden border border-[var(--color-border)]">
          {val ? <img src={val} alt="sku" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-[var(--color-muted)]"><ImageIcon size={16} className="text-[var(--color-muted-foreground)]"/></div>}
        </div>
      );
      case 'barcode': return (
        <span className="font-mono text-xs font-semibold text-[var(--color-foreground)] truncate">
          {sku.sku_code || sku.barcode || ''}
        </span>
      );
      case 'product_name': return (
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-medium text-[var(--color-foreground)]/85 text-[13.5px] leading-snug whitespace-normal break-words line-clamp-2" title={val}>
            {val || <span className="text-[var(--color-muted-foreground)] font-normal italic text-[11px]">Unnamed Product</span>}
          </span>
        </div>
      );
      case 'status_reference_id': { const lbl = references.STATUS[val]; return lbl ? <StatusBadge label={lbl}/> : <span className="text-xs text-[var(--color-muted-foreground)]">—</span>; }
      case 'brand_reference_id':        return <span className="text-sm text-[var(--color-foreground)]">{references.BRAND[val] || '—'}</span>;
      case 'category_reference_id':     return <span className="text-sm text-[var(--color-muted-foreground)]">{references.CATEGORY[val] || '—'}</span>;
      case 'sub_category_reference_id': return <span className="text-sm text-[var(--color-muted-foreground)]">{references.SUB_CATEGORY[val] || '—'}</span>;
      case 'bundle_type':               return <span className="text-sm text-[var(--color-foreground)] font-medium">{references.BUNDLE_TYPE[val] || val || '—'}</span>;
      case 'pack_type':                 return <span className="text-sm text-[var(--color-muted-foreground)]">{references.PACK_TYPE[val] || val || '—'}</span>;
      case 'net_content':  return <span className="text-sm text-[var(--color-muted-foreground)]">{sku.net_content_value ? `${sku.net_content_value} ${sku.net_content_unit||''}` : '—'}</span>;
      case 'tax_percent':  return <span className="text-sm text-[var(--color-muted-foreground)]">{val!=null ? `${val}%` : '—'}</span>;
      case 'catalog_url':  return val ? <a href={val} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="text-xs text-[var(--color-primary)] underline underline-offset-2 truncate block">Link ↗</a> : <span className="text-xs text-[var(--color-muted-foreground)]">—</span>;
      case 'createdAt': {
        if (!val) return <span className="text-sm text-[var(--color-muted-foreground)]">—</span>;
        const d = new Date(val);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--color-foreground)] leading-tight">{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className="text-[10px] text-[var(--color-muted-foreground)] tabular-nums opacity-70 uppercase">{d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          </div>
        );
      }

      case 'remark': return (
        <div className="relative flex items-center justify-center">
          <button 
            onClick={(e) => { e.stopPropagation(); setActiveNoteSkuId(prev => prev === sku.id ? null : sku.id); }}
            className={cn(
              "note-trigger p-2 rounded-lg transition-all mx-auto relative group-hover:scale-110",

              val ? "text-[var(--color-primary)] bg-[var(--color-primary)]/10" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            )}
            title={val || "Add Note"}
          >
            <StickyNote size={15} fill={val ? "currentColor" : "none"} fillOpacity={0.2} />
            {val && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full border border-white" />}
          </button>
          
          {activeNoteSkuId === sku.id && (
            <NotePopover 
              sku={sku} 
              onSave={(v) => saveInlineEdit(sku.id, 'remark', v).then(() => setActiveNoteSkuId(null))}
              onClose={handleNoteClose}
              onDraftChange={(v) => { noteDraftRef.current = v; }}
            />
          )}

        </div>
      );

      default:

        if (val==null||val==='') return <span className="text-sm text-[var(--color-muted-foreground)]">—</span>;
        if (col.isNum)    return <span className="font-semibold text-sm tabular-nums">₹{Number(val).toLocaleString('en-IN')}</span>;
        if (col.isMono)   return <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{val}</span>;
        if (col.isContent) return (
          <div className="group/large-text relative max-w-full">
            <span className="text-[10.5px] text-[var(--color-muted-foreground)]/60 line-clamp-3 leading-relaxed cursor-help hover:text-[var(--color-foreground)] transition-colors" title={val}>
              {val}
            </span>
          </div>
        );
        return <span className="text-sm text-[var(--color-muted-foreground)]">{val}</span>;
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
      <div className={cn("flex justify-between gap-4", isMobile ? "flex-col items-start" : "items-center")}>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-foreground)] tracking-tight">Prompt Master</h2>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Click any cell to edit inline · Hover image to open full form</p>
        </div>
        <div className={cn("flex items-center gap-2", isMobile && "w-full justify-start")}>
          <Button variant="outline" size="sm" className={cn("gap-1.5 h-[34px]", isMobile && "flex-1")} onClick={()=>setIsImportOpen(true)}><Upload size={14}/> Import</Button>
          <Button variant="outline" size="sm" className={cn("gap-1.5 h-[34px]", isMobile && "flex-1")} onClick={()=>setIsExportOpen(true)}><Download size={14}/> Export</Button>
          {!isMobile && <Button size="sm" className="gap-1.5 ml-1 h-[34px]" onClick={()=>{setEditingSku(null);setIsFormOpen(true);}}><Plus size={14}/> Add Product</Button>}
        </div>
        {isMobile && (
          <Button size="sm" className="w-full gap-1.5 h-[38px] shadow-lg shadow-[var(--color-primary)]/20" onClick={()=>{setEditingSku(null);setIsFormOpen(true);}}><Plus size={16}/> Add New Product</Button>
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
          <div className={cn("flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 h-[32px] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all bg-[var(--color-card)]", isMobile && "h-[38px]")}>
            <Search size={14} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search product, SKU..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
              className="bg-transparent text-xs w-full outline-none text-slate-700 placeholder:text-slate-400"
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
          {paginated.length === 0 ? (
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
                      className={cn("px-4 py-3 text-left whitespace-nowrap select-none border-b-2 border-[var(--color-border)] bg-[var(--color-muted)]",
                        col.sticky && "sticky z-20 shadow-[inset_-1px_0_0_var(--color-border)]")}
                      style={{width:col.width, minWidth:col.width, textAlign:col.align||'left', left:col.sticky?col.stickyLeft:undefined}}>
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
                        className={cn("px-4 py-3 text-left whitespace-nowrap select-none border-b-2 border-[var(--color-border)]",
                          idx===0 && "border-l border-[var(--color-border)]", gc.row2)}
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
                  <th className="sticky top-0 right-0 z-30 p-3 bg-[var(--color-muted)] border-b-2 border-l border-[var(--color-border)] shadow-[inset_1px_0_0_var(--color-border)]">
                    <div className="flex items-center justify-center gap-1.5 opacity-60">
                      <StickyNote size={13} className="text-[var(--color-muted-foreground)]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Notes</span>
                    </div>
                  </th>
                </tr>
              </thead>


              <tbody>
                {loading ? (
                  <tr><td colSpan={visibleCols.length} className="py-20 text-center text-sm text-[var(--color-muted-foreground)]">Loading products…</td></tr>
                ) : paginated.length===0 ? (
                  <tr>
                    <td colSpan={visibleCols.length} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                          <Search size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">No products found</p>
                          <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search terms to find what you're looking for.</p>
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
                    <tr key={sku.id} className="group bg-[var(--color-card)] hover:bg-[var(--color-muted)]/30 transition-colors">
                      {visibleCols.map((col) => {
                        const isActive   = inlineEdit?.skuId===sku.id && inlineEdit?.colId===col.id;
                        const isSelected = selectedCell?.skuId===sku.id && selectedCell?.colId===col.id && !isActive;
                        const canInline  = !col.noInline && !NON_INLINE.has(col.id) && col.id!=='primary_image_url';
                        const grp        = colGroupMap[col.id];
                        const gc         = grp ? GC[grp.color] : null;
                        // First col of a group gets a left border
                        const isFirstGroupCol = grp && GROUPS.find(g=>g.id===grp.id)?.cols[0]?.id===col.id;
                        const isNoteActive = activeNoteSkuId === sku.id;
                        return (
                          <td key={`${sku.id}-${col.id}`}
                            onClick={isActive ? undefined : () => setSelectedCell({skuId: sku.id, colId: col.id})}
                            onDoubleClick={isActive || !canInline ? undefined : () => { startInlineEdit(sku, col.id); setSelectedCell(null); }}
                            className={cn(
                              "border-b border-[var(--color-border)] transition-all relative group/cell",
                              isActive ? "p-0 z-30" : "px-4 py-3 cursor-default align-top",
                              isSelected && "outline outline-2 outline-[var(--color-primary)] outline-offset-[-2px] z-20 bg-[var(--color-primary)]/10 shadow-sm",
                              col.sticky && "sticky z-10 bg-[var(--color-card)]",
                              col.sticky && !col.isRight && "shadow-[inset_-1px_0_0_transparent]",
                              col.sticky && col.isRight && "right-0 shadow-[inset_1px_0_0_var(--color-border)]",
                              /* Ensure open popover is above everything */
                              isNoteActive && col.id === 'remark' && "z-[50] overflow-visible",
                              /* Ensure base columns have a right border when scrolling */
                              col.sticky && !col.isRight && (col.id === 'barcode' ? "!shadow-[inset_-1px_0_0_var(--color-border)]" : ""),
                              gc && !isActive && !isSelected && gc.td,
                              isFirstGroupCol && "border-l border-[var(--color-border)]",
                            )}
                            style={{
                              width: col.width, minWidth: col.width,
                              maxWidth: isActive ? undefined : col.width,
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
      {isExportOpen && <ExportSlideOver skus={skus} filtered={filtered} paginated={paginated} references={references} onClose={()=>setIsExportOpen(false)} />}
      {isImportOpen && <ImportSlideOver skus={skus} refLists={refLists} onClose={()=>setIsImportOpen(false)} onImportComplete={()=>{setIsImportOpen(false);loadAll();}} />}

    </div>
  );
}

