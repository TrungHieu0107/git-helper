import { useState } from "react";
import { useAppStore } from "../store";
import { Trash2, Network, FileCode2, Edit2, PlusCircle, MinusCircle, ArrowRight, AlertTriangle, Sparkles } from "lucide-react";

export function RightPanel({ loadStatus }: { loadStatus?: (path: string) => void }) {
  const { stagedFiles, unstagedFiles } = useAppStore();
  const [message, setMessage] = useState('');
  const charsLeft = 72 - message.length;

  return (
    <aside className="w-[var(--right-width)] flex flex-col bg-[#21252b] border-l border-[#181a1f] shrink-0 text-[#a0a6b1] select-none h-full relative">
      
      {/* Sticky Header */}
      <header className="h-[36px] border-b border-[#181a1f] flex items-center px-4 justify-between bg-[#21252b] z-10 shrink-0">
         <div className="flex items-center gap-3">
           <Trash2 size={14} className="cursor-pointer hover:text-white" />
           <span className="text-[11px] uppercase tracking-wider text-[#d7dae0] font-semibold">
              {stagedFiles.length + unstagedFiles.length} file changes on 
              <span className="bg-slate-700 text-white px-1.5 py-0.5 rounded ml-2">main</span>
           </span>
         </div>
         <div className="flex items-center gap-2 text-[#5c6370]">
           <FileCode2 size={16} className="cursor-pointer hover:text-white" />
           <Network size={16} className="cursor-pointer hover:text-white" />
         </div>
      </header>
      
      {/* Scrollable File List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 text-sm flex flex-col">
         
         <div className="mb-4">
            <div className="flex justify-between items-center text-[11px] font-semibold uppercase text-[#5c6370] mb-1 group px-1">
               <span>▼ Unstaged Files ({unstagedFiles.length})</span>
               <button className="invisible group-hover:visible hover:text-white border px-1 rounded border-slate-600 bg-slate-700 text-[10px]">Stage All</button>
            </div>
            {unstagedFiles.length > 0 ? unstagedFiles.map((f, i) => (
                <FileRow key={i} name={f.path} status={f.status} icon={getIcon(f.status)} />
            )) : <div className="text-xs italic px-4 py-1.5 opacity-50">No unstaged changes</div>}
         </div>

         <div>
            <div className="flex justify-between items-center text-[11px] font-semibold uppercase text-[#5c6370] mb-1 group px-1">
               <span>▼ Staged Files ({stagedFiles.length})</span>
               <button className="invisible group-hover:visible hover:text-white border px-1 rounded border-slate-600 bg-slate-700 text-[10px]">Unstage All</button>
            </div>
            {stagedFiles.length > 0 ? stagedFiles.map((f, i) => (
                <FileRow key={i} name={f.path} status={f.status} icon={getIcon(f.status)} />
            )) : <div className="text-xs italic px-4 py-1.5 opacity-50">Nothing staged</div>}
         </div>

      </div>

      {/* Slide In Diff Placeholder - would be absolute positioned here */}

      {/* Commit Form Block (Non-Scrollable Footer) */}
      <div className="border-t border-[#181a1f] bg-[#282c34] flex flex-col shrink-0 p-3 pt-2 gap-2 text-sm">
         <div className="flex items-center justify-between text-[#5c6370] mb-1">
             <span className="flex items-center gap-1 font-semibold  text-xs">─── ⊙ Commit <span className="ml-2 font-mono">↑ ↺</span> ───</span>
         </div>
         
         <label className="flex items-center gap-2 cursor-pointer text-xs mb-1">
            <input type="checkbox" className="accent-blue-500 bg-[#1e2227] border-[#181a1f]" />
            Amend previous commit
         </label>
         
         <div className="relative">
            <input type="text" placeholder="Commit summary" className="w-full bg-[#1e2227] border border-[#181a1f] rounded px-2 py-1.5 outline-none text-[#e5e5e6] focus:border-[#3b82f6] text-sm pr-12" value={message} onChange={e => setMessage(e.target.value)} />
            <span className={`absolute right-2 top-2 text-[10px] font-mono ${charsLeft < 0 ? 'text-red-400' : charsLeft < 20 ? 'text-[#e5c07b]' : 'text-[#5c6370]'}`}>{charsLeft}</span>
         </div>
         
         <textarea placeholder="Description" rows={3} className="w-full bg-[#1e2227] border border-[#181a1f] rounded px-2 py-1.5 outline-none text-[#e5e5e6] focus:border-[#3b82f6] text-sm resize-none"></textarea>

         <button className="w-full border border-[#3b82f6]/50 text-[#3b82f6] hover:bg-[#3b82f6]/10 py-1.5 rounded flex items-center justify-center gap-1 text-xs font-semibold">
            <Sparkles size={12} /> Compose commits with AI
         </button>
         
         <button className={`w-full bg-[#3b82f6] text-white py-2 rounded font-semibold transition-opacity ${(stagedFiles.length === 0 || message.trim() === '') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#4d8bf8]'}`}>
            Type a Message to Commit
         </button>
      </div>

    </aside>
  );
}

function FileRow({ name, status, icon: Icon }: { name: string, status: string, icon: any }) {
  let color = "text-[#e5c07b]"; // Modified (amber)
  if (status === 'untracked') color = "text-[#98c379]"; // Green
  if (status === 'deleted') color = "text-[#e06c75]"; // Red
  if (status === 'renamed') color = "text-[#61afef]"; // Blue
  if (status === 'conflicted') color = "text-[#f44336]"; 

  return (
    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-[#2c313a] rounded cursor-pointer group whitespace-nowrap">
        <div className="flex items-center gap-2 overflow-hidden">
           <Icon size={12} className={`shrink-0 ${color}`} />
           <span className="truncate text-[#e5e5e6] text-[13px]">{name}</span>
        </div>
        <button className="invisible group-hover:visible shrink-0 bg-transparent text-[#5c6370] hover:text-[#e5e5e6] px-1 text-xs">Stage</button>
    </div>
  )
}

function getIcon(status: string) {
    switch (status) {
        case 'untracked': return PlusCircle;
        case 'deleted': return MinusCircle;
        case 'renamed': return ArrowRight;
        case 'conflicted': return AlertTriangle;
        default: return Edit2; 
    }
}
