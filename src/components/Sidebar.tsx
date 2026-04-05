import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, Circle, CircleDot, CloudSync, MoreHorizontal, FolderOpen, GitBranch, Folder } from "lucide-react";
import { useAppStore, RecentRepo } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { loadRepo } from "../lib/repo";
import { open } from "@tauri-apps/plugin-dialog";

// Hierarchical Branch Tree Types
export interface BranchNode {
    name: string;
    fullPath: string;
    isBranch: boolean;
    children: Map<string, BranchNode>;
}

function buildBranchTree(branchNames: string[]): BranchNode[] {
    const rootMap = new Map<string, BranchNode>();
    
    branchNames.forEach(fullPath => {
        const parts = fullPath.split('/');
        let currentLevel = rootMap;
        let cumulativePath = "";

        parts.forEach((part, index) => {
            cumulativePath = cumulativePath ? `${cumulativePath}/${part}` : part;
            const isLast = index === parts.length - 1;
            
            if (!currentLevel.has(part)) {
                currentLevel.set(part, {
                    name: part,
                    fullPath: isLast ? fullPath : cumulativePath,
                    isBranch: isLast,
                    children: new Map()
                });
            }
            
            const node = currentLevel.get(part)!;
            // If it's not the last part, keep going down
            if (!isLast) {
                currentLevel = node.children;
            } else {
                // Leaf node representing the branch
                node.isBranch = true;
            }
        });
    });

    // Convert Map to sorted array
    const toSortedArray = (map: Map<string, BranchNode>): BranchNode[] => {
        return Array.from(map.values()).sort((a, b) => {
            // Folders first, then branches
            if (!a.isBranch && b.isBranch) return -1;
            if (a.isBranch && !b.isBranch) return 1;
            return a.name.localeCompare(b.name);
        });
    };

    return toSortedArray(rootMap);
}

function filterBranchTree(nodes: BranchNode[], filterText: string): BranchNode[] {
    if (!filterText) return nodes;
    const lowerFilter = filterText.toLowerCase();

    return nodes.reduce((acc, node) => {
        // Recursively filter children first
        const filteredChildren = filterBranchTree(Array.from(node.children.values()), filterText);
        
        // Match if:
        // 1. node name matches
        // 2. OR any child matches
        const matches = node.name.toLowerCase().includes(lowerFilter) || filteredChildren.length > 0;
        
        if (matches) {
            acc.push({
                ...node,
                children: new Map(filteredChildren.map(c => [c.name, c]))
            });
        }
        return acc;
    }, [] as BranchNode[]);
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="text-blue-400 bg-blue-500/10 font-bold px-0.5 rounded-sm">{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
}

export function Sidebar() {
  const [localOpen, setLocalOpen] = useState(true);
  const [remoteOpen, setRemoteOpen] = useState(true);
  const [stashOpen, setStashOpen] = useState(true);
  const [showRepoSwitcher, setShowRepoSwitcher] = useState(false);
  const [recentRepos, setRecentRepos] = useState<RecentRepo[]>([]);
  const [filter, setFilter] = useState("");
  
  // Section Heights (px) - use percentage or absolute. Let's use relative weights (flex values)
  const [localFlex, setLocalFlex] = useState(1);
  const [remoteFlex, setRemoteFlex] = useState(1);
  const [stashFlex, setStashFlex] = useState(1);

  // Horizontal Width
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 260;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const repoInfo = useAppStore(state => state.repoInfo);
  const activeBranch = useAppStore(state => state.activeBranch) || "main";
  const stashes = useAppStore(state => state.stashes) || [];

  const branches = useAppStore(state => state.branches) || [];

  const { localBranches, remoteBranchesTree } = useMemo(() => {
    const locals: string[] = [];
    const remotes = new Map<string, string[]>();

    branches.forEach(b => {
      if (b.branch_type === 'local') {
        locals.push(b.name);
      } else {
        // "origin/main" -> remote: "origin", branch: "main"
        const parts = b.name.split('/');
        const remoteName = parts[0];
        const branchName = parts.slice(1).join('/');
        if (!remotes.has(remoteName)) remotes.set(remoteName, []);
        remotes.get(remoteName)!.push(branchName);
      }
    });

    return {
      localBranches: buildBranchTree(locals),
      remoteBranchesTree: new Map(Array.from(remotes.entries()).map(([r, names]) => [r, buildBranchTree(names)])),
    };
  }, [branches]);

  // Unified Filtered States
  const filteredLocalTree = useMemo(() => filterBranchTree(localBranches, filter), [localBranches, filter]);
  
  const filteredRemoteTree = useMemo(() => {
      const lowerFilter = filter.toLowerCase();
      const entries = Array.from(remoteBranchesTree.entries()).map(([remote, tree]): [string, BranchNode[]] => {
          const filteredTree = filterBranchTree(tree, filter);
          return [remote, filteredTree];
      });
      
      return new Map(entries.filter(([remote, tree]) => 
          remote.toLowerCase().includes(lowerFilter) || tree.length > 0
      ));
  }, [remoteBranchesTree, filter]);

  const filteredStashes = useMemo(() => {
      if (!filter) return stashes;
      return stashes.filter(s => s.message.toLowerCase().includes(filter.toLowerCase()));
  }, [stashes, filter]);


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

  // Vertical Resizing (Internal Sections)
  const startResizing = (section: 'local' | 'remote') => (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startLocal = localFlex;
    const startRemote = remoteFlex;
    const startStash = stashFlex;
    const totalFlex = localFlex + remoteFlex + stashFlex;
    
    const containerHeight = containerRef.current?.clientHeight || 500;
    const flexUnitHeight = containerHeight / totalFlex;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const flexDelta = deltaY / flexUnitHeight;

      if (section === 'local') {
        const newLocal = Math.max(0.1, startLocal + flexDelta);
        const remaining = totalFlex - newLocal;
        const ratio = remaining / (startRemote + startStash);
        setLocalFlex(newLocal);
        setRemoteFlex(startRemote * ratio);
        setStashFlex(startStash * ratio);
      } else if (section === 'remote') {
        const newRemote = Math.max(0.1, startRemote + flexDelta);
        const remaining = totalFlex - startLocal - newRemote;
        setRemoteFlex(newRemote);
        setStashFlex(Math.max(0.1, remaining));
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'row-resize';
  };

  // Horizontal Resizing (Sidebar Width)
  const startHorizontalResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(600, Math.max(180, startWidth + deltaX));
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebarWidth', newWidth.toString());
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  return (
    <aside 
      className="bg-[#1e2227] flex flex-col h-full border-r border-[#181a1f] shrink-0 text-[#a0a6b1] select-none text-sm relative group/sidebar"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Horizontal Resize Handle */}
      <div 
        onMouseDown={startHorizontalResizing}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/40 transition-colors z-[101]"
        title="Drag to resize sidebar"
      />

      {/* Top block (non-scrollable) */}
      <div className="p-3 border-b border-[#181a1f] flex flex-col gap-3 relative">
        <div className="flex justify-between items-center cursor-pointer hover:text-white" onClick={handleOpenSwitcher}>
           <span className="font-bold text-[#e5e5e6] flex items-center gap-1 flex-1 min-w-0 truncate">
              {repoInfo ? repoInfo.name : "GitKit"} ▾
           </span>
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
        
        <div className="flex items-center">
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

      {/* Sections Container */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden p-2 gap-0 relative">
        
        {/* LOCAL */}
        <div className={`flex flex-col min-h-0 border-t border-[#181a1f] pt-2 ${localOpen ? 'shrink' : 'shrink-0'}`} style={{ flex: localOpen ? localFlex : '0 0 auto' }}>
           <SectionHeader title="LOCAL" count="" open={localOpen} setOpen={setLocalOpen} />
           {localOpen && (
             <div className="flex-1 flex flex-col mt-1 overflow-y-auto custom-scrollbar min-h-0 pr-1 -mr-1 px-1">
               {filteredLocalTree.length === 0 ? (
                 <div className="text-xs text-[#5c6370] italic px-2 py-2">No branches found</div>
               ) : (
                 filteredLocalTree.map(node => (
                   <BranchTreeItem key={node.fullPath} node={node} activeBranch={activeBranch} level={0} filter={filter} />
                 ))
               )}
             </div>
           )}
        </div>

        {localOpen && remoteOpen && (
          <SidebarResizeHandle onMouseDown={startResizing('local')} />
        )}

        {/* REMOTE */}
        <div className={`flex flex-col min-h-0 border-t border-[#181a1f] pt-2 ${remoteOpen ? 'shrink' : 'shrink-0'}`} style={{ flex: remoteOpen ? remoteFlex : '0 0 auto' }}>
           <SectionHeader title="REMOTE" count={filteredRemoteTree.size} open={remoteOpen} setOpen={setRemoteOpen} />
           {remoteOpen && (
             <div className="flex-1 flex flex-col mt-1 text-[13px] text-slate-400 overflow-y-auto custom-scrollbar min-h-0 pr-1 -mr-1 px-1">
               {filteredRemoteTree.size === 0 ? (
                 <div className="text-xs text-[#5c6370] italic px-2 py-2">No remotes</div>
               ) : (
                 Array.from(filteredRemoteTree.entries()).map(([remote, tree]) => (
                   <div key={remote}>
                     <div className="flex items-center gap-2 py-1 pl-1">
                        <GitBranch size={12} className="text-[#5c6370]" />
                        <span className="text-[#a0a6b1] font-medium">
                          <Highlight text={remote} query={filter} />
                        </span>
                     </div>
                     <div className="pl-4">
                        {tree.map(node => (
                          <BranchTreeItem key={`${remote}/${node.fullPath}`} node={node} activeBranch={null} level={1} filter={filter} />
                        ))}
                     </div>
                   </div>
                 ))
               )}
             </div>
           )}
        </div>

        {remoteOpen && stashOpen && (
          <SidebarResizeHandle onMouseDown={startResizing('remote')} />
        )}

        {/* STASHES */}
        <div className={`flex flex-col min-h-0 border-t border-[#181a1f] pt-2 ${stashOpen ? 'shrink' : 'shrink-0'}`} style={{ flex: stashOpen ? stashFlex : '0 0 auto' }}>
           <SectionHeader title="STASHES" count={filteredStashes.length} open={stashOpen} setOpen={setStashOpen} />
           {stashOpen && (
             <div className="flex-1 flex flex-col mt-1 overflow-y-auto custom-scrollbar min-h-0 pr-1 -mr-1">
               {filteredStashes.length === 0 ? (
                 <div className="text-xs text-[#5c6370] italic px-2 py-2">No stashes</div>
               ) : (
                 filteredStashes.map((s, i: number) => {
                   const timeStr = new Date(s.timestamp * 1000).toLocaleString(undefined, {
                     year: 'numeric', month: 'short', day: 'numeric',
                     hour: '2-digit', minute: '2-digit'
                   });
                   return (
                     <div key={i} className="flex flex-col py-1.5 px-1 hover:bg-[#2c313a] rounded cursor-pointer group text-[13px] text-slate-300 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 shrink-0">≡</span>
                          <span className="truncate text-slate-300">
                             <Highlight text={s.message || `stash@{${s.index}}`} query={filter} />
                          </span>
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

function BranchTreeItem({ node, activeBranch, level, filter = "" }: Readonly<{ node: BranchNode; activeBranch: string | null; level: number, filter?: string }>) {
    const [expanded, setExpanded] = useState(true);
    const isHead = activeBranch === node.fullPath;
    const hasChildren = node.children.size > 0;

    const children = Array.from(node.children.values()).sort((a, b) => {
        if (!a.isBranch && b.isBranch) return -1;
        if (a.isBranch && !b.isBranch) return 1;
        return a.name.localeCompare(b.name);
    });

    if (!node.isBranch && !hasChildren) return null;

    return (
        <div className="flex flex-col">
            <div 
                onClick={() => { if (hasChildren) setExpanded(!expanded); }}
                onDoubleClick={() => {
                    if (node.isBranch && !isHead) {
                        useAppStore.setState({ confirmCheckoutTo: node.fullPath });
                    }
                }}
                className={`flex items-center justify-between py-1 px-1 rounded cursor-pointer group whitespace-nowrap transition-colors
                    ${isHead ? 'bg-[#2c313a]' : 'hover:bg-[#2c313a]'}
                `}
                style={{ paddingLeft: `${level * 12 + 4}px` }}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {hasChildren ? (
                        <div className="flex items-center gap-1.5 shrink-0 overflow-hidden">
                            {expanded ? <ChevronDown size={12} className="text-[#5c6370]" /> : <ChevronRight size={12} className="text-[#5c6370]" />}
                            <Folder size={14} className="text-amber-600/80 shrink-0" fill="currentColor" />
                        </div>
                    ) : (
                        <div className="shrink-0 w-[24px] flex justify-center">
                           {isHead ? <CircleDot size={12} className="text-[#3b82f6]" /> : <Circle size={12} className="text-[#5c6370]" />}
                        </div>
                    )}
                    
                    <span className={`text-[13px] truncate ${isHead ? 'text-[#e5e5e6] font-semibold' : 'text-[#a0a6b1]'}`}>
                        <Highlight text={node.name} query={filter} />
                    </span>
                    
                    {isHead && <CloudSync size={12} className="text-slate-400 shrink-0 ml-1" />}
                </div>
                
                {node.isBranch && (
                    <MoreHorizontal size={14} className="text-slate-400 invisible group-hover:visible shrink-0 ml-2" />
                )}
            </div>

            {hasChildren && expanded && (
                <div className="flex flex-col">
                    {children.map(child => (
                        <BranchTreeItem key={child.fullPath} node={child} activeBranch={activeBranch} level={level + 1} filter={filter} />
                    ))}
                </div>
            )}
        </div>
    );
}

function SectionHeader({ title, count, open, setOpen }: Readonly<{ title: string; count: number | string; open: boolean; setOpen: (b: boolean) => void }>) {
  return (
    <div onClick={() => setOpen(!open)} className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#5c6370] uppercase cursor-pointer hover:text-slate-300">
      <div className="flex items-center gap-1 shrink-0">
         {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
         {title}
      </div>
      {count !== "" && (
          <span className="bg-[#282c33] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{count}</span>
      )}
    </div>
  );
}

function SidebarResizeHandle({ onMouseDown }: Readonly<{ onMouseDown: (e: React.MouseEvent) => void }>) {
  return (
    <div 
      onMouseDown={onMouseDown}
      className="h-1 cursor-row-resize hover:bg-blue-500/30 transition-colors my-1 shrink-0 z-10"
      title="Drag to resize"
    />
  );
}
