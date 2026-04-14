import React, { useState, useMemo, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  X, Upload, Save, FileSpreadsheet, AlertCircle, 
  CheckCircle2, ChevronRight, XCircle, Search, RefreshCcw,
  Globe, ShoppingBag, Database, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { salesApi, refApi } from '../api';

const MAPPABLE_FIELDS = [
  { key: 'external_order_id', label: 'Order ID*', required: true, desc: 'Unique order identifier' },
  { key: 'sku_code', label: 'SKU / Item Code*', required: true, desc: 'Matches SKU Code in Master' },
  { key: 'order_date', label: 'Order Date*', required: true, desc: 'Transaction date' },
  { key: 'quantity', label: 'Quantity', type: 'number' },
  { key: 'unit_selling_price', label: 'Unit Price', type: 'number' },
  { key: 'total_amount', label: 'Total Amount', type: 'number' },
  { key: 'tax_amount', label: 'Tax Amount', type: 'number' },
  { key: 'platform_fee', label: 'Platform Fee', type: 'number' },
  { key: 'order_status', label: 'Status' },
  { key: 'tracking_id', label: 'Tracking ID' },
  { key: 'courier_name', label: 'Courier' },
];

const DEFAULT_PLATFORMS = [
  { id: 'amazon', label: 'Amazon' },
  { id: 'flipkart', label: 'Flipkart' },
  { id: 'myntra', label: 'Myntra' },
  { id: 'nykaa', label: 'Nykaa' },
  { id: 'nykaa_fashion', label: 'Nykaa Fashion' },
  { id: 'ajio', label: 'Ajio' },
  { id: 'meesho', label: 'Meesho' },
  { id: 'tata_cliq', label: 'Tata CLiQ' },
  { id: 'jiomart', label: 'JioMart' },
  { id: 'glowroad', label: 'GlowRoad' },
  { id: 'other', label: 'Other/Direct' },
];

const SYNONYMS = {
  external_order_id: ['order id', 'order_id', 'order-id', 'amazon-order-id', 'order number'],
  sku_code: ['sku', 'seller sku', 'sku code', 'item sku', 'product sku'],
  order_date: ['order date', 'date', 'purchase date', 'transaction date'],
  quantity: ['qty', 'quantity', 'units'],
  unit_selling_price: ['price', 'unit price', 'selling price', 'item-price'],
  total_amount: ['total', 'order total', 'grand total', 'amount'],
};

// --- Sub-component: Searchable Dropdown ---
function SearchableSelect({ label, value, options, onChange, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  const selected = options.find(o => o.id === value || o.label === value);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={ref}>
      <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5 ml-1">{label}</label>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={cn(
          "w-full h-11 px-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
          value ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)] bg-[var(--color-card)]"
        )}
      >
        <span className={cn("text-sm font-bold truncate", !value && "text-[var(--color-muted-foreground)]")}>
          {selected ? selected.label : value || placeholder}
        </span>
        <ChevronRight size={16} className={cn("transition-transform", isOpen && "rotate-90")} />
      </div>

      {isOpen && (
        <div className="absolute z-[120] top-full mt-2 w-full bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-2 border-b border-[var(--color-border)] flex items-center gap-2">
            <Search size={14} className="text-[var(--color-muted-foreground)] ml-1" />
            <input 
              autoFocus placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm p-1 font-medium"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
            {filtered.map(o => (
              <div 
                key={o.id} onClick={() => { onChange(o.label); setIsOpen(false); }}
                className={cn(
                  "px-3 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-colors",
                  (value === o.id || value === o.label) ? "bg-[var(--color-primary)] text-white" : "hover:bg-[var(--color-muted)]"
                )}
              >
                {o.label}
              </div>
            ))}
            {filtered.length === 0 && <div className="p-4 text-xs text-center text-[var(--color-muted-foreground)]">No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-component: Mapping Dropdown (Compact) ---
function MappingSelect({ value, options, onChange, usedOptions }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  const selected = options.find(o => o.key === value);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={ref}>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={cn(
          "w-full h-9 px-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all text-xs font-bold",
          value ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]" : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)]"
        )}
      >
        <span className="truncate">{selected ? selected.label.replace('*','') : "-- Skip Column --"}</span>
        <ChevronRight size={14} className={cn("transition-transform opacity-40", isOpen && "rotate-90")} />
      </div>

      {isOpen && (
        <div className="absolute z-[120] bottom-full sm:bottom-auto sm:top-full mb-2 sm:mb-0 sm:mt-2 right-0 w-56 bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-2 border-b border-[var(--color-border)] flex items-center gap-2">
            <Search size={12} className="text-[var(--color-muted-foreground)] ml-1" />
            <input 
              autoFocus placeholder="Search field..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs p-1 font-medium"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
            <div 
              onClick={() => { onChange(""); setIsOpen(false); }}
              className="px-2.5 py-2 text-xs font-bold text-rose-500 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg"
            >
              -- Skip Column --
            </div>
            {filtered.map(o => {
              const isUsed = usedOptions.includes(o.key) && value !== o.key;
              return (
                <div 
                  key={o.key} 
                  onClick={() => { if(!isUsed) { onChange(o.key); setIsOpen(false); } }}
                  className={cn(
                    "px-2.5 py-2 rounded-lg text-xs font-bold transition-all",
                    isUsed ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:bg-[var(--color-muted)]",
                    value === o.key ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20" : ""
                  )}
                >
                  {o.label.replace('*','')}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesImportSlideOver({ onClose, onSuccess }) {
  const [platform, setPlatform] = useState("");
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [mappings, setMappings] = useState({});
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

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
        
        // Auto-mapping
        const initialMap = {};
        headers.forEach(h => {
          const lowerH = h.toLowerCase().trim();
          const match = MAPPABLE_FIELDS.find(f => 
            f.key.toLowerCase() === lowerH || 
            f.label.toLowerCase().replace('*','') === lowerH ||
            (SYNONYMS[f.key] || []).includes(lowerH)
          );
          if (match) initialMap[h] = match.key;
        });
        setMappings(initialMap);
      }
    });
  };

  const executeImport = async () => {
    const requiredMissing = MAPPABLE_FIELDS.filter(f => f.required && !Object.values(mappings).includes(f.key));
    if (requiredMissing.length > 0) {
      setError(`Required fields missing: ${requiredMissing.map(f => f.label.replace('*','')).join(', ')}`);
      return;
    }
    if(!platform) return setError("Please select a sales channel first.");

    setIsImporting(true);
    setError(null);
    let success = 0;
    let failed = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
      const chunk = csvData.slice(i, i + BATCH_SIZE);
      const orders = chunk.map(row => {
        const order = { platform_label: platform };
        Object.entries(mappings).forEach(([csvH, sysK]) => {
          if (sysK && row[csvH] !== undefined) {
             let val = row[csvH];
             // Sanitize numeric fields: convert empty to null, otherwise parse as number
             const numericFields = ['quantity', 'unit_selling_price', 'total_amount', 'tax_amount', 'platform_fee'];
             if (numericFields.includes(sysK)) {
                if (val === "" || val === undefined || val === null) val = null;
                else {
                  const num = Number(val);
                  val = isNaN(num) ? null : num;
                }
             }
             order[sysK] = val;
          }
        });
        return order;
      });

      try {
        const res = await salesApi.bulkImport({ orders });
        success += (res.success_count || 0);
        failed += (res.failed_count || 0);
      } catch (err) {
        failed += orders.length;
      }
      const p = Math.min(100, Math.round(((i + chunk.length) / csvData.length) * 100));
      setProgress(p);
    }

    setImportStats({ success, failed, total: csvData.length });
    setIsImporting(false);
    if (onSuccess && success > 0) onSuccess();
  };

  const activeMappingsCount = Object.values(mappings).filter(Boolean).length;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 z-[110] flex flex-col w-full md:max-w-2xl bg-[var(--color-background)] border-l border-[var(--color-border)] shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex flex-col border-b border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
               <button onClick={onClose} className="p-2 hover:bg-[var(--color-muted)] rounded-xl transition-colors">
                 <X size={20} className="text-[var(--color-muted-foreground)]" />
               </button>
               <div>
                  <h2 className="text-base font-black text-[var(--color-foreground)] tracking-tight uppercase">Sales Data Ingestion</h2>
                  <span className="text-[10px] text-[var(--color-muted-foreground)] font-black uppercase tracking-widest">Multi-Channel Direct Import</span>
               </div>
            </div>

            {csvHeaders.length > 0 && !importStats && (
              <Button 
                onClick={executeImport} 
                disabled={isImporting}
                className="gap-2 px-6 h-10 shadow-lg shadow-[var(--color-primary)]/20"
              >
                {isImporting ? <RefreshCw size={14} className="animate-spin" /> : <Save size={16} />}
                {isImporting ? 'Processing' : 'Run Import'}
              </Button>
            )}
            
            {importStats && (
              <Button onClick={onClose} variant="secondary" className="px-6 h-10 font-bold uppercase tracking-widest text-xs">Close Results</Button>
            )}
          </div>

          {isImporting && (
             <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-end mb-2">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest mb-1">Processing Batch...</span>
                      <span className="text-lg font-black text-[var(--color-foreground)]">{progress}%</span>
                   </div>
                   <div className="text-right">
                      <span className="text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest">Overall Success Rate</span>
                      <span className="block text-sm font-bold text-emerald-500">Fast Mode Active</span>
                   </div>
                </div>
                <div className="h-2 w-full bg-[var(--color-primary)]/10 rounded-full overflow-hidden relative border border-[var(--color-primary)]/5">
                  <div className="absolute inset-y-0 left-0 bg-[var(--color-primary)] transition-all duration-300 shadow-[0_0_12px_var(--color-primary)]" style={{ width: `${progress}%` }} />
                  <div className="absolute inset-y-0 left-0 w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pt-4">
          
          {error && (
            <div className="mx-6 mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex gap-3 animate-in shake-in">
               <AlertCircle size={20}/>
               <div className="text-xs font-bold leading-relaxed">{error}</div>
            </div>
          )}

          {!file && !importStats && (
            <div className="p-8 space-y-8 animate-in fade-in duration-500">
               <SearchableSelect 
                 label="1. Sales Channel"
                 value={platform} 
                 options={DEFAULT_PLATFORMS} 
                 onChange={setPlatform} 
                 placeholder="Search or Select Channel (Amazon, Myntra...)"
               />

               <div className={cn("transition-opacity", !platform && "opacity-30 pointer-events-none")}>
                 <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3 ml-1">2. Upload Sales Report (CSV)</label>
                 <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="group flex flex-col items-center justify-center py-20 px-6 rounded-[2.5rem] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all cursor-pointer bg-[var(--color-card)]/50"
                 >
                    <div className="w-20 h-20 bg-[var(--color-muted)] rounded-3xl flex items-center justify-center text-[var(--color-muted-foreground)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all mb-6">
                       <Upload size={32} />
                    </div>
                    <p className="text-base font-bold text-[var(--color-foreground)]">Drop your CSV report here</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)] font-medium mt-1 uppercase tracking-widest italic opacity-60">UTF-8 format only</p>
                 </div>
               </div>
            </div>
          )}

          {file && !importStats && (
            <div className="px-6 pb-20 animate-in fade-in duration-500">
               <div className="flex items-center justify-between mb-6 bg-[var(--color-muted)]/50 p-4 rounded-2xl border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center">
                        <CheckCircle2 size={24} />
                     </div>
                     <div>
                        <p className="text-xs font-black uppercase tracking-tight text-[var(--color-foreground)]">{file.name}</p>
                        <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold">{csvData.length} records ready for mapping</p>
                     </div>
                  </div>
                  <button onClick={() => { setFile(null); setCsvHeaders([]); }} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:underline">Change File</button>
               </div>

               <div className="mb-4 flex items-center justify-between px-1">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Column Mapping</h3>
                  <span className="text-[10px] font-bold text-[var(--color-primary)]">{activeMappingsCount} of {csvHeaders.length} Mapped</span>
               </div>

               <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-card)] overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-[var(--color-muted)] border-b border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">
                    <div className="col-span-6">CSV File Header</div>
                    <div className="col-span-6">Target field</div>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    {csvHeaders.map((header, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-[var(--color-border)] last:border-0 items-center hover:bg-[var(--color-muted)]/30 transition-colors">
                        <div className="col-span-6 truncate text-xs font-bold text-[var(--color-foreground)]" title={header}>{header}</div>
                        <div className="col-span-6">
                           <MappingSelect 
                             value={mappings[header] || ""} 
                             options={MAPPABLE_FIELDS} 
                             usedOptions={Object.values(mappings)}
                             onChange={(val) => setMappings({ ...mappings, [header]: val })}
                           />
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {importStats && (
             <div className="p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 shadow-inner">
                   <CheckCircle2 size={48} />
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2">Ingestion Complete</h2>
                <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm mb-10 font-medium leading-relaxed">
                   Great! We've successfully imported your sales data from <strong>{platform}</strong>. Your performance dashboard is being updated.
                </p>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                   <div className="p-6 rounded-[2rem] bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
                      <span className="block text-3xl font-black text-emerald-500">{importStats.success}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Success</span>
                   </div>
                   <div className="p-6 rounded-[2.5rem] bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm">
                      <span className="block text-3xl font-black text-rose-500">{importStats.failed}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Errors</span>
                   </div>
                </div>
                
                <Button onClick={onClose} className="mt-12 h-14 px-12 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-[var(--color-primary)]/20 active:scale-95 transition-all">
                   Return to Dashboard
                </Button>
             </div>
          )}

        </div>
      </div>
    </>
  );
}
