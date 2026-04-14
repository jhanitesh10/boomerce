import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X, Check, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DynamicReferenceSelect from './DynamicReferenceSelect';

const REF_MAP = {
  'brand_reference_id': 'BRAND',
  'category_reference_id': 'CATEGORY',
  'sub_category_reference_id': 'SUB_CATEGORY',
  'status_reference_id': 'STATUS',
  'bundle_type': 'BUNDLE_TYPE',
  'pack_type': 'PACK_TYPE',
  'net_quantity_unit_reference_id': 'NET_QUANTITY_UNIT',
  'size_reference_id': 'SIZE'
};

/**
 * Robust cell editor that uses a Portal to float above all grid layers.
 * Fixes clipping issues and standardizes keyboard shortcuts (Enter to save, Esc to cancel).
 */
export default function InlineCellEditor({
  col,
  initialValue,
  onSave,
  onCancel,
  refLists,
}) {
  const [value, setValue] = useState(initialValue ?? '');
  const [saving, setSaving] = useState(false);
  const [rect, setRect] = useState(null);
  
  const containerRef = useRef(null);
  const cancellingRef = useRef(false);

  const isDropdown = !!REF_MAP[col.id];
  const hasChanges = value !== (initialValue ?? '');

  // ── 1. Coordinate Tracking & Portaling ───────────────────────────────────────
  // We need to keep the portaled editor synced with the cell position
  const updateRect = () => {
    if (containerRef.current) {
      const parentTd = containerRef.current.closest('td');
      if (parentTd) {
        setRect(parentTd.getBoundingClientRect());
      }
    }
  };

  useLayoutEffect(() => {
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, []);

  // Auto-focus input when rect is ready
  useEffect(() => {
    if (rect && !isDropdown) {
      const el = document.querySelector('.portaled-inline-editor input, .portaled-inline-editor textarea');
      if (el) {
        el.focus();
        if (typeof el.select === 'function') el.select();
      }
    }
  }, [rect, isDropdown]);

  // ── 2. Keyboard & Interaction Logic ──────────────────────────────────────────
  const finish = (type, val) => {
    if (cancellingRef.current) return;
    if (type === 'cancel') {
      cancellingRef.current = true;
      onCancel();
    } else {
      onSave(val === '' ? null : val);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      finish('cancel');
    }
    if (e.key === 'Enter' && !col.isContent && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      finish('save', value);
    }
  };

  const handleBlur = () => {
    // Small delay to let any simultaneous key events (like Esc) process first
    setTimeout(() => {
      finish('save', value);
    }, 10);
  };

  const handleContentSave = async () => {
    if (saving) return;
    if (!hasChanges) { onCancel(); return; }
    setSaving(true);
    await onSave(value);
    setSaving(false);
  };

  // ── 3. Render logic ──────────────────────────────────────────────────────────
  
  // Base typography to exactly match cell contents for seamless transition
  const typography = cn(
    col.isNum ? "font-semibold text-sm text-right tabular-nums" :
    col.isMono ? "font-mono text-xs text-[var(--color-foreground)]" :
    "text-sm text-[var(--color-foreground)]"
  );

  // Hidden anchor in the table to find coordinates
  const anchor = <div ref={containerRef} className="opacity-0 pointer-events-none w-full h-full" />;

  if (!rect) return anchor;

  // Render the actual editor in the Portal
  return (
    <>
      {anchor}
      {createPortal(
        <div 
          className="portaled-inline-editor fixed z-[1000] pointer-events-auto"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          onKeyDown={handleKey}
        >
          {/* ── CASE A: LONG TEXT (Content Modal) ── */}
          {col.isContent ? (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]" onClick={onCancel} />
              <div className="relative w-full max-w-[520px] bg-white rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.3)] border border-[var(--color-border)] overflow-hidden z-[1001] animate-[scale-in_0.2s_ease-out]">
                <div className="bg-slate-50 px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
                    <span className="text-[12px] font-black uppercase tracking-[0.15em] text-slate-500">Editing {col.label}</span>
                  </div>
                  <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors group">
                    <X size={16} className="text-slate-400 group-hover:text-slate-600" />
                  </button>
                </div>
                <div className="p-6 bg-white text-left">
                  <textarea
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`Enter ${col.label}...`}
                    className="w-full h-64 p-5 text-[14px] rounded-2xl border border-[var(--color-border)] bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/5 focus:border-[var(--color-primary)] transition-all resize-none text-[var(--color-foreground)] leading-relaxed placeholder:opacity-40"
                    onKeyDown={handleKey}
                  />
                  <div className="flex items-center justify-between mt-6">
                    <button onClick={onCancel} className="text-[12px] font-bold text-slate-400 hover:text-slate-600 transition-colors px-2">Discard Changes</button>
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-slate-400 font-bold italic hidden sm:block opacity-60">
                        {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to Save
                      </span>
                      <Button size="default" onClick={handleContentSave} disabled={saving}
                        className={cn("h-11 px-7 rounded-2xl font-black text-[12px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl",
                        hasChanges ? "bg-[var(--color-primary)] text-white shadow-[var(--color-primary)]/30 scale-105 active:scale-95" : "bg-slate-100 text-slate-400 shadow-none cursor-default")}
                      >
                        {saving ? <RefreshCcw size={14} className="animate-spin" /> : <Check size={18} />}
                        <span>Save {col.label}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : isDropdown ? (
            /* ── CASE B: DROPDOWN ── */
            <div className="w-full h-full flex items-center bg-white shadow-2xl rounded-sm">
              <DynamicReferenceSelect
                referenceType={REF_MAP[col.id]}
                value={value}
                preloadedOptions={refLists?.[REF_MAP[col.id]] || []}
                onChange={(v) => { if (v !== value) { setValue(v); finish('save', v); } }}
                onBlur={handleBlur}
                autoOpen={true}
                variant="flat"
                placeholder={`Select ${col.label}...`}
              />
            </div>
          ) : (
            /* ── CASE C: STANDARD INPUT ── */
            <div className="w-full h-full relative group/editor animate-editor-in flex items-center">
              <input
                type={col.isNum ? 'number' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKey}
                autoFocus
                className={cn(
                  "w-full h-full bg-white px-2 rounded border border-[var(--color-primary)] shadow-2xl outline-none transition-all z-20",
                  typography
                )}
              />
              {/* Keyboard Shortcut Hint (Floats below the portal container) */}
              <div className="absolute top-[calc(100%+8px)] left-0 flex flex-row items-center gap-2 px-2.5 py-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-bold z-[1001] shadow-2xl whitespace-nowrap animate-in fade-in slide-in-from-top-2">
                <span className="flex items-center gap-1.5">
                  <span className="bg-slate-700 px-1.5 py-0.5 rounded text-[9px]">Enter</span> to save
                </span>
                <div className="w-px h-2.5 bg-white/20" />
                <span className="flex items-center gap-1.5">
                  <span className="bg-slate-700 px-1.5 py-0.5 rounded text-[9px]">Esc</span> to cancel
                </span>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
