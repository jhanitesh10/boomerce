import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, ChevronDown, ChevronRight, FileSpreadsheet, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FIELD_LABELS = {
  product_name: "Product Name", sku_code: "SKU / EAN / Barcode ID", barcode: "SKU / EAN / Barcode ID", brand_reference_id: "Brand",
  product_component_group_code: "Component Group Code", primary_image_url: "Image URL",
  description: "Description", key_feature: "Key Features", key_ingredients: "Key Ingredients",
  ingredients: "Ingredients", how_to_use: "How To Use", product_care: "Product Care",
  caution: "Caution", seo_keywords: "SEO Keywords", catalog_url: "Catalog URL",
  category_reference_id: "Category", sub_category_reference_id: "Sub-Category", status_reference_id: "Product Status",
  mrp: "MRP", purchase_cost: "Purchase Cost", net_content_value: "Net Content Value",
  net_content_unit: "Net Content Unit", color: "Color", raw_product_size: "Raw Product Size",
  package_size: "Package Size", package_weight: "Package Wt (g)", raw_product_weight: "Raw Product Wt",
  finished_product_weight: "Finished Product Wt",
  bundle_type: "Bundle Type", pack_type: "Pack Type",
  tax_rule_code: "Tax Rule Code (HSN)", tax_percent: "Tax Percent",
  // additional raw fields:
  created_at: "Created At", updated_at: "Updated At"
};

const GROUPS = [
  { id: 'identity', label: 'Identity', fields: ['product_name', 'sku_code', 'barcode', 'brand_reference_id', 'product_component_group_code', 'primary_image_url'] },
  { id: 'classification', label: 'Classification', fields: ['status_reference_id', 'category_reference_id', 'sub_category_reference_id'] },
  { id: 'pricing', label: 'Pricing & Specs', fields: ['mrp', 'purchase_cost', 'net_content_value', 'net_content_unit', 'color', 'raw_product_size', 'package_size', 'package_weight', 'raw_product_weight', 'finished_product_weight'] },
  { id: 'content', label: 'Content', fields: ['description', 'key_feature', 'key_ingredients', 'ingredients', 'how_to_use', 'product_care', 'caution', 'seo_keywords', 'catalog_url'] },
  { id: 'bundling', label: 'Product & Bundle', fields: ['bundle_type', 'pack_type'] },
  { id: 'tax', label: 'Tax & Compliance', fields: ['tax_rule_code', 'tax_percent'] }
];

const PREFS_KEY = 'bloomerce_export_prefs';

export default function ExportSlideOver({ onClose, skus = [], filtered = [], paginated = [], references = {}, isEmbedded = false }) {
  const [scope, setScope] = useState('filtered'); // 'all', 'filtered', 'current_page'
  const [expandedGroups, setExpandedGroups] = useState(new Set(['identity']));

  // config schema: { [field_id]: { selected: boolean, outputName: string } }
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { console.warn('Failed to parse export prefs', e); }

    // Default config
    const def = {};
    GROUPS.forEach(g => {
      g.fields.forEach(f => {
        def[f] = { selected: true, outputName: FIELD_LABELS[f] || f };
      });
    });
    return def;
  });

  const toggleGroup = (id) => {
    setExpandedGroups(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const updateField = (fieldId, changes) => {
    setConfig(prev => {
      const updated = { ...prev, [fieldId]: { ...prev[fieldId], ...changes } };
      localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Determine active dataset based on scope
  const targetData = useMemo(() => {
    if (scope === 'all') return skus;
    if (scope === 'current_page') return paginated;
    return filtered;
  }, [scope, skus, filtered, paginated]);

  // Selected config order
  const getSelectedFields = () => {
    const list = [];
    GROUPS.forEach(g => {
      g.fields.forEach(f => {
        if (config[f]?.selected) list.push({ id: f, outputName: config[f].outputName });
      });
    });
    return list;
  };

  const selectedFields = getSelectedFields();

  // Helper to map reference IDs to raw text for export
  const getMappedValue = (sku, fId) => {
    const rawValue = sku[fId];
    if (fId === 'brand_reference_id') return references?.BRAND?.[rawValue] || rawValue || '';
    if (fId === 'category_reference_id') return references?.CATEGORY?.[rawValue] || rawValue || '';
    if (fId === 'sub_category_reference_id') return references?.SUB_CATEGORY?.[rawValue] || rawValue || '';
    if (fId === 'status_reference_id') return references?.STATUS?.[rawValue] || rawValue || '';
    if (fId === 'bundle_type') return references?.BUNDLE_TYPE?.[rawValue] || rawValue || '';
    if (fId === 'pack_type') return references?.PACK_TYPE?.[rawValue] || rawValue || '';

    return rawValue === null || rawValue === undefined ? '' : String(rawValue);
  };

  const escapeCSV = (str) => {
    if (typeof str !== 'string') return str;
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const handleExport = () => {
    if (selectedFields.length === 0) return alert("Select at least one field to export");

    let csvContent = selectedFields.map(f => escapeCSV(f.outputName)).join(",") + "\n";

    targetData.forEach(sku => {
      const row = selectedFields.map(f => escapeCSV(getMappedValue(sku, f.id)));
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // Generate Filename: Bloomerce_ProductMaster_YYYYMMDD_HHMM.csv
    const d = new Date();
    const ts = d.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const filename = `Bloomerce_ProductMaster_${ts}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preview data (first 3 rows)
  const previewData = targetData.slice(0, 3);

  const content = (
    <div className={cn("flex flex-col h-full", !isEmbedded && "fixed inset-y-0 right-0 z-50 w-full md:max-w-2xl bg-[var(--color-background)] border-l border-[var(--color-border)] shadow-2xl animate-[slide-in-from-right_0.3s_cubic-bezier(0.4,0,0.2,1)]")}>
      {/* Header (Only if not embedded or as sub-header) */}
      <div className="flex flex-col border-b border-[var(--color-border)] flex-shrink-0 bg-[var(--color-card)]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {!isEmbedded && (
              <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
                <X size={18} />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-[var(--color-foreground)] leading-tight">Export Data Catalog</h2>
              <span className="text-[10px] text-[var(--color-muted-foreground)] hidden sm:inline">Select and map columns for your CSV download</span>
            </div>
          </div>
          <Button onClick={handleExport} className="gap-2 shrink-0 h-9">
            <Download size={14} /> <span className="hidden sm:inline">Download {targetData.length} SKUs Catalog</span><span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto w-full flex flex-col pt-2 no-scrollbar">
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold mb-3">1. Select Scope</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'current_page', label: 'Current Page', count: paginated.length, desc: 'Visible on screen' },
              { id: 'filtered', label: 'Filtered Results', count: filtered.length, desc: 'Current search/filter' },
              { id: 'all', label: 'All Products', count: skus.length, desc: 'Entire database' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setScope(opt.id)}
                className={cn(
                  "flex flex-col items-start p-3 border rounded-xl transition-all text-left",
                  scope === opt.id
                    ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-muted-foreground)]"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={cn("text-xs font-semibold", scope === opt.id ? "text-[var(--color-primary)]" : "text-[var(--color-foreground)]")}>
                    {opt.label}
                  </span>
                  {scope === opt.id && <Check size={14} className="text-[var(--color-primary)]" />}
                </div>
                <span className="text-xl font-bold tabular-nums">{opt.count}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-[var(--color-border)] my-1" />

        <div className="px-6 py-4 flex-1">
          <h3 className="text-sm font-semibold mb-3">2. Configure Fields & Map Headers</h3>
          <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-card)] overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-[var(--color-muted)] border-b border-[var(--color-border)] text-[11px] font-semibold tracking-wide uppercase text-[var(--color-muted-foreground)]">
              <div className="col-span-1 text-center">In</div>
              <div className="col-span-11">Attribute & Column Name</div>
            </div>

            <div className="overflow-y-auto max-h-[300px] no-scrollbar">
              {GROUPS.map((group, idx) => {
                const isExpanded = expandedGroups.has(group.id);
                const activeCount = group.fields.filter(f => config[f]?.selected).length;
                const allActive = activeCount === group.fields.length;

                const toggleAllInGroup = (e) => {
                  e.stopPropagation();
                  const nextVal = !allActive;
                  setConfig(prev => {
                    const upd = { ...prev };
                    group.fields.forEach(f => {
                        upd[f] = { ...upd[f], selected: nextVal };
                    });
                    localStorage.setItem(PREFS_KEY, JSON.stringify(upd));
                    return upd;
                  });
                };

                return (
                  <div key={group.id} className={cn("border-b border-[var(--color-border)] last:border-0")}>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-card)] hover:bg-[var(--color-muted)]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown size={14} className="text-[var(--color-muted-foreground)]"/> : <ChevronRight size={14} className="text-[var(--color-muted-foreground)]"/>}
                        <span className="text-sm font-medium">{group.label}</span>
                        <span className="text-[10px] font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full">{activeCount} / {group.fields.length}</span>
                      </div>
                      <label className="flex items-center gap-2 text-xs" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={allActive} onChange={toggleAllInGroup} className="w-3.5 h-3.5 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                        <span className="text-[var(--color-muted-foreground)] uppercase tracking-wider text-[10px] font-bold">Select All</span>
                      </label>
                    </button>

                    {isExpanded && (
                      <div className="bg-[var(--color-background)]">
                        {group.fields.map(field => (
                          <div key={field} className="flex grid grid-cols-12 gap-4 px-4 py-3 hover:bg-[var(--color-muted)]/30 border-t border-[var(--color-border)] items-center transition-colors">
                            <div className="col-span-1 flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={config[field]?.selected || false}
                                onChange={(e) => updateField(field, { selected: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                              />
                            </div>
                            <div className="col-span-11 grid grid-cols-11 gap-4 items-center">
                              <div className="col-span-5 text-xs text-[var(--color-foreground)] font-medium truncate">
                                {FIELD_LABELS[field] || field}
                              </div>
                              <div className="col-span-6">
                                <input
                                  type="text"
                                  value={config[field]?.outputName || ''}
                                  onChange={(e) => updateField(field, { outputName: e.target.value })}
                                  placeholder={FIELD_LABELS[field] || field}
                                  className="w-full h-8 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-2.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Preview */}
        <div className="px-6 py-6 pb-12 bg-[var(--color-muted)]/20 border-t border-[var(--color-border)] shrink-0">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <FileSpreadsheet size={15} className="text-[var(--color-primary)]" />
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-widest text-[10px]">Spreadsheet Preview</h3>
             </div>
             {selectedFields.length > 0 && <span className="text-[10px] font-bold text-[var(--color-muted-foreground)] italic">Showing first 3 rows</span>}
          </div>

          {selectedFields.length === 0 ? (
            <div className="text-[11px] text-center text-[var(--color-muted-foreground)] py-10 bg-[var(--color-card)] rounded-2xl border border-dashed border-[var(--color-border)]">
              Select columns above to see a preview of your CSV catalog
            </div>
          ) : (
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden overflow-x-auto ring-1 ring-black/5 no-scrollbar">
              <table className="w-full text-left" style={{ borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
                    {selectedFields.map((f, i) => (
                      <th key={i} className="px-3 py-2 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap border-r border-[var(--color-border)] last:border-0 text-[var(--color-muted-foreground)] truncate max-w-[150px]">
                        {f.outputName || f.id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.length === 0 ? (
                    <tr><td colSpan={selectedFields.length} className="px-3 py-6 text-xs text-center text-[var(--color-muted-foreground)] italic">No data to preview...</td></tr>
                  ) : (
                    previewData.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)]/10 transition-colors">
                        {selectedFields.map((f, colIdx) => {
                          const val = getMappedValue(row, f.id);
                          return (
                            <td key={colIdx} className="px-3 py-2 text-[11px] font-medium whitespace-nowrap border-r border-[var(--color-border)] last:border-0 max-w-[150px] truncate text-[var(--color-foreground)]" title={val}>
                              {val || <span className="opacity-40">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isEmbedded) return content;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm animate-[fade-in_0.2s_ease]" onClick={onClose} />
      {content}
    </>
  );
}
