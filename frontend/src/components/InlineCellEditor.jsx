import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import DynamicReferenceSelect from './DynamicReferenceSelect';

/**
 * Robust cell editor handling specific form factors (ComboBox, TextArea, Input)
 * to avoid data-grid CSS overflow clipping.
 */
export default function InlineCellEditor({
  col,
  sku,
  initialValue,
  onSave,
  onCancel,
  refLists,
}) {
  const [value, setValue] = useState(initialValue ?? '');
  const containerRef = useRef(null);
  
  // Save handler logic
  const handleSave = () => onSave(value === '' ? null : value);
  const handleKey  = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    if (e.key === 'Enter' && !col.isContent) { e.preventDefault(); handleSave(); }
  };

  // Auto-focus input when mounted
  useEffect(() => {
    const el = containerRef.current?.querySelector('input, textarea');
    if (el) {
      el.focus();
      if (typeof el.select === 'function') el.select();
    }
  }, []);

  // Base typography to exactly match cell contents for seamless transition
  const typography = cn(
    col.isNum ? "font-semibold text-sm text-right tabular-nums" :
    col.isMono ? "font-mono text-xs text-[var(--color-foreground)]" :
    "text-sm text-[var(--color-foreground)]"
  );
  const baseOuter = "w-full h-full absolute inset-0 px-4 py-3 bg-[var(--color-card)] outline-none border-2 border-[var(--color-primary)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-[100] transition-colors";

  // ── 1. DROPDOWN (Combobox) ──────────────────────────────────────────────────
  if (['brand_reference_id', 'category_reference_id', 'sub_category_reference_id', 'status_reference_id'].includes(col.id)) {
    const listMap = { 
      'brand_reference_id': 'BRAND', 
      'category_reference_id': 'CATEGORY', 
      'sub_category_reference_id': 'SUB_CATEGORY', 
      'status_reference_id': 'STATUS' 
    };
    const refType = listMap[col.id];
    
    // We override DynamicReferenceSelect to look completely flat and fully fill the cell
    return (
      <div className={cn(baseOuter, "p-0 rounded-none flex items-center shadow-lg border outline-none", typography)} ref={containerRef} onKeyDown={handleKey}>
        <DynamicReferenceSelect
          referenceType={refType}
          value={value}
          preloadedOptions={refLists?.[refType] || []}
          onChange={(v) => { setValue(v); onSave(v); }} // Auto-save and close on select
          onBlur={handleSave}
          placeholder={`Search ${col.label}...`}
        />
      </div>
    );
  }

  // ── 2. LONG TEXT (Content) ──────────────────────────────────────────────────
  if (col.isContent) {
    const popOutClass = cn(
      "absolute left-[-2px] top-[-2px] w-[calc(100%+4px)] min-h-[160px] p-4 bg-[var(--color-card)] outline-none border-2 border-[var(--color-primary)] rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.25)] z-[200] resize-y leading-relaxed",
      typography
    );
    return (
      <div className="relative w-full h-full" ref={containerRef}>
         <textarea
           value={value}
           onChange={(e) => setValue(e.target.value)}
           onBlur={handleSave}
           onKeyDown={handleKey}
           className={popOutClass}
           placeholder={`Enter ${col.label}...`}
         />
      </div>
    );
  }

  // ── 3. STANDARD TEXT / NUMBER ───────────────────────────────────────────────
  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <input
        type={col.isNum ? 'number' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKey}
        className={cn(baseOuter, typography)}
      />
    </div>
  );
}
