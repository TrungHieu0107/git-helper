import { Undo, Redo, ArrowDown, ArrowUp, GitBranch, Archive, Navigation, Terminal, Search } from "lucide-react";
import { pullRepo, pushRepo, createStash, popStash, createBranch, undoLastCommit, openTerminal } from "../lib/repo";

export function TopToolbar() {
  return (
    <div className="h-[48px] w-full bg-slate-800 border-b border-slate-700 flex items-center px-4 shrink-0 justify-between select-none">
      <div className="flex items-center space-x-6">
        
        {/* Undo / Redo */}
        <div className="flex items-center space-x-4">
          <ToolbarButton icon={<Undo size={20} />} label="Undo ↺" onClick={undoLastCommit} />
          <ToolbarButton icon={<Redo size={20} />} label="Redo ↻" disabled />
        </div>

        <div className="w-px h-6 bg-slate-700" />
        
        {/* Pull / Push */}
        <div className="flex items-center space-x-4">
          <ToolbarButton icon={<ArrowDown size={20} />} label="Pull ↓" onClick={pullRepo} />
          <ToolbarButton icon={<ArrowUp size={20} />} label="Push ↑" onClick={pushRepo} />
        </div>

        <div className="w-px h-6 bg-slate-700" />

        {/* Branch / Stash / Pop */}
        <div className="flex items-center space-x-4">
          <ToolbarButton 
            icon={<GitBranch size={20} />} 
            label="Branch ⑂" 
            onClick={() => {
              const name = prompt("Enter new branch name:");
              if (name) createBranch(name);
            }} 
          />
          <ToolbarButton icon={<Archive size={20} />} label="Stash ↓" onClick={createStash} />
          <ToolbarButton icon={<Navigation size={20} />} label="Pop ↑" onClick={() => popStash(0)} />
        </div>

        <div className="w-px h-6 bg-slate-700" />

        {/* Terminal */}
        <div className="flex items-center space-x-4">
          <ToolbarButton icon={<Terminal size={20} />} label="Terminal >_" onClick={openTerminal} />
        </div>
        
      </div>

      <div className="flex items-center space-x-4">
        {/* Actions Dropdown placeholder */}
        <div className="flex items-center gap-1 cursor-pointer hover:bg-slate-700/50 p-2 rounded text-slate-300">
           <span className="text-sm font-medium">Actions ▾</span>
        </div>
        {/* Search */}
        <div className="cursor-pointer text-slate-400 hover:text-white p-2">
           <Search size={20} />
        </div>
      </div>

    </div>
  );
}

function ToolbarButton({ icon, label, disabled = false, onClick }: { icon: React.ReactNode, label: string, disabled?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={() => !disabled && onClick?.()}
      className={`flex flex-col items-center justify-center cursor-pointer group ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
       <div className={`text-slate-300 ${!disabled && 'group-hover:text-white transition-colors'}`}>
         {icon}
       </div>
       <span className="text-[10px] text-slate-500 mt-0.5">{label}</span>
    </div>
  );
}
