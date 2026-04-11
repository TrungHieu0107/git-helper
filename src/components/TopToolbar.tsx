import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Undo, Redo, ArrowDown, ArrowUp, GitBranch, Archive, Navigation, Terminal, RotateCw, Download, Loader2, ChevronDown, FolderOpen, Plus, Monitor } from "lucide-react";
import { useAppStore, RecentRepo } from "../store";
import { pullRepo, pushRepo, fetchAllRepo, popStash, undoLastCommit, openTerminal, loadRepo } from "../lib/repo";
import { CreateBranchDialog } from "./CreateBranchDialog";
import { CreateStashDialog } from "./CreateStashDialog";

export function TopToolbar() {
  const { activeRepoPath, isLoadingRepo, repoStatus, showCreateStash, isLoadingPull, pullStrategy, setPullStrategy } = useAppStore();
  const [fetching, setFetching] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [showPullDropdown, setShowPullDropdown] = useState(false);
  const pullDropdownRef = useRef<HTMLDivElement>(null);


  const handleFetch = async () => {
    setFetching(true);
    try { await fetchAllRepo(); } finally { setFetching(false); }
  };

  const handlePull = async (strategy?: any) => {
    if (strategy) {
      setPullStrategy(strategy);
      setShowPullDropdown(false);
    }
    await pullRepo(strategy);
  };

  useEffect(() => {
    if (showPullDropdown) {
      const handleClickOutside = (e: MouseEvent) => {
        if (pullDropdownRef.current && !pullDropdownRef.current.contains(e.target as Node)) {
          setShowPullDropdown(false);
        }
      };
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShowPullDropdown(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEsc);
      };
    }
  }, [showPullDropdown]);


  const handlePush = async () => {
    setPushing(true);
    try { await pushRepo(); } finally { setPushing(false); }
  };

  const handleRefresh = async () => {
    if (activeRepoPath) {
      await loadRepo(activeRepoPath);
    }
  };

  return (
    <div className="h-[48px] w-full bg-[#1c2128] border-b border-[#30363d] flex items-center px-4 shrink-0 justify-between select-none shadow-md">
      
      {/* Left: Repo Selector Dropdown */}
      <div className="flex-1 flex items-center min-w-0">
        <RepoSelector />
      </div>

      {/* Middle: Git Actions (Centered) */}
      <div className="flex-[2] flex items-center justify-center space-x-7">
        
        {/* Undo / Redo */}
        <div className="flex items-center space-x-4">
          <ToolbarButton icon={<Undo size={18} />} label="Undo" onClick={undoLastCommit} />
          <ToolbarButton icon={<Redo size={18} />} label="Redo" disabled />
        </div>

        <div className="w-px h-6 bg-[#30363d]" />
        
        {/* Fetch / Pull / Push */}
        <div className="flex items-center space-x-4 text-[#58a6ff]">
          <DownloadButton loading={fetching} onClick={handleFetch} count={0} icon={<Download size={18} />} label="Fetch" />
          
          {/* Split Pull Button */}
          <div className="relative flex items-center group/pull" ref={pullDropdownRef}>
            <ToolbarButton 
              icon={<ArrowDown size={18} />} 
              label="Pull" 
              onClick={() => handlePull()} 
              loading={isLoadingPull} 
              count={repoStatus?.behind || 0} 
              title={repoStatus ? `↑${repoStatus.ahead} ↓${repoStatus.behind}` : undefined}
              className="pr-1"
            />
            <div 
              onClick={() => !isLoadingPull && setShowPullDropdown(!showPullDropdown)}
              className={`h-full flex items-center px-1 py-1 rounded-sm hover:bg-white/10 cursor-pointer ${isLoadingPull ? 'opacity-20 pointer-events-none' : ''}`}
            >
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${showPullDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showPullDropdown && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-[#1c2128] border border-[#30363d] rounded-md shadow-xl z-[250] p-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2 py-1.5 text-[10px] font-bold text-[#768390] uppercase border-b border-[#30363d] mb-1">
                  Pull Strategy
                </div>
                {(['fast_forward_only', 'fast_forward_or_merge', 'rebase'] as const).map(s => (
                  <div 
                    key={s}
                    onClick={() => handlePull(s)}
                    className={`px-3 py-2 rounded flex flex-col hover:bg-[#30363d] cursor-pointer ${pullStrategy === s ? 'bg-blue-500/10' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                       <span className={`text-[12px] font-medium ${pullStrategy === s ? 'text-blue-400' : 'text-[#adbac7]'}`}>
                         {s === 'fast_forward_only' ? 'Fast-Forward Only' : s === 'fast_forward_or_merge' ? 'Merge (FF or Merge)' : 'Rebase ⚠️'}
                       </span>
                       {pullStrategy === s && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                    </div>
                    <span className="text-[10px] text-[#768390]">
                      {s === 'fast_forward_only' ? 'Fails if branches have diverged' : s === 'fast_forward_or_merge' ? 'Merges if FF is not possible' : 'Rebases local commits on remote'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ToolbarButton 
            icon={<ArrowUp size={18} />} 
            label="Push" 
            onClick={handlePush} 
            loading={pushing} 
            count={repoStatus?.ahead || 0} 
            title={repoStatus ? `↑${repoStatus.ahead} commits ahead` : undefined}
          />

        </div>

        <div className="w-px h-6 bg-[#30363d]" />

        {/* Branch / Stash / Pop */}
        <div className="flex items-center space-x-4 text-[#adbac7]">
          <ToolbarButton 
            icon={<GitBranch size={18} />} 
            label="Branch" 
            onClick={() => setShowCreateBranch(true)} 
          />
          <ToolbarButton 
            icon={<Archive size={18} />} 
            label="Stash" 
            onClick={() => useAppStore.setState({ showCreateStash: true })} 
          />
          <ToolbarButton icon={<Navigation size={18} />} label="Pop" onClick={() => popStash(0)} />
        </div>

        <div className="w-px h-6 bg-[#30363d]" />

        {/* Terminal */}
        <div className="flex items-center space-x-4">
          <ToolbarButton icon={<Terminal size={18} />} label="Terminal" onClick={openTerminal} />
        </div>
        
      </div>

      {/* Right: Refresh / Meta */}
      <div className="flex-1 flex items-center justify-end space-x-2">
        <div className="flex items-center gap-1 cursor-pointer hover:bg-[#30363d]/50 p-2 rounded text-[#adbac7]">
           <span className="text-[12px] font-medium">Actions ▾</span>
        </div>
        <div 
          onClick={handleRefresh}
          className={`cursor-pointer p-2 transition-all duration-300 ${isLoadingRepo ? 'text-blue-400' : 'text-[#768390] hover:text-[#adbac7]'}`}
          title="Reload state (Ctrl+R)"
        >
           <RotateCw size={18} className={isLoadingRepo ? "animate-spin" : ""} />
        </div>
      </div>

      {showCreateBranch && (
        <CreateBranchDialog onClose={() => setShowCreateBranch(false)} />
      )}
      {showCreateStash && (
        <CreateStashDialog onClose={() => useAppStore.setState({ showCreateStash: false })} />
      )}

    </div>
  );
}

function RepoSelector() {
  const { repoInfo, activeRepoPath } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRecent();
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const fetchRecent = async () => {
    try {
      const repos = await invoke<RecentRepo[]>('get_recent_repos');
      setRecent(repos);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePickRepo = async () => {
    setIsOpen(false);
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Open Repository' });
      if (selected) await loadRepo(selected as string);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#30363d]/50 rounded-md cursor-pointer group transition-colors min-w-0"
      >
        <div className="w-6 h-6 bg-sky-500 rounded flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
          {repoInfo?.name[0]?.toUpperCase() || 'G'}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-bold text-[#e6edf3] truncate tracking-tight uppercase">
              {repoInfo?.name || 'Git Helper'}
            </span>
            <ChevronDown size={14} className={`text-[#768390] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-[280px] bg-[#1c2128] border border-[#30363d] rounded-lg shadow-2xl z-[200] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 border-b border-[#30363d] bg-[#161b22]/50">
            <div className="text-[10px] uppercase font-bold text-[#768390] px-2 mb-1 flex items-center gap-1.5">
               <FolderOpen size={10} /> Recent Repositories
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
            {recent.length === 0 ? (
              <div className="text-[11px] text-[#768390] italic text-center py-4">No recent repositories</div>
            ) : (
              recent.map(repo => (
                <div 
                  key={repo.path}
                  onClick={() => {
                    loadRepo(repo.path);
                    setIsOpen(false);
                  }}
                  className={`flex flex-col px-3 py-2 rounded-md cursor-pointer transition-all hover:bg-[#30363d]/40 group ${activeRepoPath === repo.path ? 'bg-[#3b82f6]/10' : ''}`}
                >
                  <div className="flex items-center gap-2">
                     <Monitor size={12} className={activeRepoPath === repo.path ? 'text-sky-400' : 'text-[#768390]'} />
                     <span className={`text-[12px] font-semibold truncate ${activeRepoPath === repo.path ? 'text-sky-400' : 'text-[#adbac7] group-hover:text-white'}`}>
                       {repo.name}
                     </span>
                  </div>
                  <span className="text-[10px] text-[#768390] truncate ml-5" title={repo.path}>{repo.path}</span>
                </div>
              ))
            )}
          </div>

          <div className="p-1.5 bg-[#161b22]/50 border-t border-[#30363d]">
            <button 
              onClick={handlePickRepo}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-[12px] font-medium text-[#adbac7] hover:text-white hover:bg-[#30363d] transition-all"
            >
              <Plus size={14} className="text-sky-400" />
              Open local repository...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ 
  icon, 
  label, 
  disabled = false, 
  loading = false, 
  onClick,
  count = 0,
  title,
  className
}: { 
  icon: React.ReactNode, 
  label: string, 
  disabled?: boolean, 
  loading?: boolean, 
  onClick?: () => void,
  count?: number,
  title?: string,
  className?: string
}) {
  const isDisabled = disabled || loading;
  return (
    <div 
      onClick={() => !isDisabled && onClick?.()}
      title={title}
      className={`flex flex-col items-center justify-center cursor-pointer group relative ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''} ${className || ''}`}
    >

       <div className={`text-slate-300 ${!isDisabled && 'group-hover:text-white transition-colors'}`}>
         {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
       </div>
       
       {count > 0 && (
         <div className="absolute -top-1.5 -right-2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#1c2128] shadow-sm transform scale-90">
           {count}
         </div>
       )}

       <span className="text-[10px] text-slate-500 mt-0.5">{label}</span>
    </div>
  );
}

const DownloadButton = ToolbarButton;

