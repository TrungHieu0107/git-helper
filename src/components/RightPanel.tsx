import { useState } from "react";
import { useAppStore } from "../store";
import { Trash2, Network, FileCode2, Edit2, PlusCircle, MinusCircle, ArrowRight, AlertTriangle, Sparkles, X } from "lucide-react";
import { stageFile, unstageFile, stageAll, unstageAll, commitRepo, getFileDiff } from "../lib/repo";
import { DiffPanel } from "./DiffPanel";
import { CommitDetailPanel } from "./CommitDetailPanel";

export function RightPanel() {
  const { stagedFiles, unstagedFiles, activeBranch, selectedCommitDetail, isLoadingCommitDetail } = useAppStore();
  const [message, setMessage] = useState('');
  const charsLeft = 72 - message.length;

  const [amend, setAmend] = useState(false);

  const handleCommit = async () => {
    const success = await commitRepo(message, amend);
    if (success) {
      setMessage('');
      setAmend(false);
    }
  };

  const isViewingCommit = selectedCommitDetail || isLoadingCommitDetail;

  return (
    <aside className="w-[var(--right-width)] flex flex-col bg-[#21252b] border-l border-[#181a1f] shrink-0 text-[#a0a6b1] select-none h-full relative">
      
      {isViewingCommit ? (
        <div className="flex flex-col h-full relative">
          <button 
            onClick={() => useAppStore.setState({ selectedCommitDetail: null, isLoadingCommitDetail: false })}
            className="absolute top-2 right-2 z-20 p-1 hover:bg-white/5 rounded text-[#5c6370] hover:text-white"
            title="Back to Staging"
          >
            <X size={14} />
          </button>
          <CommitDetailPanel />
        </div>
      ) : (
        <>
          {/* Sticky Header */}
          <header className="h-[36px] border-b border-[#181a1f] flex items-center px-4 justify-between bg-[#21252b] z-10 shrink-0">
             <div className="flex items-center gap-3">
               <Trash2 size={14} className="cursor-pointer hover:text-white" />
               <span className="text-[11px] uppercase tracking-wider text-[#d7dae0] font-semibold">
                  {stagedFiles.length + unstagedFiles.length} file changes on 
                  <span className="bg-slate-700 text-white px-1.5 py-0.5 rounded ml-2">{activeBranch || '...'}</span>
               </span>
             </div>
             <div className="flex items-center gap-2 text-[#5c6370]">
               <FileCode2 size={16} className="cursor-pointer hover:text-white" />
               <Network size={16} className="cursor-pointer hover:text-white" />
             </div>
          </header>
          
          {/* Scrollable File List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 text-sm flex flex-col custom-scrollbar">
             
             <div className="mb-4">
                <div className="flex justify-between items-center text-[11px] font-semibold uppercase text-[#5c6370] mb-1 group px-1">
                   <span>▼ Unstaged Files ({unstagedFiles.length})</span>
                   <button 
                    onClick={stageAll}
                    className="invisible group-hover:visible hover:text-white border px-1 rounded border-slate-600 bg-slate-700 text-[10px]"
                   >
                     Stage All
                   </button>
                </div>
                {unstagedFiles.length > 0 ? unstagedFiles.map((f, i) => (
                    <FileRow 
                      key={i} 
                      name={f.path} 
                      status={f.status} 
                      icon={getIcon(f.status)} 
                      onAction={() => stageFile(f.path)}
                      actionLabel="Stage"
                      onClick={() => getFileDiff(f.path, false)}
                    />
                )) : <div className="text-xs italic px-4 py-1.5 opacity-50">No unstaged changes</div>}
             </div>

             <div>
                <div className="flex justify-between items-center text-[11px] font-semibold uppercase text-[#5c6370] mb-1 group px-1">
                   <span>▼ Staged Files ({stagedFiles.length})</span>
                   <button 
                    onClick={unstageAll}
                    className="invisible group-hover:visible hover:text-white border px-1 rounded border-slate-600 bg-slate-700 text-[10px]"
                   >
                     Unstage All
                   </button>
                </div>
                {stagedFiles.length > 0 ? stagedFiles.map((f, i) => (
                    <FileRow 
                      key={i} 
                      name={f.path} 
                      status={f.status} 
                      icon={getIcon(f.status)} 
                      onAction={() => unstageFile(f.path)}
                      actionLabel="Unstage"
                      onClick={() => getFileDiff(f.path, true)}
                    />
                )) : <div className="text-xs italic px-4 py-1.5 opacity-50">Nothing staged</div>}
             </div>

          </div>

          {/* Commit Form Block */}
          <div className="border-t border-[#181a1f] bg-[#282c34] flex flex-col shrink-0 p-3 pt-2 gap-2 text-sm">
             <div className="flex items-center justify-between text-[#5c6370] mb-1">
                 <span className="flex items-center gap-1 font-semibold  text-xs">─── ⊙ Commit <span className="ml-2 font-mono">↑ ↺</span> ───</span>
             </div>
             
             <label className="flex items-center gap-2 cursor-pointer text-xs mb-1">
                <input 
                  type="checkbox" 
                  checked={amend}
                  onChange={e => setAmend(e.target.checked)}
                  className="accent-blue-500 bg-[#1e2227] border-[#181a1f]" 
                />
                Amend previous commit
             </label>
             
             <div className="relative">
                <input 
                  type="text" 
                  placeholder="Commit summary" 
                  className="w-full bg-[#1e2227] border border-[#181a1f] rounded px-2 py-1.5 outline-none text-[#e5e5e6] focus:border-[#3b82f6] text-sm pr-12" 
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
                />
                <span className={`absolute right-2 top-2 text-[10px] font-mono ${charsLeft < 0 ? 'text-red-400' : charsLeft < 20 ? 'text-[#e5c07b]' : 'text-[#5c6370]'}`}>{charsLeft}</span>
             </div>
             
             <textarea placeholder="Description" rows={3} className="w-full bg-[#1e2227] border border-[#181a1f] rounded px-2 py-1.5 outline-none text-[#e5e5e6] focus:border-[#3b82f6] text-sm resize-none"></textarea>

             <button className="w-full border border-[#3b82f6]/50 text-[#3b82f6] hover:bg-[#3b82f6]/10 py-1.5 rounded flex items-center justify-center gap-1 text-xs font-semibold">
                <Sparkles size={12} /> Compose commits with AI
             </button>
             
             <button 
              onClick={handleCommit}
              disabled={(!amend && stagedFiles.length === 0) || message.trim() === ''}
              className={`w-full bg-[#3b82f6] text-white py-2 rounded font-semibold transition-opacity ${((!amend && stagedFiles.length === 0) || message.trim() === '') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#4d8bf8]'}`}
             >
                {amend ? 'Amend Commit' : 'Commit Files'}
             </button>
          </div>
        </>
      )}

      {/* Slide In Diff Placeholder */}
      <DiffPanel />

    </aside>
  );
}

function FileRow({ name, status, icon: Icon, onAction, actionLabel, onClick }: { name: string, status: string, icon: any, onAction?: () => void, actionLabel?: string, onClick?: () => void }) {
  let color = "text-[#e5c07b]"; // Modified (amber)
  if (status === 'untracked') color = "text-[#98c379]"; // Green
  if (status === 'deleted') color = "text-[#e06c75]"; // Red
  if (status === 'renamed') color = "text-[#61afef]"; // Blue
  if (status === 'conflicted') color = "text-[#f44336]"; 

  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between py-1.5 px-2 hover:bg-[#2c313a] rounded cursor-pointer group whitespace-nowrap"
    >
        <div className="flex items-center gap-2 overflow-hidden">
           <Icon size={12} className={`shrink-0 ${color}`} />
           <span className="truncate text-[#e5e5e6] text-[13px]">{name}</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
          }}
          className="invisible group-hover:visible shrink-0 bg-transparent text-[#5c6370] hover:text-[#e5e5e6] px-1 text-xs"
        >
          {actionLabel}
        </button>
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
