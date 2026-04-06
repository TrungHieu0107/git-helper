import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, Circle, CircleDot, CloudSync, MoreHorizontal, GitBranch, Folder, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";
import { useAppStore } from "../store";
import { checkoutBranch, safeCheckout } from "../lib/repo";
import { toast } from "../lib/toast";

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
            if (!isLast) {
                currentLevel = node.children;
            } else {
                node.isBranch = true;
            }
        });
    });

    const toSortedArray = (map: Map<string, BranchNode>): BranchNode[] => {
        return Array.from(map.values()).sort((a, b) => {
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
        const filteredChildren = filterBranchTree(Array.from(node.children.values()), filterText);
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
  const [filter, setFilter] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [localFlex, setLocalFlex] = useState(1);
  const [remoteFlex, setRemoteFlex] = useState(1);
  const [stashFlex, setStashFlex] = useState(1);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 260;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
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

  const filteredLocalTree = useMemo(() => filterBranchTree(localBranches, filter), [localBranches, filter]);
  
  const filteredRemoteTree = useMemo(() => {
      const entries = Array.from(remoteBranchesTree.entries()).map(([remote, tree]): [string, BranchNode[]] => {
          const filteredTree = filterBranchTree(tree, filter);
          return [remote, filteredTree];
      });
      return new Map(entries.filter(([remote, tree]) => 
          remote.toLowerCase().includes(filter.toLowerCase()) || tree.length > 0
      ));
  }, [remoteBranchesTree, filter]);

  const filteredStashes = useMemo(() => {
      if (!filter) return stashes;
      return stashes.filter(s => s.message.toLowerCase().includes(filter.toLowerCase()));
  }, [stashes, filter]);

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
      className={`bg-[#1e2227] flex flex-col h-full border-r border-[#181a1f] shrink-0 text-[#a0a6b1] select-none text-sm relative group/sidebar transition-[width] duration-300 ${isCollapsed ? 'items-center py-3 border-t border-[#181a1f]' : ''}`}
      style={{ width: isCollapsed ? '48px' : `${sidebarWidth}px` }}
    >
      {!isCollapsed && (
        <div 
          onMouseDown={startHorizontalResizing}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/40 transition-colors z-[101]"
          title="Drag to resize sidebar"
        />
      )}

      {isCollapsed ? (
        <button onClick={() => setIsCollapsed(false)} className="p-1 hover:bg-[#2c313a] rounded text-[#a0a6b1] hover:text-white mt-2 transition-colors" title="Expand Sidebar">
           <ChevronsRight size={16} />
        </button>
      ) : (
        <>
          <div className="p-3 border-b border-[#181a1f] flex flex-col gap-3 relative">
            <div className="flex justify-between items-center gap-2">
               <BranchSelector />
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }} 
                 className="p-1 hover:bg-[#2c313a] rounded text-[#a0a6b1] hover:text-white transition-colors shrink-0" 
                 title="Collapse Sidebar"
               >
                   <ChevronsLeft size={16} />
               </button>
            </div>
        
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

          <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden p-2 gap-0 relative">
            <div className={`flex flex-col min-h-0 border-t border-[#181a1f] pt-2 ${localOpen ? 'shrink' : 'shrink-0'}`} style={{ flex: localOpen ? localFlex : '0 0 auto' }}>
               <SectionHeader title="LOCAL" count="" open={localOpen} setOpen={setLocalOpen} />
               {localOpen && (
                 <div className="flex-1 flex flex-col mt-1 overflow-y-auto custom-scrollbar min-h-0 bg-[#0d1117] rounded border border-[#30363d] py-1 px-1">
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

            <div className={`flex flex-col min-h-0 border-t border-[#181a1f] pt-2 ${remoteOpen ? 'shrink' : 'shrink-0'}`} style={{ flex: remoteOpen ? remoteFlex : '0 0 auto' }}>
               <SectionHeader title="REMOTE" count={filteredRemoteTree.size} open={remoteOpen} setOpen={setRemoteOpen} />
               {remoteOpen && (
                 <div className="flex-1 flex flex-col mt-1 text-[13px] text-slate-400 overflow-y-auto custom-scrollbar min-h-0 bg-[#0d1117] rounded border border-[#30363d] py-1 px-1">
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

            <div className={`flex flex-col min-h-0 border-t border-[#181a1f] pt-2 ${stashOpen ? 'shrink' : 'shrink-0'}`} style={{ flex: stashOpen ? stashFlex : '0 0 auto' }}>
               <SectionHeader title="STASHES" count={filteredStashes.length} open={stashOpen} setOpen={setStashOpen} />
               {stashOpen && (
                 <div className="flex-1 flex flex-col mt-1 overflow-y-auto custom-scrollbar min-h-0 bg-[#0d1117] rounded border border-[#30363d] py-1 px-2">
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
        </>
      )}
    </aside>
  );
}

function BranchSelector() {
  const { activeBranch, branches } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unifiedBranches = useMemo(() => {
    const map = new Map<string, { name: string; displayName: string; local: boolean; remote: string | null }>();
    
    // Process local branches
    branches.filter((b: any) => b.branch_type === "local").forEach((b: any) => {
      map.set(b.name, { name: b.name, displayName: b.name, local: true, remote: null });
    });
    
    // Process remote branches
    branches.filter((b: any) => b.branch_type === "remote").forEach((b: any) => {
      const parts = b.name.split("/");
      const remoteName = parts[0];
      const branchName = parts.slice(1).join("/");
      
      if (map.has(branchName)) {
        map.get(branchName)!.remote = remoteName;
      } else {
        map.set(b.name, { 
          name: b.name, 
          displayName: branchName, // Hide "origin/"
          local: false, 
          remote: remoteName 
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [branches]);

  const filtered = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return unifiedBranches.filter(b => b.displayName.toLowerCase().includes(query));
  }, [unifiedBranches, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = async (branch: { name: string; displayName: string; local: boolean; remote: string | null }) => {
    setIsOpen(false);
    setSearchTerm("");
    if (activeBranch === branch.name) return;

    try {
      const result = await safeCheckout(branch.name);

      switch (result.action) {
        case 'AlreadyOnBranch':
          toast.info(`Already on branch "${branch.displayName}"`);
          break;
        case 'Clean':
          // No uncommitted changes — checkout directly
          await checkoutBranch(branch.name);
          break;
        case 'DirtyNoConflict':
          // No conflicts — checkout directly (changes carry over)
          await checkoutBranch(branch.name);
          break;
        case 'DirtyWithConflict':
          // Conflicts detected — show conflict files in the checkout alert
          useAppStore.setState({ 
            confirmCheckoutTo: branch.name,
            checkoutError: { type: 'Conflict', data: { files: result.files || [] } }
          });
          break;
        case 'DirtyState':
          useAppStore.setState({ 
            confirmCheckoutTo: branch.name,
            checkoutError: { type: 'DirtyState', data: { state: result.state || 'unknown' } }
          });
          break;
        case 'NotFound':
          toast.error(`Branch "${branch.displayName}" not found.`);
          break;
      }
    } catch (e) {
      toast.error(`Pre-checkout check failed: ${e}`);
    }
  };

  return (
    <div className="relative flex-1 min-w-0" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer hover:bg-[#2c313a] px-2 py-1.5 rounded-md transition-colors group min-w-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch size={16} className="text-blue-400 shrink-0" />
          <span className="font-bold text-[#e5e5e6] truncate text-[14px]">
            {activeBranch || "Select Branch"}
          </span>
        </div>
        <ChevronDown size={14} className={`text-[#5c6370] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-[320px] bg-[#21262d] border border-[#3e4451] rounded-lg shadow-2xl z-[200] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-2 border-b border-[#30363d] bg-[#161b22]/50">
            <div className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1">
              <Search size={12} className="text-[#5c6370]" />
              <input 
                autoFocus
                type="text"
                placeholder="Switch to branch..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-[12px] w-full outline-none text-gray-200 placeholder-[#484f58]"
              />
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-gray-500 italic">No matches found</div>
            ) : (
              filtered.map(branch => {
                const isSelected = activeBranch === branch.name;
                return (
                  <div 
                    key={branch.name}
                    onClick={() => handleSelect(branch)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all group ${isSelected ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-[#30363d] text-gray-300 hover:text-white'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                       <GitBranch size={12} className={isSelected ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'} />
                       <span className="text-[13px] font-medium truncate">{branch.displayName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {branch.local && <div title="Local branch" className="text-[9px] bg-[#30363d] px-1 rounded text-gray-400 font-bold">L</div>}
                      {branch.remote && <div title={`Remote: ${branch.remote}`} className="text-[9px] bg-sky-500/10 px-1 rounded text-sky-400/80 font-bold shrink-0">R</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="p-2 border-t border-[#30363d] bg-[#161b22]/50">
            <button 
              onClick={() => { setIsOpen(false); }}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[12px] font-medium text-gray-400 hover:text-white hover:bg-[#30363d] transition-colors"
            >
              <Plus size={14} className="text-blue-400" />
              New branch...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchTreeItem({ node, activeBranch, level, filter = "" }: { node: BranchNode; activeBranch: string | null; level: number, filter?: string }) {
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
                onDoubleClick={async () => {
                    if (node.isBranch && !isHead) {
                        try {
                            const result = await safeCheckout(node.fullPath);
                            switch (result.action) {
                                case 'Clean':
                                    await checkoutBranch(node.fullPath);
                                    break;
                                case 'DirtyNoConflict':
                                    await checkoutBranch(node.fullPath);
                                    break;
                                case 'DirtyWithConflict':
                                    useAppStore.setState({ 
                                        confirmCheckoutTo: node.fullPath,
                                        checkoutError: { type: 'Conflict', data: { files: result.files || [] } }
                                    });
                                    break;
                                case 'DirtyState':
                                    useAppStore.setState({ 
                                        confirmCheckoutTo: node.fullPath,
                                        checkoutError: { type: 'DirtyState', data: { state: result.state || 'unknown' } }
                                    });
                                    break;
                                case 'NotFound':
                                    toast.error(`Branch "${node.fullPath}" not found.`);
                                    break;
                            }
                        } catch (e) {
                            toast.error(`Pre-checkout check failed: ${e}`);
                        }
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

function SectionHeader({ title, count, open, setOpen }: { title: string; count: number | string; open: boolean; setOpen: (b: boolean) => void }) {
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

function SidebarResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div 
      onMouseDown={onMouseDown}
      className="h-1 cursor-row-resize hover:bg-blue-500/30 transition-colors my-1 shrink-0 z-10"
      title="Drag to resize"
    />
  );
}
