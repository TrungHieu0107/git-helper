import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Undo, Redo, ArrowDown, ArrowUp, GitBranch, Archive, Navigation, Terminal, RotateCw, Download, Loader2, ChevronDown, FolderOpen, Plus, Monitor } from "lucide-react";
import { useAppStore, RecentRepo } from "../store";
import { pullRepo, pushCurrentBranch, fetchAllRepo, popStash, undoLastCommit, openTerminal, loadRepo } from "../lib/repo";
import { CreateBranchDialog } from "./CreateBranchDialog";
import { CreateStashDialog } from "./CreateStashDialog";

export function TopToolbar() {
  const { activeRepoPath, isLoadingRepo, repoStatus, showCreateStash, isLoadingPull, pullStrategy, setPullStrategy } = useAppStore();
  const [fetching, setFetching] = useState(false);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [showPullDropdown, setShowPullDropdown] = useState(false);
  const [showPushDropdown, setShowPushDropdown] = useState(false);
  const pullDropdownRef = useRef<HTMLDivElement>(null);
  const pushDropdownRef = useRef<HTMLDivElement>(null);
  const { isLoadingPush, lastCommitWasAmend } = useAppStore();


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

  useEffect(() => {
    if (showPushDropdown) {
      const handleClickOutside = (e: MouseEvent) => {
        if (pushDropdownRef.current && !pushDropdownRef.current.contains(e.target as Node)) {
          setShowPushDropdown(false);
        }
      };
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShowPushDropdown(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEsc);
      };
    }
  }, [showPushDropdown]);




  const handleRefresh = async () => {
    if (activeRepoPath) {
      await loadRepo(activeRepoPath);
    }
  };

  return (
    <div className="h-[46px] w-full bg-[#1c2128] border-b border-[#30363d] flex items-center px-6 shrink-0 justify-between select-none shadow-md">
      
      {/* Left: Repo Selector Dropdown */}
      <div className="flex-1 flex items-center min-w-0">
        <RepoSelector />
      </div>

      {/* Middle: Git Actions (Centered) */}
      <div className="flex-[2] flex items-center justify-center space-x-5">
        
        {/* Undo / Redo */}
        <div className="flex items-center gap-4">
          <ToolbarButton icon={<Undo size={16} />} label="Undo" onClick={undoLastCommit} />
          <ToolbarButton icon={<Redo size={16} />} label="Redo" disabled />
        </div>

        <div className="w-px h-6 bg-[#30363d] mx-2" />
        
        {/* Fetch / Pull / Push */}
        <div className="flex items-center gap-4 text-[#58a6ff]">
          <DownloadButton loading={fetching} onClick={handleFetch} count={0} icon={<Download size={16} />} label="Fetch" />
          
          {/* Split Pull Button */}
          <div className="relative flex items-center" ref={pullDropdownRef}>
            <ToolbarButton 
              icon={<ArrowDown size={16} />} 
              label="Pull" 
              onClick={() => handlePull()} 
              loading={isLoadingPull} 
              count={repoStatus?.behind || 0} 
              title={repoStatus ? `↑${repoStatus.ahead} ↓${repoStatus.behind}` : undefined}
            />
            <div 
              onClick={() => !isLoadingPull && setShowPullDropdown(!showPullDropdown)}
              className={`h-8 flex items-center px-1 hover:bg-white/5 rounded-md cursor-pointer ml-1 ${isLoadingPull ? 'opacity-20 pointer-events-none' : ''}`}
            >
              <ChevronDown size={14} className={`text-[#6e7681] transition-transform ${showPullDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showPullDropdown && (
              <div className="absolute top-full left-0 mt-3 w-56 bg-[#1c2128] border border-[#30363d] rounded-lg shadow-2xl z-[250] p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2 py-1.5 text-[10px] font-bold text-[#6e7681] uppercase border-b border-[#30363d] mb-1 tracking-wider">
                  Pull Strategy
                </div>
                {(['fast_forward_only', 'fast_forward_or_merge', 'rebase'] as const).map(s => (
                  <div 
                    key={s}
                    onClick={() => handlePull(s)}
                    className={`px-3 py-2 rounded-md flex flex-col hover:bg-[#1f2937] cursor-pointer transition-colors ${pullStrategy === s ? 'bg-[#388bfd]/10' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                       <span className={`text-[12px] font-semibold ${pullStrategy === s ? 'text-[#388bfd]' : 'text-[#e6edf3]'}`}>
                         {s === 'fast_forward_only' ? 'Fast-Forward Only' : s === 'fast_forward_or_merge' ? 'Merge (FF or Merge)' : 'Rebase'}
                       </span>
                       {pullStrategy === s && <div className="w-1.5 h-1.5 bg-[#388bfd] rounded-full shadow-[0_0_8px_rgba(56,139,253,0.6)]" />}
                    </div>
                    <span className="text-[10px] text-[#6e7681]">
                      {s === 'fast_forward_only' ? 'Fails if branches have diverged' : s === 'fast_forward_or_merge' ? 'Merges if FF is not possible' : 'Rebases local commits on remote'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Split Push Button */}
          <div className="relative flex items-center" ref={pushDropdownRef}>
            <ToolbarButton 
              icon={<ArrowUp size={16} className={lastCommitWasAmend ? "text-[#e3b341] drop-shadow-[0_0_8px_rgba(227,179,65,0.3)]" : ""} />} 
              label={lastCommitWasAmend ? "Force Push" : "Push"} 
              onClick={() => pushCurrentBranch(activeRepoPath!, 'normal')} 
              loading={isLoadingPush} 
              count={repoStatus?.ahead || 0} 
              title={lastCommitWasAmend ? "Changes were amended. Force push may be required." : (repoStatus ? `↑${repoStatus.ahead} commits ahead` : undefined)}
            />
            <div 
              onClick={() => !isLoadingPush && setShowPushDropdown(!showPushDropdown)}
              className={`h-8 flex items-center px-1 hover:bg-white/5 rounded-md cursor-pointer ml-1 ${isLoadingPush ? 'opacity-20 pointer-events-none' : ''}`}
            >
              <ChevronDown size={14} className={`text-[#6e7681] transition-transform ${showPushDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showPushDropdown && (
              <div className="absolute top-full left-0 mt-3 w-56 bg-[#1c2128] border border-[#30363d] rounded-lg shadow-2xl z-[250] p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2 py-1.5 text-[10px] font-bold text-[#6e7681] uppercase border-b border-[#30363d] mb-1 tracking-wider">
                  Push Mode
                </div>
                
                <div 
                  onClick={() => { pushCurrentBranch(activeRepoPath!, 'normal'); setShowPushDropdown(false); }}
                  className="px-3 py-2 rounded-md flex flex-col hover:bg-[#1f2937] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                     <span className="text-[12px] font-semibold text-[#e6edf3]">Normal Push</span>
                  </div>
                  <span className="text-[10px] text-[#6e7681]">Fast-forward to remote</span>
                </div>

                <div 
                  onClick={() => { pushCurrentBranch(activeRepoPath!, 'force_with_lease'); setShowPushDropdown(false); }}
                  className={`px-3 py-2 rounded-md flex flex-col hover:bg-[#1f2937] cursor-pointer transition-colors ${lastCommitWasAmend ? 'bg-[#e3b341]/10' : ''}`}
                >
                  <div className="flex items-center justify-between">
                     <span className={`text-[12px] font-semibold ${lastCommitWasAmend ? 'text-[#e3b341]' : 'text-[#e6edf3]'}`}>
                       Force Push (with lease)
                     </span>
                  </div>
                  <span className="text-[10px] text-[#6e7681]">Rewrites history securely</span>
                </div>
              </div>
            )}
            
            {lastCommitWasAmend && (
              <div className="absolute -top-1 right-8 w-2 h-2 bg-[#e3b341] rounded-full animate-pulse border border-[#1c2128]" />
            )}
          </div>

        </div>

        <div className="w-px h-6 bg-[#30363d] mx-2" />

        {/* Branch / Stash / Pop */}
        <div className="flex items-center gap-4 text-[#e6edf3]">
          <ToolbarButton 
            icon={<GitBranch size={16} />} 
            label="Branch" 
            onClick={() => setShowCreateBranch(true)} 
          />
          <ToolbarButton 
            icon={<Archive size={16} />} 
            label="Stash" 
            onClick={() => useAppStore.setState({ showCreateStash: true })} 
          />
          <ToolbarButton icon={<Navigation size={16} />} label="Pop" onClick={() => popStash(0)} />
        </div>

        <div className="w-px h-6 bg-[#30363d] mx-2" />

        {/* Terminal */}
        <div className="flex items-center">
          <ToolbarButton icon={<Terminal size={16} />} label="Terminal" onClick={openTerminal} />
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
  const { repoInfo, activeRepoPath, activeBranch } = useAppStore();
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
        className="flex items-center gap-3 px-3 py-1 hover:bg-[#1f2937] rounded-lg cursor-pointer group transition-all min-w-0 border border-transparent hover:border-[#30363d]"
      >
        <div className="w-5.5 h-5.5 bg-[#388bfd] rounded-md flex items-center justify-center text-white font-black text-[10px] shrink-0 shadow-lg">
          {repoInfo?.name[0]?.toUpperCase() || 'G'}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#e6edf3] truncate tracking-tight">
              {repoInfo?.name || 'GitKit'}
            </span>
            <ChevronDown size={14} className={`text-[#6e7681] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
      className={`flex flex-col items-center justify-center cursor-pointer group relative transition-all duration-200 hover:scale-[1.03] ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''} ${className || ''}`}
    >
       <div className={`py-1 px-2 rounded-lg transition-all ${!isDisabled ? 'group-hover:bg-white/5 group-hover:shadow-inner' : ''} ${!isDisabled ? 'text-[#e6edf3]' : 'text-[#6e7681]'}`}>
         {loading ? <Loader2 size={16} className="animate-spin text-[#388bfd]" /> : icon}
       </div>
       
       {count > 0 && (
         <div className="absolute top-0 -right-2 bg-[#388bfd] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-[#1c2128] shadow-lg transform scale-90">
           {count}
         </div>
       )}

       <span className="text-[9px] font-bold text-[#6e7681] mt-0.5 uppercase tracking-tighter group-hover:text-[#e6edf3] transition-colors">{label}</span>
    </div>
  );
}

const DownloadButton = ToolbarButton;

