import React, { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { 
  Undo, Redo, GitBranch, Archive, 
  Navigation, Terminal, RotateCw, Loader2, 
  ChevronDown, Plus, Settings, Search,
  Zap, CloudDownload, CloudUpload, History, Layers, Layout,
  Globe, Command
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, RecentRepo } from "../store";
import { pullRepo, fetchAllRepo, pushCurrentBranch } from "../services/git/remoteService";
import { popStash } from "../services/git/stashService";
import { undoLastCommit } from "../services/git/branchService";
import { loadRepo, openTerminal, autoFetch } from "../services/git/repoService";
import { CreateBranchDialog } from "./CreateBranchDialog";
import { CreateStashDialog } from "./CreateStashDialog";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";
import { toast } from "../lib/toast";

export function TopToolbar() {
  const { 
    activeRepoPath, isLoadingRepo, repoStatus, showCreateStash, 
    isLoadingPull, pullStrategy, setPullStrategy, isLoadingPush, 
    lastCommitWasAmend, activeBranch, setActiveTabId, layoutDensity
  } = useAppStore();
  
  const [fetching, setFetching] = useState(false);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [showPullDropdown, setShowPullDropdown] = useState(false);
  const [showPushDropdown, setShowPushDropdown] = useState(false);
  
  const pullDropdownRef = useRef<HTMLDivElement>(null);
  const pushDropdownRef = useRef<HTMLDivElement>(null);

  const handleFetch = async () => {
    setFetching(true);
    try { await fetchAllRepo(); toast.success("Fetch completed"); } finally { setFetching(false); }
  };

  const handlePull = async (strategy?: any) => {
    if (strategy) {
      setPullStrategy(strategy);
      setShowPullDropdown(false);
    }
    await pullRepo(strategy);
  };

  const handleRefresh = async () => {
    if (activeRepoPath) await loadRepo(activeRepoPath);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pullDropdownRef.current && !pullDropdownRef.current.contains(e.target as Node)) setShowPullDropdown(false);
      if (pushDropdownRef.current && !pushDropdownRef.current.contains(e.target as Node)) setShowPushDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[var(--toolbar-height)] w-full bg-panel-background/80 backdrop-blur-3xl border-b border-border/40 flex items-center px-6 shrink-0 justify-between select-none shadow-[0_1px_10px_rgba(0,0,0,0.1)] z-50 overflow-visible"
    >
      
      {/* Left: Repo Selector & Navigation */}
      <div className="flex-1 flex items-center min-w-0 gap-4">
        <RepoSelector />
        <Separator orientation="vertical" className="h-4 opacity-20" />
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors gap-1.5 px-2.5 py-0.5">
            <GitBranch size={10} className="opacity-70" />
            <span className="font-mono text-[11px] font-bold">{activeBranch || 'No Branch'}</span>
          </Badge>
          {repoStatus && (repoStatus.ahead > 0 || repoStatus.behind > 0) && (
            <div className="flex items-center gap-1 ml-1 scale-90 origin-left">
              {repoStatus.ahead > 0 && <Badge className="bg-dracula-cyan/10 text-dracula-cyan border-dracula-cyan/20 px-1.5">↑{repoStatus.ahead}</Badge>}
              {repoStatus.behind > 0 && <Badge className="bg-dracula-orange/10 text-dracula-orange border-dracula-orange/20 px-1.5">↓{repoStatus.behind}</Badge>}
            </div>
          )}
        </div>
      </div>

      {/* Middle: Git Actions Grouped */}
      <div className="flex-[2] flex items-center justify-center">
        <div 
          className={cn(
            "flex items-center gap-1 p-0.5 rounded-2xl border border-border/40 shadow-[0_2px_10px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-all",
            layoutDensity === 'compact' ? "h-9" : "h-11"
          )}
          style={{ backgroundColor: 'var(--toolbar-group-background)' }}
        >
          
          {/* History Group */}
          <div className="flex items-center">
            <ToolbarAction 
              icon={<Undo size={16} />} 
              label="Undo" 
              onClick={undoLastCommit} 
              tooltip="Undo last commit (Soft Reset)"
              className="text-dracula-orange hover:bg-dracula-orange/10"
            />
            <ToolbarAction 
              icon={<Redo size={16} />} 
              label="Redo" 
              disabled 
              tooltip="Redo operation (Coming soon)"
            />
          </div>

          <Separator orientation="vertical" className="h-6 mx-1.5 opacity-30" />
          
          {/* Sync Group */}
          <div className="flex items-center">
            <ToolbarAction 
              icon={<RotateCw size={16} />} 
              label="Fetch" 
              onClick={handleFetch} 
              loading={fetching}
              tooltip="Fetch all remotes"
              className="text-primary hover:bg-primary/10"
            />
            
            <div className="relative flex items-center" ref={pullDropdownRef}>
              <ToolbarAction 
                icon={<CloudDownload size={16} />} 
                label="Pull" 
                onClick={() => handlePull()} 
                loading={isLoadingPull}
                badge={repoStatus?.behind}
                tooltip={`Pull changes (${pullStrategy})`}
                className="text-dracula-green hover:bg-dracula-green/10 rounded-r-none pr-1"
              />
              <button 
                onClick={() => setShowPullDropdown(!showPullDropdown)}
                className={cn(
                  "px-1 hover:bg-dracula-green/10 rounded-r-xl transition-all duration-200 border-l border-dracula-green/10 group",
                  layoutDensity === 'compact' ? "h-7" : "h-9",
                  showPullDropdown && "bg-dracula-green/10"
                )}
              >
                <ChevronDown size={12} className={cn("text-dracula-green/40 group-hover:text-dracula-green transition-transform duration-300", showPullDropdown && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showPullDropdown && (
                  <DropdownMenu 
                    title="Pull Strategy"
                    items={[
                      { id: 'fast_forward_only', label: 'Fast-Forward Only', desc: 'Fails if diverged', active: pullStrategy === 'fast_forward_only', icon: <Zap size={16} /> },
                      { id: 'fast_forward_or_merge', label: 'Merge (Default)', desc: 'Creates merge commit if needed', active: pullStrategy === 'fast_forward_or_merge', icon: <Layers size={16} /> },
                      { id: 'rebase', label: 'Rebase', desc: 'Rebases local on remote', active: pullStrategy === 'rebase', icon: <History size={16} /> },
                    ]}
                    onSelect={(id) => handlePull(id)}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="relative flex items-center" ref={pushDropdownRef}>
              <ToolbarAction 
                icon={<CloudUpload size={16} className={lastCommitWasAmend ? "animate-bounce" : ""} />} 
                label={lastCommitWasAmend ? "Force" : "Push"} 
                onClick={() => pushCurrentBranch(activeRepoPath!, 'normal')} 
                loading={isLoadingPush}
                badge={repoStatus?.ahead}
                tooltip={lastCommitWasAmend ? "Force push required due to amend" : "Push commits to remote"}
                className={cn("rounded-r-none pr-1 transition-all", lastCommitWasAmend ? "text-destructive hover:bg-destructive/10" : "text-primary hover:bg-primary/10")}
              />
              <button 
                onClick={() => setShowPushDropdown(!showPushDropdown)}
                className={cn(
                  "px-1 transition-all duration-200 border-l rounded-r-xl group",
                  layoutDensity === 'compact' ? "h-7" : "h-9",
                  lastCommitWasAmend ? "hover:bg-destructive/10 border-destructive/10" : "hover:bg-primary/10 border-primary/10",
                  showPushDropdown && (lastCommitWasAmend ? "bg-destructive/10" : "bg-primary/10")
                )}
              >
                <ChevronDown size={12} className={cn("transition-transform duration-300", lastCommitWasAmend ? "text-destructive/40 group-hover:text-destructive" : "text-primary/40 group-hover:text-primary", showPushDropdown && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showPushDropdown && (
                  <DropdownMenu 
                    title="Push Mode"
                    items={[
                      { id: 'normal', label: 'Normal Push', desc: 'Standard fast-forward', icon: <CloudUpload size={16} /> },
                      { id: 'force_with_lease', label: 'Force with Lease', desc: 'Secure history overwrite', color: 'text-destructive', icon: <Zap size={16} /> },
                    ]}
                    onSelect={(id) => {
                      pushCurrentBranch(activeRepoPath!, id as any);
                      setShowPushDropdown(false);
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1.5 opacity-30" />

          {/* Workflow Group */}
          <div className="flex items-center">
            <ToolbarAction 
              icon={<GitBranch size={16} />} 
              label="Branch" 
              onClick={() => setShowCreateBranch(true)} 
              tooltip="Create new branch"
              className="text-primary hover:bg-primary/10"
            />
            <ToolbarAction 
              icon={<Archive size={16} />} 
              label="Stash" 
              onClick={() => useAppStore.setState({ showCreateStash: true })} 
              tooltip="Stash local changes"
              className="text-dracula-orange hover:bg-dracula-orange/10"
            />
            <ToolbarAction 
              icon={<Navigation size={16} />} 
              label="Pop" 
              onClick={() => popStash(0)} 
              tooltip="Apply and drop latest stash"
              className="text-dracula-green hover:bg-dracula-green/10"
            />
          </div>
        </div>
      </div>

      {/* Right: Meta Actions */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <div className="flex items-center gap-1 bg-secondary/10 p-1 rounded-xl border border-border/20">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-background/40 transition-all active:scale-98" onClick={() => toast.info("Search coming soon")}>
            <Search size={18} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-background/40 transition-all active:scale-98", isLoadingRepo && "text-primary")}
            onClick={handleRefresh}
          >
            <RotateCw size={18} className={cn(isLoadingRepo && "animate-spin")} />
          </Button>
          <Separator orientation="vertical" className="h-4 mx-0.5 opacity-20" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-background/40 transition-all active:scale-98"
            onClick={openTerminal}
          >
            <Terminal size={18} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setActiveTabId('settings')}
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-background/40 transition-all active:scale-98"
          >
            <Settings size={18} />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showCreateBranch && (
          <CreateBranchDialog onClose={() => setShowCreateBranch(false)} />
        )}
        {showCreateStash && (
          <CreateStashDialog onClose={() => useAppStore.setState({ showCreateStash: false })} />
        )}
      </AnimatePresence>

    </motion.div>
  );
}

function ToolbarAction({ 
  icon, label, onClick, disabled, loading, badge, tooltip, className 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick?: () => void; 
  disabled?: boolean; 
  loading?: boolean;
  badge?: number;
  tooltip?: string;
  className?: string;
}) {
  const layoutDensity = useAppStore(s => s.layoutDensity);

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "flex flex-col gap-0.5 py-1 px-3 relative min-w-[56px] rounded-xl transition-all duration-200 group active:scale-98",
        layoutDensity === 'compact' ? "h-7 min-w-[48px]" : "h-9",
        className
      )}
      title={tooltip}
    >
      <motion.div 
        whileHover={{ scale: 1.1, y: -1 }}
        className="relative"
      >
        {loading ? <Loader2 size={layoutDensity === 'compact' ? 12 : 14} className="animate-spin" /> : React.cloneElement(icon as React.ReactElement, { size: layoutDensity === 'compact' ? 12 : 14 })}
        <AnimatePresence>
          {badge !== undefined && badge > 0 && (
            <motion.span 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] font-bold px-1 rounded-full border border-background shadow-sm"
            >
              {badge}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      <span className={cn(
        "uppercase font-bold tracking-wider opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap",
        layoutDensity === 'compact' ? "text-[8px]" : "text-[10px]"
      )}>{label}</span>
    </Button>
  );
}

function DropdownMenu({ title, items, onSelect }: { 
  title: string; 
  items: { id: string; label: string; desc?: string; active?: boolean; color?: string; icon?: React.ReactNode }[];
  onSelect: (id: string) => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.9, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 10, scale: 0.9, filter: "blur(10px)" }}
      className="absolute top-[calc(100%+8px)] left-0 w-64 bg-background backdrop-blur-2xl border border-border shadow-[0_10px_40px_rgba(0,0,0,0.3)] z-[100] p-2 rounded-2xl overflow-hidden"
    >
      <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40 mb-1">
        {title}
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-secondary flex flex-col group relative overflow-hidden",
              item.active && "bg-primary/10 border border-primary/20"
            )}
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className={cn("p-1.5 rounded-lg bg-secondary/50 transition-colors group-hover:bg-background", item.active && "text-primary bg-primary/20")}>
                  {item.icon}
                </div>
                <span className={cn("text-[13px] font-bold text-foreground/80 group-hover:text-foreground", item.color)}>
                  {item.label}
                </span>
              </div>
              {item.active && (
                <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(189,147,249,0.6)]" />
              )}
            </div>
            {item.desc && (
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground/60 ml-9 mt-0.5 leading-tight">
                {item.desc}
              </span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function RepoSelector() {
  const { repoInfo, activeRepoPath } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [recent, setRecent] = useState<RecentRepo[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchRecent = async () => {
        try {
          const repos = await invoke<RecentRepo[]>('get_recent_repos');
          setRecent(repos);
        } catch (e) { console.error(e); }
      };
      fetchRecent();
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handlePickRepo = async () => {
    setIsOpen(false);
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Open Repository' });
      if (selected) {
        await loadRepo(selected as string);
        autoFetch(selected as string);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-1.5 hover:bg-secondary/40 rounded-xl transition-all duration-300 group border border-transparent hover:border-border/30 active:scale-95"
      >
        <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-[12px] shadow-[0_4px_12px_rgba(189,147,249,0.3)] group-hover:shadow-[0_4px_20px_rgba(189,147,249,0.5)] transition-all group-hover:-translate-y-0.5">
          {repoInfo?.name[0]?.toUpperCase() || 'G'}
        </div>
        <div className="flex flex-col text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold tracking-tight text-foreground/90 truncate max-w-[120px]">
              {repoInfo?.name || 'GitKit'}
            </span>
            <ChevronDown size={14} className={cn("text-muted-foreground/40 transition-transform duration-300", isOpen && "rotate-180")} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
            className="absolute top-[calc(100%+12px)] left-0 w-[320px] bg-background backdrop-blur-3xl border border-border/50 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] z-[100] overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 border-b border-border/30 bg-secondary/20 text-[10px] uppercase font-bold text-muted-foreground/60 tracking-[0.2em] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={12} /> RECENT REPOS
              </div>
              <Badge variant="outline" className="text-[9px] opacity-40 font-mono">WORKSPACE</Badge>
            </div>
            
            <div className="max-h-[340px] overflow-y-auto custom-scrollbar p-2 space-y-1">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="p-4 bg-secondary/30 rounded-full">
                    <Globe size={24} className="text-muted-foreground/20" />
                  </div>
                  <span className="text-[12px] text-muted-foreground/40 font-bold uppercase tracking-widest">No recent history</span>
                </div>
              ) : (
                recent.map(repo => (
                  <button 
                    key={repo.path}
                    onClick={async () => { 
                      await loadRepo(repo.path); 
                      setIsOpen(false);
                      autoFetch(repo.path);
                    }}
                    className={cn(
                      "w-full flex flex-col px-4 py-3 rounded-2xl text-left transition-all duration-200 group relative overflow-hidden",
                      activeRepoPath === repo.path 
                        ? "bg-primary/10 border border-primary/20" 
                        : "hover:bg-secondary/60"
                    )}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                       <div className={cn("p-2 rounded-xl transition-colors", activeRepoPath === repo.path ? "bg-primary/20 text-primary" : "bg-secondary/40 text-muted-foreground group-hover:text-foreground")}>
                         <Layout size={14} />
                       </div>
                       <div className="flex flex-col min-w-0">
                         <span className={cn("text-[14px] font-bold truncate tracking-tight", activeRepoPath === repo.path ? 'text-primary' : 'text-foreground/80')}>
                           {repo.name}
                         </span>
                         <span className="text-[10px] text-muted-foreground truncate opacity-40 font-mono" title={repo.path}>{repo.path}</span>
                       </div>
                       {activeRepoPath === repo.path && (
                         <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold tracking-widest uppercase">
                            Active
                         </div>
                       )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-3 bg-secondary/10 border-t border-border/30">
              <button 
                onClick={handlePickRepo}
                className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-[13px] font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all active:scale-95 group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                Open Repository
                <div className="ml-auto opacity-40 flex items-center gap-1 scale-75">
                  <Command size={12} /> O
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

