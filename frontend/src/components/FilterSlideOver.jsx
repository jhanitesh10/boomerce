import React, { useState, useMemo } from 'react';
import { X, Filter, Sparkles, ChevronDown, Search, Check, Info } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export default function FilterSlideOver({ 
  isOpen, 
  onClose, 
  filters, 
  onFilterChange, 
  onClearAll,
  references,
  refLists,
  matchCount 
}) {
  if (!isOpen) return null;

  const isAnyFilterActive = 
    filters.brandIds.length > 0 || 
    filters.categoryIds.length > 0 || 
    filters.subCategoryIds?.length > 0 ||
    filters.statusIds?.length > 0 || 
    filters.minPrice !== '' || 
    filters.maxPrice !== '' || 
    filters.productType !== '' ||
    filters.hasImage !== null || 
    filters.hasNotes !== null;

  return (

    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-[101] flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-right ring-1 ring-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
              <Filter size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Advanced Filters</h2>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Refine your SKU Master</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Current Selection / Discovery */}
          <Section 
            title={isAnyFilterActive ? "Current Selection" : "Filter Discovery"} 
            icon={isAnyFilterActive ? Filter : Sparkles}
          >
             <div className="flex flex-wrap gap-2">
               {/* Upcoming Feature Badge (Always visible, clean) */}
               <div className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-wider border border-slate-200 opacity-60 flex items-center gap-1.5 self-center">
                 <span className="w-1 h-1 bg-slate-300 rounded-full" />
                 Beta
               </div>

               {isAnyFilterActive ? (
                 <>
                   {filters.brandIds.map(id => (
                     <SelectedChip key={`b-${id}`} label={references.BRAND?.[id] || '...'} onRemove={() => toggleMultiSelect('brandIds', id)} />
                   ))}
                   {filters.categoryIds.map(id => (
                     <SelectedChip key={`c-${id}`} label={references.CATEGORY?.[id] || '...'} onRemove={() => toggleMultiSelect('categoryIds', id)} />
                   ))}
                   {filters.subCategoryIds?.map(id => (
                     <SelectedChip key={`sc-${id}`} label={references.SUB_CATEGORY?.[id] || '...'} onRemove={() => toggleMultiSelect('subCategoryIds', id)} />
                   ))}
                   {filters.productType && (
                     <SelectedChip label={filters.productType} color="primary" onRemove={() => onFilterChange({ productType: '' })} />
                   )}
                   {(filters.minPrice || filters.maxPrice) && (
                     <SelectedChip label={`₹${filters.minPrice||0} - ₹${filters.maxPrice||'∞'}`} color="primary" onRemove={() => onFilterChange({ minPrice: '', maxPrice: '' })} />
                   )}
                   {filters.hasImage !== null && (
                     <SelectedChip label={filters.hasImage ? "Has Image" : "Missing Image"} color="primary" onRemove={() => onFilterChange({ hasImage: null })} />
                   )}
                   {filters.hasNotes !== null && (
                     <SelectedChip label={filters.hasNotes ? "Has Notes" : "No Notes"} color="primary" onRemove={() => onFilterChange({ hasNotes: null })} />
                   )}
                 </>
               ) : (
                 <div className="w-full flex flex-col items-center justify-center py-4 px-2 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                       <Filter size={18} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 tracking-tight">No Active Selection</p>
                    <p className="text-[10px] text-slate-500 font-medium text-center mt-1">
                       Use classification tools below to narrow down your <span className="font-bold text-[var(--color-primary)]">{matchCount} products</span>
                    </p>
                 </div>
               )}
             </div>
          </Section>



          <div className="h-px bg-slate-100 my-2" />

          {/* Classification */}
          <Section title="Classification">
             <div className="space-y-5">
                <SearchableRefSelect 
                  label="Brand"
                  options={refLists.BRAND || []}
                  value={filters.brandIds}
                  onChange={(ids) => onFilterChange({ brandIds: ids })}
                />
                <SearchableRefSelect 
                  label="Category"
                  options={refLists.CATEGORY || []}
                  value={filters.categoryIds}
                  onChange={(ids) => onFilterChange({ categoryIds: ids, subCategoryIds: [] })}
                />
                <SearchableRefSelect 
                  label="Sub Category"
                  options={
                    filters.categoryIds.length > 0 
                      ? (refLists.SUB_CATEGORY || []).filter(sc => filters.categoryIds.includes(sc.parent_reference_id))
                      : (refLists.SUB_CATEGORY || [])
                  }
                  value={filters.subCategoryIds || []}
                  onChange={(ids) => onFilterChange({ subCategoryIds: ids })}
                />

                
                <div className="space-y-2">
                   <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Product Type</label>
                   <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
                      {['Raw', 'Package', 'Finished'].map(type => (
                        <button
                          key={type}
                          onClick={() => onFilterChange({ productType: filters.productType === type ? '' : type })}
                          className={cn(
                            "py-2 text-[11px] font-bold rounded-lg transition-all",
                            filters.productType === type
                              ? "bg-white text-[var(--color-primary)] shadow-sm ring-1 ring-slate-200"
                              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </Section>

          <div className="h-px bg-slate-100 my-2" />

          {/* Pricing & Data Quality */}
          <Section title="Pricing & Quality">
             <div className="space-y-6">
                {/* Price Range */}
                <div className="space-y-3">
                   <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Price Range (MRP)</label>
                   <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                        <input 
                          type="number" 
                          placeholder="Min"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] transition-all font-semibold"
                          value={filters.minPrice}
                          onChange={e => onFilterChange({ minPrice: e.target.value })}
                        />
                      </div>
                      <div className="w-2 h-0.5 bg-slate-300 rounded-full" />
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                        <input 
                          type="number" 
                          placeholder="Max"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] transition-all font-semibold"
                          value={filters.maxPrice}
                          onChange={e => onFilterChange({ maxPrice: e.target.value })}
                        />
                      </div>
                   </div>
                </div>

                {/* Data Quality */}
                <div className="grid grid-cols-2 gap-3">
                   <QualityToggle 
                    label="Has Image" 
                    active={filters.hasImage === true}
                    inactive={filters.hasImage === false}
                    onClick={() => toggleBoolean('hasImage')}
                   />
                   <QualityToggle 
                    label="Has Notes" 
                    active={filters.hasNotes === true}
                    inactive={filters.hasNotes === false}
                    onClick={() => toggleBoolean('hasNotes')}
                   />
                </div>
             </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2 text-slate-500">
                <Info size={14} />
                <span className="text-[11px] font-bold uppercase tracking-wider">{matchCount} matching SKUs</span>
             </div>
             <button 
               onClick={onClearAll}
               className="text-[11px] font-bold text-red-500 hover:text-red-600 hover:underline transition-all uppercase tracking-widest"
             >
               Reset All
             </button>
          </div>
          <Button 
            className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-[var(--color-primary)]/20"
            onClick={onClose}
          >
            Show {matchCount} Matching SKUs
          </Button>
        </div>

      </div>
    </>
  );

  function toggleMultiSelect(key, id) {
    const current = filters[key] || [];
    const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    onFilterChange({ [key]: updated });
  }

  function toggleBoolean(key) {
    const val = filters[key];
    const updated = val === null ? true : val === true ? false : null;
    onFilterChange({ [key]: updated });
  }
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[var(--color-primary)]" />}
        <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all border",
        active 
          ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/10" 
          : "bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800"
      )}
    >
      {label}
    </button>
  );
}

function SearchableRefSelect({ label, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => 
    options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  , [options, search]);

  const toggle = (id) => {
    const updated = value.includes(id) ? value.filter(x => x !== id) : [...value, id];
    onChange(updated);
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">{label}</label>
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-100/50",
            isOpen && "ring-2 ring-[var(--color-primary)]/10 border-[var(--color-primary)] bg-white"
          )}
        >
          <span className={cn("text-sm font-semibold truncate max-w-[280px]", value.length === 0 ? "text-slate-400" : "text-slate-900")}>
            {value.length === 0 ? `Select ${label}` : `${value.length} selected`}
          </span>
          <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
            <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
              <Search size={14} className="text-slate-400" />
              <input 
                autoFocus
                type="text" 
                placeholder={`Search ${label}...`}
                className="bg-transparent border-none outline-none text-xs w-full font-semibold placeholder:font-normal"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic font-medium">No {label.toLowerCase()} found</div>
              ) : (
                filtered.map(opt => (
                  <div 
                    key={opt.id}
                    onClick={() => toggle(opt.id)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors group",
                      value.includes(opt.id) ? "bg-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/10" : "hover:bg-slate-50"
                    )}
                  >
                    <span className={cn("text-xs font-bold", value.includes(opt.id) ? "text-white" : "text-slate-700")}>{opt.label}</span>
                    {value.includes(opt.id) && <Check size={14} className="text-white" />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QualityToggle({ label, active, inactive, onClick }) {
  return (
    <div className="p-1 bg-slate-50 rounded-xl border border-slate-100 flex h-10">
      <button 
        onClick={onClick}
        className={cn(
          "flex-1 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
          active ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : 
          inactive ? "bg-red-500 text-white shadow-md shadow-red-500/20" : 
          "text-slate-400 hover:text-slate-500"
        )}
      >
        {active ? "Yes" : inactive ? "No" : label}
      </button>
    </div>
  );
}

function SelectedChip({ label, onRemove, color = "outline" }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-sm animate-in fade-in zoom-in-95 duration-200 border",
      color === "primary" 
        ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/10" 
        : "bg-white border-slate-200 text-slate-700"
    )}>
      <span>{label}</span>
      <button onClick={onRemove} className={cn(
        "hover:scale-110 transition-transform",
        color === "primary" ? "text-white/80 hover:text-white" : "text-slate-300 hover:text-red-500"
      )}>
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}

