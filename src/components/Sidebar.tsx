import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, Circle, CircleDot, CloudSync, MoreHorizontal, FolderOpen, GitBranch } from "lucide-react";
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
  const [filter, setFilter] = useState("");
  
  const repoInfo = useAppStore(state => state.repoInfo);
  const activeBranch = useAppStore(state => state.activeBranch) || "main";
  const commitLog = useAppStore(state => state.commitLog);
  const stashes = useAppStore(state => state.stashes) || [];

  // Derive branch lists from commitLog refs (since list_branches is still a stub)
  const { localBranches, remoteBranches } = useMemo(() => {
    const locals = new Set<string>();
    const remotes = new Map<string, string[]>(); // remote name -> branch names

    if (commitLog) {
      commitLog.forEach(node => {
        node.refs.forEach(ref => {
          if (ref === 'HEAD') return;
          if (ref.includes('/')) {
            // Could be "origin/main" format
            const parts = ref.split('/');
            const remoteName = parts[0];
            const branchName = parts.slice(1).join('/');
            if (!remotes.has(remoteName)) remotes.set(remoteName, []);
            const list = remotes.get(remoteName)!;
            if (!list.includes(branchName)) list.push(branchName);
          } else {
            locals.add(ref);
          }
        });
      });
    }

    // Ensure active branch is always visible
    if (activeBranch && !locals.has(activeBranch)) {
      locals.add(activeBranch);
    }

    return {
      localBranches: Array.from(locals),
      remoteBranches: remotes,
    };
  }, [commitLog, activeBranch]);

  // Filter logic
  const filteredLocal = filter
    ? localBranches.filter(b => b.toLowerCase().includes(filter.toLowerCase()))
    : localBranches;

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
             <div className="max-h-60 overflow-y-auto custom-scrollbar">
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
           <span className="text-xs bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
             {filteredLocal.length} branch{filteredLocal.length !== 1 ? 'es' : ''}
           </span>
           <div className="flex-1 flex items-center bg-[#282c33] rounded px-2">
              <input
                type="text"
                placeholder="Filter (Ctrl+Alt+F)"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full bg-transparent border-none text-xs py-1 outline-none text-[#a0a6b1] placeholder-[#5c6370]"
              />
              <Search size={14} className="text-[#5c6370]" />
           </div>
        </div>
      </div>

      {/* Sections Container (No global scroll, just flex-col) */}
      <div className="flex-1 flex flex-col overflow-hidden p-2 gap-3">
        
        {/* LOCAL */}
        <div className={`flex flex-col min-h-0 ${localOpen ? 'shrink' : 'shrink-0'}`}>
           <SectionHeader title="LOCAL" count={filteredLocal.length} open={localOpen} setOpen={setLocalOpen} />
           {localOpen && (
             <div className="flex flex-col mt-1 overflow-y-auto custom-scrollbar min-h-0 pr-1 -mr-1">
               {filteredLocal.length === 0 ? (
                 <div className="text-xs text-[#5c6370] italic px-2 py-2">No branches found</div>
               ) : (
                 filteredLocal.map(b => (
                   <BranchRow key={b} name={b} isHead={b === activeBranch} />
                 ))
               )}
             </div>
           )}
        </div>

        {/* REMOTE */}
        <div className={`flex flex-col min-h-0 ${remoteOpen ? 'shrink' : 'shrink-0'}`}>
           <SectionHeader title="REMOTE" count={remoteBranches.size} open={remoteOpen} setOpen={setRemoteOpen} />
           {remoteOpen && (
             <div className="flex flex-col mt-1 text-[13px] text-slate-400 overflow-y-auto custom-scrollbar min-h-0 pr-1 -mr-1">
               {remoteBranches.size === 0 ? (
                 <div className="text-xs text-[#5c6370] italic px-2 py-2">No remotes</div>
               ) : (
                 Array.from(remoteBranches.entries()).map(([remote, branchNames]) => (
                   <div key={remote}>
                     <div className="flex items-center gap-2 py-1 pl-1">
                        <GitBranch size={12} className="text-[#5c6370]" />
                        <span className="text-[#a0a6b1] font-medium">{remote}</span>
                     </div>
                     <div className="pl-5">
                        {branchNames.map(b => (
                          <BranchRow key={`${remote}/${b}`} name={b} isHead={false} />
                        ))}
                     </div>
                   </div>
                 ))
               )}
             </div>
           )}
        </div>

        {/* STASHES */}
        <div className={`flex flex-col min-h-0 ${stashOpen ? 'shrink' : 'shrink-0'}`}>
           <SectionHeader title="STASHES" count={stashes.length} open={stashOpen} setOpen={setStashOpen} />
           {stashOpen && (
             <div className="flex flex-col mt-1 overflow-y-auto custom-scrollbar min-h-0 pr-1 -mr-1">
               {stashes.length === 0 ? (
                 <div className="text-xs text-[#5c6370] italic px-2 py-2">No stashes</div>
               ) : (
                 stashes.map((s, i: number) => {
                   const timeStr = new Date(s.timestamp * 1000).toLocaleString(undefined, {
                     year: 'numeric', month: 'short', day: 'numeric',
                     hour: '2-digit', minute: '2-digit'
                   });
                   return (
                     <div key={i} className="flex flex-col py-1.5 px-1 hover:bg-[#2c313a] rounded cursor-pointer group text-[13px] text-slate-300 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 shrink-0">≡</span>
                          <span className="truncate">{s.message || `stash@{${s.index}}`}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 pl-4">— {timeStr}</span>
                     </div>
                   )
                 })
               )}
             </div>
           )}
        </div>
      </div>
    </aside>
  );
}

function SectionHeader({ title, count, open, setOpen }: Readonly<{ title: string; count: number | string; open: boolean; setOpen: (b: boolean) => void }>) {
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

function BranchRow({ name, isHead }: Readonly<{ name: string; isHead: boolean }>) {
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
