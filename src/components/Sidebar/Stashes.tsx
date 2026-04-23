import { useState, useRef, useEffect } from "react";
import { Layers, CloudSync, Trash2, ChevronsDown } from "lucide-react";
import { StashEntry } from "../../store";
import { applyStash, popStash, dropStash } from "../../lib/repo";
import { confirm } from "../ui/ConfirmDialog";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { motion } from "framer-motion";
import { Highlight } from "./utils";

interface StashEntryItemProps {
  stash: StashEntry;
  filter: string;
  onContextMenu: (e: React.MouseEvent, stash: StashEntry) => void;
}

export function StashEntryItem({ stash, filter, onContextMenu }: StashEntryItemProps) {
  const timeStr = new Date(stash.timestamp * 1000).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  }) + ' ' + new Date(stash.timestamp * 1000).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', hour12: false
  });

  return (
    <motion.div 
      layout
      onContextMenu={(e) => onContextMenu(e, stash)}
      className="flex flex-col p-3 bg-background/40 hover:bg-white/5 border border-border/40 rounded-xl cursor-pointer group transition-all relative mx-0.5"
      title={`stash@{${stash.stackIndex}}: ${stash.message}`}
    >
       <div className="flex items-center gap-2.5 mb-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Layers size={14} className="shrink-0" />
          </div>
          <span className="text-[13.5px] text-foreground font-medium truncate pr-1 tracking-tight">
             <Highlight text={stash.message || `stash@{${stash.stackIndex}}`} query={filter} />
          </span>
       </div>

       <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono opacity-70">
          <Badge variant="glass" className="h-5 px-1.5 text-[10px] border-none">stash@&#123;{stash.stackIndex}&#125;</Badge>
          <span>{timeStr}</span>
       </div>

       <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
           <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => { e.stopPropagation(); applyStash(stash.stackIndex); }}
              className="h-6 w-6 text-primary hover:bg-primary/20" 
              title="Apply"
           >
              <CloudSync size={12} />
           </Button>
           <Button 
              variant="ghost" 
              size="icon"
              onClick={async (e) => { 
                e.stopPropagation(); 
                const ok = await confirm({
                  title: 'Delete Stash',
                  message: 'Are you sure you want to delete this stash entry? This action cannot be undone.',
                  detail: <span className="text-xs text-muted-foreground font-mono italic">"{stash.message}"</span>,
                  confirmLabel: 'Delete',
                  variant: 'danger'
                });
                if (ok) await dropStash(stash.stackIndex);
              }}
              className="h-6 w-6 text-destructive hover:bg-destructive/20" 
              title="Drop"
           >
              <Trash2 size={12} />
           </Button>
       </div>
    </motion.div>
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
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className="bg-background backdrop-blur-xl border border-border rounded-xl shadow-2xl z-[9999] overflow-hidden py-1.5 min-w-[180px]"
      style={{
        position: 'fixed',
        left: menuPos.x,
        top: menuPos.y,
      }}
    >
      <div className="px-3 py-2 border-b border-border mb-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] font-mono opacity-60">stash@{stash.stackIndex}</Badge>
        </div>
      </div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); applyStash(stash.stackIndex); }}
        className="w-full text-left px-3 py-2 text-[12.5px] text-foreground hover:bg-primary/10 hover:text-primary flex items-center gap-3 transition-all"
      >
        <CloudSync size={14} className="opacity-60" />
        Apply Stash
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); popStash(stash.stackIndex); }}
        className="w-full text-left px-3 py-2 text-[12.5px] text-foreground hover:bg-dracula-green/10 hover:text-dracula-green flex items-center gap-3 transition-all"
      >
        <ChevronsDown size={14} className="opacity-60" />
        Pop Stash
      </button>
      <div className="h-[1px] bg-border my-1.5 mx-2 opacity-50" />
      <button 
        onClick={async (e) => { 
          e.stopPropagation(); 
          onClose(); 
          const ok = await confirm({
            title: 'Delete Stash',
            message: 'Are you sure you want to delete this stash entry? This action cannot be undone.',
            detail: <span className="text-xs text-muted-foreground font-mono italic">"{stash.message}"</span>,
            confirmLabel: 'Delete',
            variant: 'danger'
          });
          if (ok) await dropStash(stash.stackIndex);
        }}
        className="w-full text-left px-3 py-2 text-[12.5px] text-destructive hover:bg-destructive/10 flex items-center gap-3 transition-all"
      >
        <Trash2 size={14} className="opacity-60" />
        Drop Stash
      </button>
    </motion.div>
  );
}
