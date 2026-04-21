import { useState, useRef, useEffect } from "react";
import { Layers, CloudSync, Trash2, ChevronsDown } from "lucide-react";
import { useAppStore, StashEntry } from "../../store";
import { applyStash, popStash, dropStash } from "../../lib/repo";
import { confirm } from "../ui/ConfirmDialog";

interface StashEntryItemProps {
  stash: StashEntry;
  filter: string;
  onContextMenu: (e: React.MouseEvent, stash: StashEntry) => void;
}

import { Highlight } from "./utils";

export function StashEntryItem({ stash, filter, onContextMenu }: StashEntryItemProps) {
  const timeStr = new Date(stash.timestamp * 1000).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  }) + ' ' + new Date(stash.timestamp * 1000).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', hour12: false
  });

  return (
    <div 
      onClick={() => { /* maybe select later */ }}
      onContextMenu={(e) => onContextMenu(e, stash)}
      className="flex flex-col p-2 bg-[#1c2128] hover:bg-[#1f2937] border border-[#30363d] rounded-md cursor-pointer group transition-all relative mx-1"
      title={`stash@{${stash.stackIndex}}: ${stash.message}`}
    >
       <div className="flex items-center gap-2 mb-1">
          <Layers size={14} className="text-[#388bfd] shrink-0" />
          <span className="text-[13px] text-[#e6edf3] font-medium truncate pr-1">
             <Highlight text={stash.message || `stash@{${stash.stackIndex}}`} query={filter} />
          </span>
       </div>

       <div className="flex items-center justify-between text-[11px] text-[#6e7681]">
          <span>stash@&#123;{stash.stackIndex}&#125;</span>
          <span>{timeStr}</span>
       </div>

       <div className="absolute top-1 right-1 flex items-center gap-1 invisible group-hover:visible transition-all">
           <button 
              onClick={(e) => { e.stopPropagation(); applyStash(stash.stackIndex); }}
              className="p-1 hover:bg-[#388bfd]/20 text-[#388bfd] rounded" 
              title="Apply"
           >
              <CloudSync size={14} />
           </button>
           <button 
              onClick={async (e) => { 
                e.stopPropagation(); 
                const ok = await confirm({
                  title: 'Delete Stash',
                  message: 'Are you sure you want to delete this stash entry? This action cannot be undone.',
                  detail: <span className="text-xs text-[#8b949e] font-mono italic">"{stash.message}"</span>,
                  confirmLabel: 'Delete',
                  variant: 'danger'
                });
                if (ok) await dropStash(stash.stackIndex);
              }}
              className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors" 
              title="Drop"
           >
              <Trash2 size={14} />
           </button>
       </div>
    </div>
  );
}

export function StashContextMenu({ stash, position, onClose }: { stash: StashEntry; position: { x: number; y: number }; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState(position);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = position;

    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    setMenuPos({ x, y });
  }, [position]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="bg-[#1c2128] border border-[#30363d] rounded shadow-2xl z-[9999] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left min-w-[160px]"
      style={{
        position: 'fixed',
        left: menuPos.x,
        top: menuPos.y,
      }}
    >
      <div className="px-3 py-1.5 border-b border-[#30363d] mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#6e7681]">stash@{stash.stackIndex}</span>
        </div>
      </div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); applyStash(stash.stackIndex); }}
        className="w-full text-left px-3 py-1.5 text-xs text-[#e6edf3] hover:bg-[#388bfd]/10 hover:text-[#388bfd] flex items-center gap-2 transition-colors"
      >
        <CloudSync size={14} />
        Apply Stash
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); popStash(stash.stackIndex); }}
        className="w-full text-left px-3 py-1.5 text-xs text-[#e6edf3] hover:bg-[#3fb950]/10 hover:text-[#3fb950] flex items-center gap-2 transition-colors"
      >
        <ChevronsDown size={14} />
        Pop Stash
      </button>
      <div className="h-[1px] bg-[#30363d] my-1" />
      <button 
        onClick={async (e) => { 
          e.stopPropagation(); 
          onClose(); 
          const ok = await confirm({
            title: 'Delete Stash',
            message: 'Are you sure you want to delete this stash entry? This action cannot be undone.',
            detail: <span className="text-xs text-[#8b949e] font-mono italic">"{stash.message}"</span>,
            confirmLabel: 'Delete',
            variant: 'danger'
          });
          if (ok) await dropStash(stash.stackIndex);
        }}
        className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
      >
        <Trash2 size={14} />
        Drop Stash
      </button>
    </div>
  );
}
