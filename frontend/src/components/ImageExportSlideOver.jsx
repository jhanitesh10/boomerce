import React, { useState, useMemo } from 'react';
import { 
  X, Download, Check, Image as ImageIcon, FolderTree, Tag, 
  Info, LayoutList, Files, Loader2, FileArchive, Plus, Trash2, 
  ChevronDown, Folder, File, Layers, GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { skuApi } from '../api';

const TAGS = [
  { id: 'brand', label: 'Brand', icon: Tag },
  { id: 'category', label: 'Category', icon: Layers },
  { id: 'sub_category', label: 'Sub-Category', icon: Layers },
  { id: 'sku_code', label: 'SKU Code', icon: Tag },
  { id: 'barcode', label: 'Barcode', icon: Tag },
  { id: 'product_name', label: 'Product Name', icon: Tag },
  { id: 'index', label: 'Image Index', icon: Layers }
];

export default function ImageExportSlideOver({ onClose, skus = [], filtered = [], selected = [], references = {}, isEmbedded = false }) {
  const [scope, setScope] = useState(selected.length > 0 ? 'selected' : 'filtered');
  const [isExporting, setIsExporting] = useState(false);
  const [flattenHierarchy, setFlattenHierarchy] = useState(false);

  // FOLDER LEVELS (Vertical)
  const [folderLevels, setFolderLevels] = useState(['brand', 'category', 'sku_code']);
  
  // FILE SEGMENTS (Horizontal)
  const [fileSegments, setFileSegments] = useState(['sku_code', 'index']);

  const targetData = useMemo(() => {
    if (scope === 'selected') return selected;
    if (scope === 'all') return skus;
    return filtered;
  }, [scope, skus, filtered, selected]);

  const computedFolderTemplate = useMemo(() => {
     return folderLevels.filter(t => t !== 'none').map(tag => `{{${tag}}}`).join('/');
  }, [folderLevels]);

  const computedFileTemplate = useMemo(() => {
     // Join segments with underscore. If only one segment, no underscore.
     return fileSegments
       .filter(t => t !== 'none')
       .map(tag => `{{${tag}}}`)
       .join('_');
  }, [fileSegments]);

  // FOLDER LOGIC
  const addFolderLevel = () => {
    if (folderLevels.length < 5) setFolderLevels([...folderLevels, 'none']);
  };
  const removeFolderLevel = (idx) => {
    setFolderLevels(folderLevels.filter((_, i) => i !== idx));
  };
  const updateFolderLevel = (idx, tagId) => {
    const next = [...folderLevels];
    next[idx] = tagId;
    setFolderLevels(next);
  };

  // FILE LOGIC
  const addFileSegment = () => {
    if (fileSegments.length < 4) setFileSegments([...fileSegments, 'none']);
  };
  const removeFileSegment = (idx) => {
    setFileSegments(fileSegments.filter((_, i) => i !== idx));
  };
  const updateFileSegment = (idx, tagId) => {
    const next = [...fileSegments];
    next[idx] = tagId;
    setFileSegments(next);
  };

  const resolveSample = () => {
    if (targetData.length === 0) return null;
    const sample = targetData[0];
    
    const getLabel = (refId, type) => references?.[type]?.[refId] || 'Example';

    const ctx = {
      brand: getLabel(sample.brand_reference_id, 'BRAND'),
      category: getLabel(sample.category_reference_id, 'CATEGORY'),
      sub_category: getLabel(sample.sub_category_reference_id, 'SUB_CATEGORY'),
      sku_code: sample.sku_code || 'SKU123',
      barcode: sample.barcode || '890...',
      product_name: sample.product_name || 'Example Product',
      index: '1'
    };

    const resolveTag = (tagId) => tagId === 'none' ? '' : (ctx[tagId] || tagId);

    const folder = flattenHierarchy 
      ? resolveTag('sku_code')
      : folderLevels.map(resolveTag).filter(Boolean).join('/');
    
    const fileName = fileSegments
      .map(resolveTag)
      .filter(Boolean)
      .join('_') + ".jpg";
    
    return `${folder}/${fileName}`;
  };

  const previewPath = resolveSample();

  const handleExport = async () => {
    if (targetData.length === 0) return;
    setIsExporting(true);
    try {
      const blob = await skuApi.exportImages({
        sku_ids: targetData.map(s => s.id),
        folder_template: computedFolderTemplate,
        file_template: computedFileTemplate,
        flatten_hierarchy: flattenHierarchy
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      link.setAttribute('download', `Bloomerce_Images_${ts}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      if (!isEmbedded) onClose();
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to generate image export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const content = (
    <div className={cn("flex flex-col h-full", !isEmbedded && "fixed inset-y-0 right-0 z-50 w-full md:max-w-xl bg-[var(--color-background)] border-l border-[var(--color-border)] shadow-2xl animate-in slide-in-from-right duration-300")}>
      
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-card)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] shadow-inner">
             <ImageIcon size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)]">Export Assets</h2>
            <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-wider">Structure Designer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleExport} 
            disabled={isExporting || targetData.length === 0}
            className="h-9 gap-2 shrink-0 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white transition-all"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>Download {targetData.length} SKUs Assets</span>
          </Button>
          {!isEmbedded && (
            <button onClick={onClose} className="p-2 hover:bg-[var(--color-muted)] rounded-full transition-colors text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar bg-[var(--color-background)]">
        
        {/* STEP 1: SCOPE */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold mb-3">1. Select Scope</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
             {[
              { id: 'selected', label: 'Current Page', count: selected.length, desc: 'Selected SKUs' },
              { id: 'filtered', label: 'Filtered Results', count: filtered.length, desc: 'Current search/filter' },
              { id: 'all', label: 'Full Catalog', count: skus.length, desc: 'Entire database' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setScope(opt.id)}
                disabled={opt.count === 0}
                className={cn(
                  "relative flex flex-col items-start p-3 border rounded-xl transition-all text-left group",
                  scope === opt.id 
                    ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-[var(--color-border)] hover:border-[var(--color-muted-foreground)] bg-[var(--color-card)] shadow-sm hover:shadow",
                  opt.count === 0 && "opacity-40 cursor-not-allowed grayscale"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={cn("text-xs font-semibold", scope === opt.id ? "text-[var(--color-primary)]" : "text-[var(--color-foreground)]")}>
                    {opt.label}
                  </span>
                  {scope === opt.id && <Check size={14} className="text-[var(--color-primary)]" />}
                </div>
                <span className="text-xl font-bold tabular-nums">
                  {opt.count}
                </span>
                <span className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* STEP 2: STRUCTURE */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold mb-3">2. Path Hierarchy</h3>
          
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setFlattenHierarchy(false)}
              className={cn(
                "flex items-center gap-4 p-4 border rounded-2xl transition-all text-left",
                !flattenHierarchy ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)] bg-[var(--color-muted)]/20 hover:bg-[var(--color-muted)]/40"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner", !flattenHierarchy ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "bg-[var(--color-card)] text-[var(--color-muted-foreground)]")}>
                <FolderTree size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-[var(--color-foreground)]">Maintain Nested Folders</p>
                <p className="text-[10px] text-[var(--color-muted-foreground)] font-medium">Create a stepped hierarchy of folders</p>
              </div>
            </button>

            <button 
              onClick={() => setFlattenHierarchy(true)}
              className={cn(
                "flex items-center gap-4 p-4 border rounded-2xl transition-all text-left",
                flattenHierarchy ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)] bg-[var(--color-muted)]/20 hover:bg-[var(--color-muted)]/40"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner", flattenHierarchy ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "bg-[var(--color-card)] text-[var(--color-muted-foreground)]")}>
                <Tag size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-[var(--color-foreground)]">Flat SKU Structure</p>
                <p className="text-[10px] text-[var(--color-muted-foreground)] font-medium">Put all images into their SKU folders directly</p>
              </div>
            </button>
          </div>
        </section>

        {/* STEP 3: VISUAL DESIGNER */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold mb-3">2. Configure Structure Designer</h3>

          <div className="bg-[var(--color-muted)]/20 rounded-3xl p-6 border border-[var(--color-border)] space-y-8 relative overflow-hidden">
            
            {/* FOLDER STACK */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                 <h4 className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest">Folder Structure</h4>
                 {!flattenHierarchy && folderLevels.length < 5 && (
                   <button onClick={addFolderLevel} className="text-xs text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1.5 transition-all group">
                      <Plus size={14} className="group-hover:rotate-90 transition-transform" /> Add Sub-folder
                   </button>
                 )}
              </div>

              <div className="space-y-1 relative">
                {!flattenHierarchy && (
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-[var(--color-border)]" />
                )}

                {!flattenHierarchy ? (
                  folderLevels.map((tagId, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200 relative group"
                      style={{ marginLeft: `${idx * 20}px` }}
                    >
                       {/* Connector line */}
                       {idx > 0 && (
                          <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-5 h-px bg-[var(--color-border)]" />
                       )}

                       <div className={cn(
                         "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all",
                         tagId === 'none' ? "bg-[var(--color-card)] border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)]" : "bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-muted-foreground)] shadow-sm"
                       )}>
                          <Folder size={16} />
                       </div>
                       <div className="flex-1 relative">
                          <select 
                            value={tagId} 
                            onChange={(e) => updateFolderLevel(idx, e.target.value)}
                            className={cn(
                              "w-full h-10 pl-3 pr-8 bg-[var(--color-card)] border rounded-xl text-xs font-bold transition-all outline-none appearance-none cursor-pointer",
                              tagId === 'none' 
                                ? "border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)] italic" 
                                : "border-[var(--color-border)] text-[var(--color-foreground)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                            )}
                          >
                             <option value="none">Choose Folder Name...</option>
                             {TAGS.filter(t => t.id !== 'index').map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] pointer-events-none" />
                       </div>
                       {folderLevels.length > 1 && (
                         <button onClick={() => removeFolderLevel(idx)} className="p-2.5 text-[var(--color-muted-foreground)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} />
                         </button>
                       )}
                    </div>
                  ))
                ) : (
                  <div className="p-5 bg-[var(--color-card)] border-dashed border-2 border-[var(--color-border)] rounded-3xl flex items-center justify-center gap-3 text-[var(--color-muted-foreground)] italic">
                     <Folder size={16} />
                     <span className="text-xs font-medium">Automatic SKU folder mode enabled</span>
                  </div>
                )}
              </div>
            </div>

            {/* FILE NAMING (Segments) */}
            <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between px-1">
                 <h4 className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest">File Name Components</h4>
                 <button onClick={addFileSegment} className="text-xs text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1.5 transition-all group">
                    <Plus size={14} className="group-hover:rotate-90 transition-transform" /> Add Component
                 </button>
              </div>

               <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--color-muted)]/40 border border-[var(--color-border)] rounded-2xl min-h-[64px]">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] shadow-sm shrink-0">
                     <File size={16} />
                  </div>
                  {fileSegments.map((tagId, idx) => (
                    <React.Fragment key={idx}>
                       {idx > 0 && <span className="text-[var(--color-muted-foreground)] font-black px-1">_</span>}
                       <div className="flex items-center gap-1 p-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm group">
                          <div className="relative">
                             <select 
                               value={tagId} 
                               onChange={(e) => updateFileSegment(idx, e.target.value)}
                               className={cn(
                                 "h-8 pl-3 pr-7 bg-[var(--color-primary)]/5 border-none rounded-xl text-[11px] font-black text-[var(--color-primary)] appearance-none outline-none cursor-pointer min-w-[100px]",
                                 tagId === 'none' && "text-[var(--color-muted-foreground)] italic bg-[var(--color-muted)] font-normal"
                               )}
                             >
                                <option value="none">Choose...</option>
                                {TAGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                             </select>
                             <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-primary)]/50 pointer-events-none" />
                          </div>
                          {fileSegments.length > 1 && (
                            <button onClick={() => removeFileSegment(idx)} className="p-1 px-2 text-[var(--color-muted-foreground)] hover:text-red-500 transition-colors">
                               <Trash2 size={14} />
                            </button>
                          )}
                       </div>
                    </React.Fragment>
                  ))}
                  <div className="text-[11px] font-black text-[var(--color-muted-foreground)] ml-1">.JPG</div>
               </div>
            </div>

          </div>
        </section>

      </div>

      {/* Footer with Sticky Preview */}
      <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-card)] shrink-0 space-y-4 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        
        {/* Compact Sticky Preview */}
        {targetData.length > 0 && previewPath && (
          <div className="flex flex-col gap-1.5 px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest">Export Directory Path</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--color-primary)]/10 rounded-full text-[9px] font-bold text-[var(--color-primary)]">
                 <div className="w-1 h-1 rounded-full bg-[var(--color-primary)] animate-pulse" /> Live
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono leading-relaxed truncate">
              <span className="text-[var(--color-muted-foreground)] text-[10px] select-none uppercase">Root /</span>
              {previewPath.split('/').map((seg, i, arr) => (
                <React.Fragment key={i}>
                  <span className={cn(
                    "transition-all duration-300",
                    i === arr.length - 1 
                      ? "text-[var(--color-primary)] font-bold bg-[var(--color-primary)]/10 px-1 rounded-sm" 
                      : "text-[var(--color-muted-foreground)]"
                  )}>
                    {seg || '?'}
                  </span>
                  {i < arr.length - 1 && <span className="text-[var(--color-muted-foreground)]">/</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );

  if (isEmbedded) return content;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      {content}
    </>
  );
}
