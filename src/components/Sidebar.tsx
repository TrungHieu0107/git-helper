import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Search, Circle, CircleDot, CloudSync, MoreHorizontal, Menu, FolderOpen } from "lucide-react";
import { useAppStore, RecentRepo } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { loadRepo } from "../lib/repo";
import { open } from "@tauri-apps/plugin-dialog";

export function Sidebar() {
  const [localOpen, setLocalOpen] = useState(true);
  const [remoteOpen, setRemoteOpen] = useState(true);
  const [stashOpen, setStashOpen] = useState(true);
  const [showRepoSwitcher, setShowRepoSwitcher] = useState(false);
  const [recentRepos, setRecentRepos] = useState<RecentRepo[]>([]);
  
  const repoInfo = useAppStore(state => state.repoInfo);
  const activeBranch = useAppStore(state => state.activeBranch) || "main";
  const branches = useAppStore(state => state.branches) || [];
  const stashes = useAppStore(state => state.stashes) || [];

  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setShowRepoSwitcher(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenSwitcher = async () => {
    setShowRepoSwitcher(!showRepoSwitcher);
    if (!showRepoSwitcher) {
      try {
        const repos = await invoke<RecentRepo[]>('get_recent_repos');
        setRecentRepos(repos);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const pickRepo = async () => {
    setShowRepoSwitcher(false);
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Open Repository' });
      if (selected) await loadRepo(selected as string);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <aside className="w-[var(--sidebar-width)] bg-[#1e2227] flex flex-col h-full border-r border-[#181a1f] shrink-0 text-[#a0a6b1] select-none text-sm relative">
      
      {/* Top block (non-scrollable) */}
      <div className="p-3 border-b border-[#181a1f] flex flex-col gap-3 relative">
        <div className="flex justify-between items-center cursor-pointer hover:text-white" onClick={handleOpenSwitcher}>
           <span className="font-bold text-[#e5e5e6] flex items-center gap-1 max-w-[150px] truncate">
              {repoInfo ? repoInfo.name : "GitKit"} ▾
           </span>
           <span className="bg-slate-700 text-white px-2 py-0.5 rounded-full text-xs font-semibold max-w-[80px] truncate">{activeBranch} ▾</span>
        </div>
        
        {showRepoSwitcher && (
          <div ref={switcherRef} className="absolute top-10 left-3 w-64 bg-[#21262d] border border-[#3e4451] rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
             <div className="px-3 py-2 border-b border-[#3e4451]">
                <span className="text-xs font-semibold text-gray-400 uppercase">Recent Repositories</span>
             </div>
             <div className="max-h-60 overflow-y-auto">
                {recentRepos.map(repo => (
                   <div 
                     key={repo.path}
                     onClick={() => { setShowRepoSwitcher(false); loadRepo(repo.path); }}
                     className="px-3 py-2 cursor-pointer hover:bg-[#2c313a] flex items-center gap-2 transition-colors border-l-2 border-transparent hover:border-blue-500"
                   >
                      <FolderOpen size={14} className="text-blue-400" />
                      <div className="flex flex-col min-w-0">
                         <span className="text-[13px] text-gray-200 truncate">{repo.name}</span>
                         <span className="text-[10px] text-gray-500 truncate" title={repo.path}>{repo.path}</span>
                      </div>
                   </div>
                ))}
             </div>
             <div 
               className="px-3 py-2 cursor-pointer hover:bg-[#2c313a] border-t border-[#3e4451] text-[#79c0ff] font-medium text-[13px] flex items-center gap-2"
               onClick={pickRepo}
             >
                <div className="w-5 flex justify-center text-lg leading-none">+</div>
                Open another repo
             </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
           <span className="text-xs bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Viewing 3</span>
           <div className="flex-1 flex items-center bg-[#282c33] rounded px-2">
              <input type="text" placeholder="Filter (Ctrl+Alt+F)" className="w-full bg-transparent border-none text-xs py-1 outline-none text-[#a0a6b1] placeholder-[#5c6370]" />
              <Search size={14} className="text-[#5c6370]" />
           </div>
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
        
        {/* LOCAL */}
        <div>
           <SectionHeader title="LOCAL" count={3} open={localOpen} setOpen={setLocalOpen} />
           {localOpen && (
             <div className="flex flex-col mt-1">
               {branches.map(b => (
                 <BranchRow key={b} name={b} isHead={b === activeBranch} />
               ))}
             </div>
           )}
        </div>

        {/* REMOTE */}
        <div>
           <SectionHeader title="REMOTE" count={1} open={remoteOpen} setOpen={setRemoteOpen} />
           {remoteOpen && (
             <div className="flex flex-col mt-1 pl-4 text-[13px] text-slate-400">
               <div className="flex items-center gap-2 py-1">
                  <span>📁 origin</span>
               </div>
               <div className="pl-4">
                  {branches.map(b => (
                    <BranchRow key={`rem-${b}`} name={b} isHead={false} />
                  ))}
               </div>
             </div>
           )}
        </div>

        {/* STASHES */}
        <div>
           <SectionHeader title="STASHES" count={stashes.length} open={stashOpen} setOpen={setStashOpen} />
           {stashOpen && (
             <div className="flex flex-col mt-1">
               {stashes.map((s, i) => (
                 <div key={i} className="flex items-center gap-2 py-1.5 px-1 hover:bg-[#2c313a] rounded cursor-pointer group text-[13px] text-slate-300 truncate">
                    <span className="text-slate-500">≡</span>
                    <span className="truncate">{s.message}</span>
                    <span className="text-xs text-slate-500 ml-auto whitespace-nowrap hidden group-hover:block">{s.time}</span>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Dummies */}
        <SectionHeader title="PULL REQUESTS" count={0} open={false} setOpen={() => {}} />
        <SectionHeader title="ISSUES" count={0} open={false} setOpen={() => {}} />
      </div>
    </aside>
  );
}

function SectionHeader({ title, count, open, setOpen }: { title: string, count: number|string, open: boolean, setOpen: (b:boolean) => void }) {
  return (
    <div onClick={() => setOpen(!open)} className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#5c6370] uppercase cursor-pointer hover:text-slate-300">
      <div className="flex items-center gap-1">
         {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
         {title}
      </div>
      <span className="bg-[#282c33] px-1.5 py-0.5 rounded-full">{count}</span>
    </div>
  );
}

function BranchRow({ name, isHead }: { name: string, isHead: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 px-1 rounded cursor-pointer group whitespace-nowrap ${isHead ? 'bg-[#2c313a]' : 'hover:bg-[#2c313a]'}`}>
       <div className="flex items-center gap-2 overflow-hidden flex-1">
          {isHead ? <CircleDot size={12} className="text-[#3b82f6] shrink-0" /> : <Circle size={12} className="text-[#5c6370] shrink-0" />}
          <span className={`text-[13px] truncate ${isHead ? 'text-[#e5e5e6] font-semibold' : 'text-[#a0a6b1]'}`}>{name}</span>
          {isHead && <CloudSync size={12} className="text-slate-400 shrink-0 ml-1" />}
       </div>
       <MoreHorizontal size={14} className="text-slate-400 invisible group-hover:visible shrink-0 ml-2" />
    </div>
  );
}
