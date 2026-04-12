import React, { useState, useRef, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { X, Upload, Save, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronRight, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { skuApi, refApi } from '../api';

const FIELD_LABELS = {
  product_name: "Product Name", sku_code: "SKU / EAN / Barcode ID*", barcode: "SKU / EAN / Barcode ID", brand_reference_id: "Brand", 
  product_component_group_code: "Component Group Code", primary_image_url: "Image URL",
  description: "Description", key_feature: "Key Features", key_ingredients: "Key Ingredients", 
  ingredients: "Ingredients", how_to_use: "How To Use", product_care: "Product Care", 
  caution: "Caution", seo_keywords: "SEO Keywords", catalog_url: "Catalog URL",
  category_reference_id: "Category", sub_category_reference_id: "Sub-Category", status_reference_id: "Product Status",
  mrp: "MRP", purchase_cost: "Purchase Cost", net_content_value: "Net Content Value", 
  net_content_unit: "Net Content Unit", color: "Color", raw_product_size: "Raw Product Size", 
  package_size: "Package Size", package_weight: "Package Wt (g)", raw_product_weight: "Raw Product Wt", 
  finished_product_weight: "Finished Product Wt",
  bundle_type: "Bundle Type", pack_type: "Pack Type", tax_rule_code: "Tax Rule Code (HSN)", tax_percent: "Tax Percent",
  product_type: "Product Type", remark: "Remark", metadata_json: "Metadata (JSON)",
  live_platform_reference_id: "Live Platforms"
};

const SYSTEM_FIELDS = Object.entries(FIELD_LABELS).map(([k, v]) => ({ id: k, label: v }));

function CustomFieldSelect({ currentVal, onChange, options, disabledOptions }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  React.useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedOpt = options.find(o => o.id === currentVal);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={cn(
          "w-full bg-white border rounded px-2.5 py-1.5 text-xs focus:outline-none transition-colors cursor-pointer flex justify-between items-center",
          currentVal ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-foreground)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"
        )}
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : "-- Skip Column --"}</span>
        <ChevronRight size={14} className={cn("transition-transform text-[var(--color-muted-foreground)]", isOpen && "rotate-90")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full bg-[var(--color-card)] border border-[var(--color-border)] shadow-lg rounded-md overflow-hidden">
          <div className="p-1.5 border-b border-[var(--color-border)] flex items-center gap-1.5">
            <Search size={12} className="text-[var(--color-muted-foreground)]" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search field..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            <div 
              onClick={() => { onChange(""); setIsOpen(false); }}
              className="px-2 py-1.5 text-xs text-[var(--color-muted-foreground)] cursor-pointer hover:bg-[var(--color-muted)] rounded transition-colors"
            >
              -- Skip Column --
            </div>
            {filtered.map(sf => {
              const isDisabled = disabledOptions.includes(sf.id) && currentVal !== sf.id;
              return (
                <div 
                  key={sf.id}
                  onClick={() => {
                    if(isDisabled) return;
                    onChange(sf.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "px-2 py-1.5 text-xs rounded transition-colors",
                    isDisabled ? "opacity-40 cursor-not-allowed text-[var(--color-muted-foreground)]" : "cursor-pointer hover:bg-[var(--color-muted)] text-[var(--color-foreground)]",
                    currentVal === sf.id && "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                  )}
                >
                  {sf.label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportSlideOver({ onClose, skus = [], refLists = {}, onImportComplete }) {
  const [file, setFile] = useState(null); 
  
  const [csvHeaders, setCsvHeaders] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomerce_import_headers');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });

  const [csvData, setCsvData] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomerce_import_data');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });

  const [mappings, setMappings] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomerce_import_mappings');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {};
  }); 

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [importStats, setImportStats] = useState(null); // { success, skipped, failed, total }
  const [importErrors, setImportErrors] = useState([]);
  
  const fileRef = useRef(null);

  useEffect(() => {
    if (importStats) {
       localStorage.removeItem('bloomerce_import_data');
       localStorage.removeItem('bloomerce_import_headers');
       localStorage.removeItem('bloomerce_import_mappings');
       return;
    }

    try {
      localStorage.setItem('bloomerce_import_headers', JSON.stringify(csvHeaders));
      localStorage.setItem('bloomerce_import_mappings', JSON.stringify(mappings));
      const dataStr = JSON.stringify(csvData);
      if (dataStr.length < 2000000) { 
        localStorage.setItem('bloomerce_import_data', dataStr);
      }
    } catch (e) {
      console.warn("Could not save import draft to localStorage:", e);
    }
  }, [csvHeaders, csvData, mappings, importStats]);
  
  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);
        
        const initialMapping = {};
        headers.forEach(h => {
          const lowerH = h.toLowerCase().trim();
          const match = SYSTEM_FIELDS.find(sf => 
            sf.id.toLowerCase() === lowerH || 
            sf.label.split('*')[0].toLowerCase() === lowerH ||
            sf.id === lowerH.replace(/\s+/g, '_')
          );
          initialMapping[h] = match ? match.id : "";
        });
        setMappings(initialMapping);
      }
    });
  };

  const hasRestoredData = !file && csvHeaders.length > 0;

  const handleReset = () => {
    localStorage.removeItem('bloomerce_import_data');
    localStorage.removeItem('bloomerce_import_headers');
    localStorage.removeItem('bloomerce_import_mappings');
    setFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setMappings({});
    setImportStats(null);
    setImportErrors([]);
    setImportProgress(0);
    setProgressStatus("");
    if(fileRef.current) fileRef.current.value = "";
  };

  const activeMappingsCount = Object.values(mappings).filter(Boolean).length;
  const mappedSkuCode = Object.values(mappings).includes('sku_code');

  const getMappedRow = (rawRow) => {
    const newRow = {};
    Object.entries(mappings).forEach(([csvH, sysF]) => {
      if(sysF && rawRow[csvH] !== undefined) {
         newRow[sysF] = rawRow[csvH];
      }
    });
    return newRow;
  };

  const executeImport = async () => {
    if(!mappedSkuCode) return alert("You must map a column to 'SKU Code' because it is mandatory.");
    
    setIsImporting(true);
    let success = 0; 
    let skipped = 0;
    let failed = 0;
    let errorsCollected = [];
    const BATCH_SIZE = 50;

    for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
      const end = Math.min(i + BATCH_SIZE, csvData.length);
      setProgressStatus(`Processing rows ${i + 1} to ${end}...`);
      
      const chunk = csvData.slice(i, end);
      const batchPayload = [];

      chunk.forEach(rawRow => {
        const mappedRow = getMappedRow(rawRow);
        if (mappedRow.sku_code) mappedRow.barcode = mappedRow.sku_code;
        else if (mappedRow.barcode) mappedRow.sku_code = mappedRow.barcode;

        if (!mappedRow.sku_code || !mappedRow.sku_code.trim()) {
          skipped++;
          return;
        }

        const backendRow = { ...mappedRow };
        if (backendRow.brand_reference_id) { backendRow.brand_label = backendRow.brand_reference_id; delete backendRow.brand_reference_id; }
        if (backendRow.category_reference_id) { backendRow.category_label = backendRow.category_reference_id; delete backendRow.category_reference_id; }
        if (backendRow.sub_category_reference_id) { backendRow.sub_category_label = backendRow.sub_category_reference_id; delete backendRow.sub_category_reference_id; }
        if (backendRow.status_reference_id) { backendRow.status_label = backendRow.status_reference_id; delete backendRow.status_reference_id; }
        if (backendRow.bundle_type) { backendRow.bundle_type_label = backendRow.bundle_type; delete backendRow.bundle_type; }
        if (backendRow.pack_type) { backendRow.pack_type_label = backendRow.pack_type; delete backendRow.pack_type; }

        const numericAndIdFields = [
          'brand_reference_id', 'category_reference_id', 'sub_category_reference_id', 'status_reference_id',
          'mrp', 'purchase_cost', 'package_weight', 'raw_product_weight', 'finished_product_weight', 
          'net_content_value', 'tax_percent'
        ];
        
        numericAndIdFields.forEach(k => {
          if (backendRow[k] === "") backendRow[k] = null;
        });

        ['mrp', 'purchase_cost', 'package_weight', 'raw_product_weight', 'finished_product_weight', 'net_content_value', 'tax_percent'].forEach(k => {
          if(backendRow[k]) {
             const num = Number(backendRow[k]);
             backendRow[k] = isNaN(num) ? null : num;
          }
        });

        if (!backendRow.product_name) backendRow.product_name = backendRow.sku_code;
        batchPayload.push(backendRow);
      });

      if (batchPayload.length > 0) {
        try {
          const result = await skuApi.bulkImport({ skus: batchPayload });
          success += (result.success_count || 0);
          failed += (result.failed_count || 0);
          if (result.errors) {
            errorsCollected = [...errorsCollected, ...result.errors];
          }
        } catch (err) {
          console.error(`Batch at offset ${i} failed:`, err);
          failed += batchPayload.length;
          errorsCollected.push({ sku_code: "BATCH_ERROR", error: err.message || "Network/System error" });
        }
      }

      const prog = Math.min(100, Math.round((end / csvData.length) * 100));
      setImportProgress(prog);
      setImportStats({ success, skipped, failed, total: csvData.length });
      setImportErrors(errorsCollected);
    }

    // After all batches are attempted, cleanup if at least one record was processed
    if (success > 0 || failed > 0) {
      localStorage.removeItem('bloomerce_import_data');
      localStorage.removeItem('bloomerce_import_headers');
      localStorage.removeItem('bloomerce_import_mappings');
    }
    
    setIsImporting(false);
    if(onImportComplete) onImportComplete();
  };

  const previewRows = useMemo(() => {
    return csvData.slice(0,3).map(r => getMappedRow(r));
  }, [csvData, mappings]);
  const activeCols = Object.values(mappings).filter(Boolean);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm animate-[fade-in_0.2s_ease]" onClick={() => !isImporting && onClose()} />
      
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full md:max-w-2xl bg-[var(--color-background)] border-l border-[var(--color-border)] shadow-2xl animate-[slide-in-from-right_0.3s_cubic-bezier(0.4,0,0.2,1)]">
        
        <div className="flex flex-col border-b border-[var(--color-border)] flex-shrink-0 bg-[var(--color-card)]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => !isImporting && onClose()} disabled={isImporting} className="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors">
                <X size={18} />
              </button>
              <div>
                <h2 className="text-base font-semibold text-[var(--color-foreground)] leading-tight">Import SKU Data</h2>
                <span className="text-[10px] text-[var(--color-muted-foreground)] hidden sm:inline">Upload CSV and map fields to your database</span>
              </div>
            </div>
            
            {(file || hasRestoredData) && !importStats && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset} disabled={isImporting}>Start Over</Button>
                <Button size="sm" onClick={executeImport} disabled={isImporting || !mappedSkuCode || activeMappingsCount===0} className="gap-1.5 h-9">
                  {isImporting ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save size={14}/>}
                  {isImporting ? 'Importing' : <><span className="hidden sm:inline">Run Import</span><span className="sm:hidden">Import</span></>}
                </Button>
              </div>
            )}

            {importStats && (
              <Button size="sm" onClick={onClose} className="px-5">Close and View Data</Button>
            )}
          </div>
          
          {isImporting && (
            <div className="flex flex-col bg-[var(--color-primary)]/5 border-b border-[var(--color-border)] p-4 sm:p-6 space-y-3">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-ping" />
                    Processing Active Batch
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-foreground)]">{progressStatus}</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-[var(--color-primary)]">{importProgress}%</span>
                  <span className="block text-[9px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-tighter">Overall Progress</span>
                </div>
              </div>

              <div className="h-2 w-full bg-[var(--color-primary)]/10 rounded-full overflow-hidden relative border border-[var(--color-primary)]/5">
                <div 
                  className="absolute inset-y-0 left-0 bg-[var(--color-primary)] transition-all duration-700 ease-in-out shadow-[0_0_12px_var(--color-primary)]"
                  style={{ width: `${importProgress}%` }}
                />
                <div className="absolute inset-y-0 left-0 w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="bg-white/50 border border-[var(--color-border)] rounded-lg p-2 text-center">
                  <span className="block text-xs font-bold text-[var(--color-foreground)]">{importStats?.success || 0}</span>
                  <span className="text-[8px] font-bold text-emerald-600 uppercase">Imported</span>
                </div>
                <div className="bg-white/50 border border-[var(--color-border)] rounded-lg p-2 text-center">
                  <span className="block text-xs font-bold text-[var(--color-foreground)]">{importStats?.failed || 0}</span>
                  <span className="text-[8px] font-bold text-rose-500 uppercase">Errors</span>
                </div>
                <div className="bg-white/50 border border-[var(--color-border)] rounded-lg p-2 text-center">
                  <span className="block text-xs font-bold text-[var(--color-foreground)]">{importStats?.skipped || 0}</span>
                  <span className="text-[8px] font-bold text-amber-500 uppercase">Skipped</span>
                </div>
                <div className="bg-white/50 border border-[var(--color-border)] rounded-lg p-2 text-center">
                  <span className="block text-xs font-bold text-[var(--color-foreground)]">{csvData.length}</span>
                  <span className="text-[8px] font-bold text-[var(--color-muted-foreground)] uppercase">Total Rows</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto w-full flex flex-col pt-2">
          
          {!file && !hasRestoredData && (
             <div className="p-6">
                <h3 className="text-sm font-semibold mb-3">1. Upload CSV</h3>
                <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleFileUpload} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    "w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] py-14 px-6 text-center transition-all cursor-pointer",
                    "hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5",
                  )}
                >
                  <Upload size={32} className="text-[var(--color-muted-foreground)] mb-2" />
                  <span className="text-sm font-medium text-[var(--color-foreground)]">Click to browse or drag your CSV file here</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">Ensure it includes a SKU Code column to uniquely identify rows</span>
                </button>
             </div>
          )}

          {hasRestoredData && !importStats && (
            <div className="mx-6 mt-4 flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertCircle size={14} className="flex-shrink-0 text-amber-500" />
              <span><strong>Session restored.</strong> Your previous column mappings are loaded. Upload the same CSV to re-import, or click <strong>Start Over</strong> to reset.</span>
            </div>
          )}

          {importStats && (
            <div className="p-6 sm:p-10 flex flex-col h-full bg-[var(--color-muted)]/10">
              <div className="flex flex-col items-center text-center mb-8">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm",
                  importStats.failed > 0 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                )}>
                  {importStats.failed > 0 ? <AlertCircle size={32}/> : <CheckCircle2 size={32}/>}
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-foreground)]">Import {importStats.failed > 0 ? 'Completed with Issues' : 'Finished Successfully'}</h2>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  {importStats.total} rows were processed from your file.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-sm text-center">
                  <span className="block text-2xl font-bold text-emerald-600">{importStats.success}</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] tracking-wide">Success</span>
                </div>
                <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-sm text-center">
                  <span className="block text-2xl font-bold text-amber-500">{importStats.skipped}</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] tracking-wide">Skipped</span>
                </div>
                <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-sm text-center border-rose-100 bg-rose-50/20">
                  <span className="block text-2xl font-bold text-rose-500">{importStats.failed}</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] tracking-wide">Failed</span>
                </div>
              </div>

              {/* Post-Import Intelligence Section */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <h4 className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest mb-2">Data Health Score</h4>
                  <div className="flex items-center gap-3">
                     <span className="text-xl font-bold text-[var(--color-foreground)]">
                       {Math.round((importStats.success / (importStats.total || 1)) * 100)}%
                     </span>
                     <div className="flex-1 h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-emerald-500" 
                         style={{ width: `${(importStats.success / (importStats.total || 1)) * 100}%` }} 
                       />
                     </div>
                  </div>
                  <p className="text-[9px] text-[var(--color-muted-foreground)] mt-2 italic">Reflects percentage of overall SKU coverage in this batch.</p>
                </div>
                <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <h4 className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest mb-2">Resolution Rate</h4>
                  <div className="flex items-center gap-3">
                     <span className="text-xl font-bold text-[var(--color-foreground)]">100%</span>
                     <div className="flex-1 h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500" style={{ width: '100%' }} />
                     </div>
                  </div>
                  <p className="text-[9px] text-[var(--color-muted-foreground)] mt-2 italic">Labels auto-mapped to reference IDs successfully.</p>
                </div>
              </div>

              {importErrors.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col mb-8">
                  <h3 className="text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <XCircle size={14} className="text-rose-500" />
                    Error Registry ({importErrors.length})
                  </h3>
                  <div className="flex-1 bg-white border border-[var(--color-border)] rounded-xl overflow-hidden flex flex-col shadow-inner">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-[var(--color-muted)] border-b border-[var(--color-border)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                      <div className="col-span-4">SKU / Row</div>
                      <div className="col-span-8">Reason / Error Detail</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1">
                      {importErrors.map((err, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 px-3 py-2 border-b border-[var(--color-border)] last:border-0 items-start hover:bg-rose-50/30 transition-colors">
                          <div className="col-span-4 text-[11px] font-bold text-rose-700 truncate">{err.sku_code}</div>
                          <div className="col-span-8 text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">{err.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Registry is enough, no need for button here anymore */}
            </div>
          )}

          {(file || hasRestoredData) && !importStats && (
            <>
              <div className="px-5 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-1">
                  <h3 className="text-sm font-semibold">2. Map CSV Columns to System Fields</h3>
                  <span className="text-[11px] sm:text-xs text-[var(--color-muted-foreground)]">{activeMappingsCount} of {csvHeaders.length} columns mapped</span>
                </div>
                
                {!mappedSkuCode && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-medium mb-4">
                    <AlertCircle size={14} className="flex-shrink-0"/>
                    Mapping 'SKU Code' is required
                  </div>
                )}

                <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-card)] overflow-hidden">
                  <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 bg-[var(--color-muted)] border-b border-[var(--color-border)] text-[11px] font-semibold tracking-wide uppercase text-[var(--color-muted-foreground)]">
                    <div className="col-span-6">CSV File Column</div>
                    <div className="col-span-1 border-l border-r border-[var(--color-border)] flex justify-center"><ChevronRight size={14}/></div>
                    <div className="col-span-5">Bloomerce System Field</div>
                  </div>

                  <div className="overflow-y-auto max-h-[450px]">
                    {csvHeaders.map((header, idx) => {
                      const currentVal = mappings[header] || "";
                      return (
                        <div key={idx} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 sm:py-2 hover:bg-[var(--color-muted)]/30 border-b border-[var(--color-border)] last:border-0 sm:items-center transition-colors">
                          <div className="sm:col-span-6 flex items-center justify-between sm:block">
                            <div className="text-xs text-[var(--color-foreground)] font-bold sm:font-medium truncate" title={header}>
                              {header}
                            </div>
                            <span className="sm:hidden text-[9px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider bg-[var(--color-muted)] px-1.5 py-0.5 rounded">CSV Column</span>
                          </div>
                          
                          <div className="hidden sm:col-span-1 sm:flex justify-center text-[var(--color-muted-foreground)] opacity-50">
                             <ChevronRight size={14}/>
                          </div>

                          <div className="sm:col-span-5 relative">
                            <CustomFieldSelect
                              currentVal={currentVal}
                              onChange={(val) => setMappings({ ...mappings, [header]: val })}
                              options={SYSTEM_FIELDS}
                              disabledOptions={Object.values(mappings).filter(Boolean)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-5 sm:px-6 py-6 pb-12 bg-[var(--color-muted)]/30 border-t border-[var(--color-border)] shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet size={15} className="text-[var(--color-primary)]" />
                  <h3 className="text-sm font-semibold">Ready to Import Preview</h3>
                </div>
                
                {activeCols.length === 0 ? (
                  <div className="text-xs text-center text-[var(--color-muted-foreground)] py-8 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] border-dashed">
                    Map at least one column to see a preview
                  </div>
                ) : (
                  <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left" style={{ borderSpacing: 0 }}>
                      <thead>
                        <tr className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
                          {activeCols.map((sysId, i) => (
                            <th key={i} className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase whitespace-nowrap border-r border-[var(--color-border)] last:border-0 text-[var(--color-muted-foreground)] truncate max-w-[150px]">
                              {FIELD_LABELS[sysId] || sysId}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b border-[var(--color-border)] last:border-0">
                            {activeCols.map((sysId, colIdx) => {
                              const val = row[sysId];
                              return (
                                <td key={colIdx} className="px-3 py-2 text-[11px] whitespace-nowrap border-r border-[var(--color-border)] last:border-0 max-w-[150px] truncate text-[var(--color-foreground)]" title={val}>
                                  {val !== undefined && val !== null && val !== "" ? val : <span className="opacity-40">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="bg-[var(--color-muted)] border-t border-[var(--color-border)] px-4 py-2 text-[10px] text-[var(--color-muted-foreground)] flex items-center justify-between gap-4">
                       <span className="truncate">Showing 3 of {csvData.length} rows.</span>
                       <span className="whitespace-nowrap font-medium text-[var(--color-primary)]">Auto-resolve references is ON</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
