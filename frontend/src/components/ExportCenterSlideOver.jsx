import React, { useState } from 'react';
import { X, FileSpreadsheet, Image as ImageIcon, Download, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ExportSlideOver from './ExportSlideOver';
import ImageExportSlideOver from './ImageExportSlideOver';

export default function ExportCenterSlideOver({ onClose, skus = [], filtered = [], selected = [], references = {} }) {
  const [activeTab, setActiveTab] = useState('csv'); // 'csv' or 'media'

  const TABS = [
    { id: 'csv', label: 'Data Catalog', icon: FileSpreadsheet, desc: 'CSV Export' },
    { id: 'media', label: 'Media Assets', icon: ImageIcon, desc: 'Image ZIP' }
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full md:max-w-2xl bg-[var(--color-background)] border-l border-[var(--color-border)] shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex flex-col bg-[var(--color-card)] border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shadow-inner">
                 <Share2 size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--color-foreground)] leading-tight">Export Center</h2>
                <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-widest">Manage Assets & Data</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--color-muted)] rounded-full transition-colors text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-6 gap-6 bg-[var(--color-muted)]/30 pt-1">
             {TABS.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={cn(
                   "flex items-center gap-2 pb-3 text-xs font-bold transition-all relative group pt-2",
                   activeTab === tab.id 
                     ? "text-[var(--color-primary)]" 
                     : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                 )}
               >
                 <tab.icon size={14} className={activeTab === tab.id ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"} />
                 <span>{tab.label}</span>
                 {activeTab === tab.id && (
                   <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--color-primary)] rounded-t-full shadow-[0_-2px_8px_var(--color-primary)]/20" />
                 )}
               </button>
             ))}
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-hidden relative border-t border-[var(--color-border)]">
           <div className={cn("absolute inset-0", activeTab === 'csv' ? "block" : "hidden text-invisible h-0 w-0 overflow-hidden")}>
             <ExportSlideOver 
               isEmbedded={true} 
               onClose={onClose} 
               skus={skus} 
               filtered={filtered} 
               selected={selected} 
               references={references} 
             />
           </div>
           <div className={cn("absolute inset-0", activeTab === 'media' ? "block" : "hidden text-invisible h-0 w-0 overflow-hidden")}>
             <ImageExportSlideOver 
               isEmbedded={true} 
               onClose={onClose} 
               skus={skus} 
               filtered={filtered} 
               selected={selected} 
               references={references} 
             />
           </div>
        </div>
      </div>
    </>
  );
}
