import {
  Plus, Search, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown,
  ArrowUpDown, LayoutGrid, Rocket, FileEdit, Download, Upload,
  SquarePen, Check, X, Filter, Maximize2, Minimize2
} from 'lucide-react';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import SkuMasterForm from './SkuMasterForm';
import InlineCellEditor from './InlineCellEditor';
import ExportSlideOver from './ExportSlideOver';
import ImportSlideOver from './ImportSlideOver';
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
  { id: 'barcode',            label: 'Barcode',  width: 130, isMono: true,    sticky: true, stickyLeft: 372 },
];

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
      { id: 'product_type',                 label: 'Prod Type',    width: 120 },
      { id: 'bundle_type',                  label: 'Bundle Type',  width: 120 },
      { id: 'pack_type',                    label: 'Pack Type',    width: 115 },
      { id: 'product_component_group_code', label: 'Group Code',   width: 120, isMono: true },
    ],
  },
  {
     id: 'tax', label: 'Tax & Compliance', color: 'blue',
     cols: [
       { id: 'tax_percent',    label: 'Tax %',    width: 82,  align: 'right' },
       { id: 'tax_rule_code',  label: 'Tax Rule', width: 110, isMono: true },
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
const NON_INLINE = new Set(['primary_image_url', 'net_content', 'content_trigger', 'catalog_url']);
const REF_MAP    = { brand_reference_id:'BRAND', category_reference_id:'CATEGORY', sub_category_reference_id:'SUB_CATEGORY', status_reference_id:'STATUS' };
const FILTER_TABS = [
  { key: 'all',            icon: LayoutGrid, label: (c, t) => `All (${t})` },
  { key: 'draft',          icon: FileEdit,   label: c => `Draft (${c['draft'] || 0})` },
  { key: 'in development', icon: Rocket,     label: c => `New Launches (${c['in development'] || c['development'] || 0})` },
];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ── Component ─────────────────────────────────────────────────────────────────
export default function MasterTab() {
  const [skus,           setSkus]           = useState([]);
  const [references,     setReferences]     = useState({ BRAND:{}, CATEGORY:{}, STATUS:{}, SUB_CATEGORY:{} });
  const [refLists,       setRefLists]       = useState({ BRAND:[], CATEGORY:[], STATUS:[], SUB_CATEGORY:[] });
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
  const [editingSku,     setEditingSku]     = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [inlineEdit,     setInlineEdit]     = useState(null); // { skuId, colId }
  const [selectedCell,   setSelectedCell]   = useState(null); // { skuId, colId }
  const savingRef      = useRef(false);

  useEffect(() => { loadAll(); }, []);
  
  // Clear selection if user clicks entirely outside the table
  useEffect(() => {
    const handleGlobalClick = (e) => { if (!e.target.closest('td')) setSelectedCell(null); };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [skuData, brands, cats, statuses] = await Promise.all([skuApi.getAll(), refApi.getAll('BRAND'), refApi.getAll('CATEGORY'), refApi.getAll('STATUS')]);
      let subcats = [];
      try { subcats = await refApi.getAll('SUB_CATEGORY'); } catch (_) {}
      const toMap = arr => arr.reduce((a, r) => ({ ...a, [r.id]: r.label }), {});
      setSkus(skuData);
      setReferences({ BRAND: toMap(brands), CATEGORY: toMap(cats), STATUS: toMap(statuses), SUB_CATEGORY: toMap(subcats) });
      setRefLists({ BRAND: brands, CATEGORY: cats, STATUS: statuses, SUB_CATEGORY: subcats });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleGroup    = useCallback(gid => setExpandedGroups(prev => { const n = new Set(prev); n.has(gid) ? n.delete(gid) : n.add(gid); return n; }), []);
  const startInlineEdit = useCallback((sku, colId) => { if (NON_INLINE.has(colId)) return; savingRef.current = false; setInlineEdit({ skuId: sku.id, colId }); }, []);
  const cancelInlineEdit = useCallback(() => { savingRef.current = false; setInlineEdit(null); }, []);
  const saveInlineEdit   = useCallback(async (skuId, colId, value) => {
    if (savingRef.current) return; savingRef.current = true;
    const parsed = value === '' ? null : value;
    setInlineEdit(null);
    if (parsed !== undefined) {
      setSkus(prev => prev.map(s => s.id === skuId ? { ...s, [colId]: parsed } : s));
      try { await skuApi.update(skuId, { [colId]: parsed }); }
      catch (err) { console.error('Save failed:', err); loadAll(); }
    }
    savingRef.current = false;
  }, []);

  // Flatten visible columns for data rows
  const visibleCols = useMemo(() => {
    const cols = [...BASE_COLS];
    for (const g of GROUPS) {
      const expanded = expandedGroups.has(g.id);
      cols.push(...(expanded ? g.cols : [g.cols[0]]));
    }
    return cols;
  }, [expandedGroups]);

  const filtered = useMemo(() => skus.filter(s => {
    const q = search.toLowerCase();
    const match = !q || s.product_name?.toLowerCase().includes(q) || s.sku_code?.toLowerCase().includes(q) || s.barcode?.toLowerCase().includes(q);
    const statusLabel = references.STATUS[s.status_reference_id]?.toLowerCase() || '';
    return match && (statusFilter === 'all' || statusLabel === statusFilter);
  }).sort((a, b) => {
    let va = a[sortCol] ?? '', vb = b[sortCol] ?? '';
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    return va < vb ? (sortDir === 'asc' ? -1 : 1) : va > vb ? (sortDir === 'asc' ? 1 : -1) : 0;
  }), [skus, search, statusFilter, references, sortCol, sortDir]);

  const totalPages    = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated     = filtered.slice((page - 1) * pageSize, page * pageSize);
  const handleSort    = colId => { const c = [...BASE_COLS, ...GROUPS.flatMap(g => g.cols)].find(col => col.id === colId); if (!c?.sortable) return; sortCol === colId ? setSortDir(d => d==='asc'?'desc':'asc') : (setSortCol(colId), setSortDir('asc')); setPage(1); };
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
      case 'product_name': return (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold text-[var(--color-foreground)] text-sm leading-tight truncate block">{val || <span className="text-[var(--color-muted-foreground)] font-normal italic text-xs">Unnamed</span>}</span>
          {sku.sku_code && <span className="font-mono text-[10px] text-[var(--color-muted-foreground)] bg-[var(--color-muted)] rounded px-1.5 py-0.5 w-fit leading-none">{sku.sku_code}</span>}
        </div>
      );
      case 'status_reference_id': { const lbl = references.STATUS[val]; return lbl ? <StatusBadge label={lbl}/> : <span className="text-xs text-[var(--color-muted-foreground)]">—</span>; }
      case 'brand_reference_id':        return <span className="text-sm text-[var(--color-foreground)]">{references.BRAND[val] || '—'}</span>;
      case 'category_reference_id':     return <span className="text-sm text-[var(--color-muted-foreground)]">{references.CATEGORY[val] || '—'}</span>;
      case 'sub_category_reference_id': return <span className="text-sm text-[var(--color-muted-foreground)]">{references.SUB_CATEGORY[val] || '—'}</span>;
      case 'net_content':  return <span className="text-sm text-[var(--color-muted-foreground)]">{sku.net_content_value ? `${sku.net_content_value} ${sku.net_content_unit||''}` : '—'}</span>;
      case 'tax_percent':  return <span className="text-sm text-[var(--color-muted-foreground)]">{val!=null ? `${val}%` : '—'}</span>;
      case 'catalog_url':  return val ? <a href={val} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="text-xs text-[var(--color-primary)] underline underline-offset-2 truncate block">Link ↗</a> : <span className="text-xs text-[var(--color-muted-foreground)]">—</span>;
      default:
        if (val==null||val==='') return <span className="text-sm text-[var(--color-muted-foreground)]">—</span>;
        if (col.isNum)    return <span className="font-semibold text-sm tabular-nums">₹{Number(val).toLocaleString('en-IN')}</span>;
        if (col.isMono)   return <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{val}</span>;
        if (col.isContent) return <span className="text-xs text-[var(--color-muted-foreground)] line-clamp-2" title={val}>{val}</span>;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-foreground)] tracking-tight">Product Master</h2>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Click any cell to edit inline · Hover image to open full form</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-[34px]" onClick={()=>setIsImportOpen(true)}><Upload size={14}/> Import</Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-[34px]" onClick={()=>setIsExportOpen(true)}><Download size={14}/> Export</Button>
          <Button size="sm" className="gap-1.5 ml-1 h-[34px]" onClick={()=>{setEditingSku(null);setIsFormOpen(true);}}><Plus size={14}/> Add Product</Button>
        </div>
      </div>

      {/* ── Table Global Toolbar ── */}
      <div className="flex items-center justify-between bg-[var(--color-card)] p-2 rounded-xl border border-[var(--color-border)] shadow-sm">
        
        {/* Left: View Controls */}
        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center border border-[var(--color-border)] rounded-lg p-1 bg-[var(--color-muted)]">
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

          <div className="w-px h-6 bg-[var(--color-border)] mx-1" />

          {/* Search */}
          <div className="flex items-center gap-1.5 border border-[var(--color-border)] rounded-lg px-2.5 h-[32px] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all bg-[var(--color-card)]">
            <Search size={14} className="text-[var(--color-muted-foreground)]" />
            <input 
              type="text" 
              placeholder="Search product, SKU..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
              className="bg-transparent text-xs w-48 outline-none text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
            />
          </div>

          {/* Filter / Sort Buttons */}
          <Button variant="outline" size="sm" className="h-[32px] gap-1.5 px-3 text-[var(--color-muted-foreground)]"><Filter size={13}/> Filter</Button>
          <Button variant="outline" size="sm" className="h-[32px] gap-1.5 px-3 text-[var(--color-muted-foreground)]"><ArrowUpDown size={13}/> Sort</Button>
        </div>

        {/* Right: Expand / Collapse All */}
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
      </div>

      {/* ── Table card ── */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto" style={{scrollbarWidth:'thin'}}>
          <table className="w-full border-collapse" style={{borderSpacing:0}}>
            <thead>
              {/* ── Row 1: base cols (rowSpan=2) + group parent headers ── */}
              <tr>
                {BASE_COLS.map(col => (
                  <th key={col.id} rowSpan={2}
                    className={cn("px-4 border-b-2 border-[var(--color-border)] bg-[var(--color-muted)] whitespace-nowrap select-none align-bottom pb-2",
                      col.sticky && "sticky z-20 shadow-[inset_-1px_0_0_var(--color-border)]")}
                    style={{width:col.width, minWidth:col.width, textAlign:col.align||'left', left:col.sticky?col.stickyLeft:undefined}}>
                    <span onClick={()=>col.sortable&&handleSort(col.id)} className={cn("text-[11px] font-semibold tracking-widest uppercase text-[var(--color-muted-foreground)]",col.sortable&&"cursor-pointer hover:text-[var(--color-primary)] transition-colors")}>
                      {col.label}
                      {col.sortable&&sortCol===col.id&&<ArrowUpDown size={10} className="inline ml-1 text-[var(--color-primary)]"/>}
                      {col.sortable&&sortCol!==col.id&&<ArrowUpDown size={10} className="inline ml-1 opacity-20"/>}
                    </span>
                  </th>
                ))}

                {GROUPS.map(g => {
                  const expanded = expandedGroups.has(g.id);
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
              </tr>

              {/* ── Row 2: group sub-column names ── */}
              <tr>
                {GROUPS.map(g => {
                  const expanded  = expandedGroups.has(g.id);
                  const shownCols = expanded ? g.cols : [g.cols[0]];
                  const gc        = GC[g.color];
                  return shownCols.map((col, idx) => (
                    <th key={col.id}
                      className={cn("px-4 py-2 text-left whitespace-nowrap select-none border-b-2 border-[var(--color-border)]",
                        idx===0 && "border-l border-[var(--color-border)]", gc.row2)}
                      style={{width:col.width, minWidth:col.width, textAlign:col.align||'left'}}>
                      <span onClick={()=>col.sortable&&handleSort(col.id)} className={cn("text-[11px] font-semibold tracking-wide uppercase text-[var(--color-muted-foreground)]", col.sortable&&"cursor-pointer hover:text-[var(--color-primary)] transition-colors")}>
                        {col.label}
                        {col.sortable&&sortCol===col.id&&<ArrowUpDown size={10} className="inline ml-1 text-[var(--color-primary)]"/>}
                        {col.sortable&&sortCol!==col.id&&<ArrowUpDown size={10} className="inline ml-1 opacity-20"/>}
                      </span>
                    </th>
                  ));
                })}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={visibleCols.length} className="py-20 text-center text-sm text-[var(--color-muted-foreground)]">Loading products…</td></tr>
              ) : paginated.length===0 ? (
                <tr><td colSpan={visibleCols.length} className="py-20 text-center text-sm text-[var(--color-muted-foreground)]">No products found.</td></tr>
              ) : paginated.map(sku => {
                const openFullEdit = () => { setEditingSku(sku); setIsFormOpen(true); };
                return (
                  <tr key={sku.id} className="group bg-[var(--color-card)] hover:bg-[var(--color-muted)]/30 transition-colors">
                    {visibleCols.map((col, colIdx) => {
                      const isActive   = inlineEdit?.skuId===sku.id && inlineEdit?.colId===col.id;
                      const isSelected = selectedCell?.skuId===sku.id && selectedCell?.colId===col.id && !isActive;
                      const canInline  = !col.noInline && !NON_INLINE.has(col.id) && col.id!=='primary_image_url';
                      const grp        = colGroupMap[col.id];
                      const gc         = grp ? GC[grp.color] : null;
                      // First col of a group gets a left border
                      const isFirstGroupCol = grp && GROUPS.find(g=>g.id===grp.id)?.cols[0]?.id===col.id;
                      return (
                        <td key={`${sku.id}-${col.id}`}
                          onClick={isActive ? undefined : () => setSelectedCell({skuId: sku.id, colId: col.id})}
                          onDoubleClick={isActive || !canInline ? undefined : () => { startInlineEdit(sku, col.id); setSelectedCell(null); }}
                          className={cn(
                            "border-b border-[var(--color-border)] transition-all relative group/cell",
                            isActive ? "p-0 z-30" : "px-4 py-3 cursor-default",
                            isSelected && "outline outline-2 outline-[var(--color-primary)] outline-offset-[-2px] z-20 bg-[var(--color-primary)]/10 shadow-sm",
                            col.sticky && "sticky z-10 bg-[var(--color-card)] shadow-[inset_-1px_0_0_transparent]",
                            /* Ensure base columns have a right border when scrolling */
                            col.sticky && (col.id === 'barcode' ? "!shadow-[inset_-1px_0_0_var(--color-border)]" : ""),
                            gc && !isActive && !isSelected && gc.td,
                            isFirstGroupCol && "border-l border-[var(--color-border)]",
                          )}
                          style={{
                            width: col.width, minWidth: col.width,
                            maxWidth: isActive ? undefined : col.width,
                            left: col.sticky ? col.stickyLeft : undefined,
                            textAlign: col.align||'left',
                            overflow: isActive ? 'visible' : 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: isActive ? 'normal' : 'nowrap',
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
            <span>Showing {Math.min((page-1)*pageSize+1,filtered.length)}–{Math.min(page*pageSize,filtered.length)} of {filtered.length}</span>
            <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}} className="border border-[var(--color-border)] rounded-md bg-[var(--color-card)] text-[var(--color-foreground)] text-xs px-1.5 py-1 outline-none cursor-pointer">
              {PAGE_SIZE_OPTIONS.map(n=><option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={15}/></button>
            {pageNums.map((n,i)=>n==='…'
              ? <span key={`g${i}`} className="px-1 text-xs text-[var(--color-muted-foreground)]">…</span>
              : <button key={n} onClick={()=>setPage(n)} className={cn("flex items-center justify-center w-8 h-8 rounded-lg border text-xs transition-colors", page===n?"bg-[var(--color-primary)] border-[var(--color-primary)] text-white font-semibold":"border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]")}>{n}</button>)}
            <button onClick={()=>setPage(p=>Math.max(totalPages,p+1))} disabled={page===totalPages} className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={15}/></button>
          </div>
        </div>
      </div>

      {isFormOpen && <SkuMasterForm initialData={editingSku} onClose={()=>setIsFormOpen(false)} onSaved={()=>{setIsFormOpen(false);loadAll();}}/>}
      {isExportOpen && <ExportSlideOver skus={skus} filtered={filtered} paginated={paginated} references={references} onClose={()=>setIsExportOpen(false)} />}
      {isImportOpen && <ImportSlideOver skus={skus} refLists={refLists} onClose={()=>setIsImportOpen(false)} onImportComplete={()=>{setIsImportOpen(false);loadAll();}} />}
    </div>
  );
}
