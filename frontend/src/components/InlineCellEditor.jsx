import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X, Check, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Revised baseOuter for a seamless, "in-place" feel (no manual padding, parent td handles it)
  const baseOuter = "w-full h-full bg-transparent outline-none border-0 z-10 animate-editor-in";

  // ── 1. DROPDOWN (Combobox) ──────────────────────────────────────────────────
  if (['brand_reference_id', 'category_reference_id', 'sub_category_reference_id', 'status_reference_id', 'bundle_type', 'pack_type'].includes(col.id)) {
    const listMap = {
      'brand_reference_id': 'BRAND',
      'category_reference_id': 'CATEGORY',
      'sub_category_reference_id': 'SUB_CATEGORY',
      'status_reference_id': 'STATUS',
      'bundle_type': 'BUNDLE_TYPE',
      'pack_type': 'PACK_TYPE'
    };
    const refType = listMap[col.id];

    return (
      <div className={cn("w-full h-full relative z-10 animate-editor-in flex items-center")} ref={containerRef} onKeyDown={handleKey}>
        <div className="w-full flex items-center justify-between px-2.5 py-1.5 bg-white border border-[var(--color-primary)]/20 rounded-lg shadow-sm">
          <DynamicReferenceSelect
            referenceType={refType}
            value={value}
            preloadedOptions={refLists?.[refType] || []}
            onChange={(v, lbl) => {
              if (v !== value) {
                setValue(v);
                onSave(v);
              }
            }}
            onBlur={handleSave}
            autoOpen={true}
            variant="flat"
            placeholder={`Select ${col.label}...`}
          />
        </div>
      </div>
    );
  }

  // ── 2. LONG TEXT (Content Editor Card - Portaled) ───────────────────────────
  if (col.isContent) {
    const [saving, setSaving] = useState(false);
    const [rect, setRect] = useState(null);
    const hasChanges = value !== (initialValue ?? '');

    // Track original cell position to "float" over it
    useLayoutEffect(() => {
      if (containerRef.current) {
        const parentTd = containerRef.current.closest('td');
        if (parentTd) setRect(parentTd.getBoundingClientRect());
      }
    }, []);

    const handleContentSave = async () => {
      if (saving || !hasChanges) { onCancel(); return; }
      setSaving(true);
      await onSave(value);
      setSaving(false);
    };

    if (!rect) return <div ref={containerRef} className="w-full h-full" />;

    return createPortal(
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        {/* Backdrop for focus */}
        <div 
          className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] animate-in fade-in duration-200" 
          onClick={onCancel}
        />
        
        <div 
          className={cn(
            "bg-white rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.3)] border border-[var(--color-border)] overflow-hidden z-[1001] animate-[scale-in_0.2s_ease-out] relative",
            "w-full max-w-[520px]"
          )}
        >
          <div className="bg-slate-50 px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
               <div className="w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full animate-pulse shadow-[0_0_10px_var(--color-primary)]" />
               <span className="text-[12px] font-black uppercase tracking-[0.15em] text-slate-500">Editing {col.label}</span>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors group">
              <X size={16} className="text-slate-400 group-hover:text-slate-600" />
            </button>
          </div>

          <div className="p-6 bg-white">
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Enter ${col.label}...`}
              className="w-full h-64 p-5 text-[14px] rounded-2xl border border-[var(--color-border)] bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/5 focus:border-[var(--color-primary)] transition-all resize-none text-[var(--color-foreground)] leading-relaxed placeholder:opacity-40"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleContentSave();
                if (e.key === 'Escape') onCancel();
              }}
            />

            <div className="flex items-center justify-between mt-6">
              <button 
                onClick={onCancel}
                className="text-[12px] font-bold text-slate-400 hover:text-slate-600 transition-colors px-2"
              >
                Discard Changes
              </button>
              
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-slate-400 font-bold italic hidden sm:block opacity-60">
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to Apply
                </span>
                <Button
                  size="default"
                  onClick={handleContentSave}
                  disabled={saving}
                  className={cn(
                    "h-11 px-7 rounded-2xl font-black text-[12px] uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl",
                    hasChanges 
                      ? "bg-[var(--color-primary)] text-white shadow-[var(--color-primary)]/30 scale-105 active:scale-95" 
                      : "bg-slate-100 text-slate-400 shadow-none cursor-default"
                  )}
                >
                  {saving ? <RefreshCcw size={14} className="animate-spin" /> : <Check size={18} />}
                  <span>Save {col.label}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
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
