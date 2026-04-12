import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, Circle, CircleDot, CloudSync, MoreHorizontal, GitBranch, Folder, ChevronsLeft, ChevronsRight, Plus, Trash2, ChevronsDown, RotateCcw, Cloud, Layers, X } from "lucide-react";
import { useAppStore, StashEntry } from "../store";
import { safeSwitchBranch, applyStash, popStash } from "../lib/repo";
import { Highlight } from "./Sidebar/utils";
import { StashEntryItem, StashContextMenu } from "./Sidebar/Stashes";

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


export function Sidebar() {
  const [localOpen, setLocalOpen] = useState(true);
  const [remoteOpen, setRemoteOpen] = useState(true);
  const [stashOpen, setStashOpen] = useState(true);
  const [filter, setFilter] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [localFlex, setLocalFlex] = useState(1);
  const [remoteFlex, setRemoteFlex] = useState(1);
  const [stashFlex, setStashFlex] = useState(1);

  const [stashContextMenu, setStashContextMenu] = useState<{ x: number, y: number, stash: StashEntry } | null>(null);
  const [branchContextMenu, setBranchContextMenu] = useState<{ x: number, y: number, branch: string } | null>(null);
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
               <BranchSelector setBranchContextMenu={setBranchContextMenu} />
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }} 
                 className="p-1 hover:bg-[#2c313a] rounded text-[#a0a6b1] hover:text-white transition-colors shrink-0" 
                 title="Collapse Sidebar"
               >
                   <ChevronsLeft size={16} />
               </button>
            </div>
        
            <div className="flex items-center">
               <div className="flex-1 flex items-center bg-[#0d1117] rounded-md px-2 border border-[#30363d] focus-within:border-[#388bfd] shadow-inner transition-colors">
                  <Search size={14} className="text-[#6e7681] mr-2" />
                  <input
                    type="text"
                    placeholder="Filter branches, stashes..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="w-full bg-transparent border-none text-[13px] py-1.5 outline-none text-[#e6edf3] placeholder-[#6e7681]"
                  />
                  {filter && (
                    <button onClick={() => setFilter('')} className="text-[#6e7681] hover:text-[#e6edf3] ml-1">
                      <X size={14} />
                    </button>
                  )}
               </div>
            </div>
          </div>

          <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden p-2 gap-0 relative">
            <div className={`flex flex-col min-h-0 pt-2 ${localOpen ? 'shrink' : 'shrink-0'}`} style={{ flex: localOpen ? localFlex : '0 0 auto' }}>
               <SectionHeader title="LOCAL" count="" open={localOpen} setOpen={setLocalOpen} />
               {localOpen && (
                 <div className="flex-1 flex flex-col mt-2 overflow-y-auto custom-scrollbar scrollbar-autohide bg-[#0d1117]/50 rounded-lg border border-[#30363d] py-1">
                    {filteredLocalTree.length === 0 ? (
                      <div className="text-xs text-[#5c6370] italic px-2 py-2">No branches found</div>
                    ) : (
                     filteredLocalTree.map(node => (
                        <BranchTreeItem key={node.fullPath} node={node} activeBranch={activeBranch} level={0} filter={filter} setBranchContextMenu={setBranchContextMenu} />
                      ))
                    )}
                 </div>
               )}
            </div>

            {localOpen && remoteOpen && (
              <SidebarResizeHandle onMouseDown={startResizing('local')} />
            )}

            <div className={`flex flex-col min-h-0 pt-3 ${remoteOpen ? 'grow shrink' : 'shrink-0'}`} style={{ flex: remoteOpen ? remoteFlex : '0 0 auto' }}>
               <SectionHeader title="REMOTE" count={filteredRemoteTree.size} open={remoteOpen} setOpen={setRemoteOpen} />
               {remoteOpen && (
                 <div className="flex-1 flex flex-col mt-2 overflow-y-auto custom-scrollbar scrollbar-autohide bg-[#0d1117]/50 rounded-lg border border-[#30363d] py-1">
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
                               <BranchTreeItem key={`${remote}/${node.fullPath}`} node={node} activeBranch={null} level={1} filter={filter} setBranchContextMenu={setBranchContextMenu} remotePrefix={remote} />
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

            <div className={`flex flex-col min-h-0 pt-3 ${stashOpen ? 'shrink' : 'shrink-0'}`} style={{ flex: stashOpen ? stashFlex : '0 0 auto' }}>
               <SectionHeader title="STASHES" count={filteredStashes.length} open={stashOpen} setOpen={setStashOpen} />
               {stashOpen && (
                 <div className="flex-1 flex flex-col mt-2 overflow-y-auto custom-scrollbar scrollbar-autohide bg-[#0d1117]/50 rounded-lg border border-[#30363d] py-1 px-1 gap-1.5">
                   {filteredStashes.length === 0 ? (
                     <div className="text-xs text-[#5c6370] italic px-2 py-2">No stashes</div>
                   ) : (
                      filteredStashes.map((s: StashEntry) => (
                        <StashEntryItem 
                          key={s.oid} 
                          stash={s} 
                          filter={filter} 
                          onContextMenu={(e, stash) => {
                            e.preventDefault();
                            setStashContextMenu({ x: e.clientX, y: e.clientY, stash });
                          } } 
                        />
                      ))
                    )}
                 </div>
               )}
            </div>
          </div>
        </>
      )}
      {stashContextMenu && (
        <StashContextMenu 
          stash={stashContextMenu.stash} 
          position={{ x: stashContextMenu.x, y: stashContextMenu.y }} 
          onClose={() => setStashContextMenu(null)} 
        />
      )}
      {branchContextMenu && (
        <BranchContextMenu 
          branch={branchContextMenu.branch} 
          position={{ x: branchContextMenu.x, y: branchContextMenu.y }} 
          onClose={() => setBranchContextMenu(null)} 
        />
      )}
    </aside>
  );
}

function BranchSelector({ setBranchContextMenu }: { setBranchContextMenu: (ctx: { x: number, y: number, branch: string } | null) => void }) {
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

    await safeSwitchBranch(branch.name);
  };

  return (
    <div className="relative flex-1 min-w-0" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer hover:bg-[#2c313a] px-2 py-1.5 rounded-md transition-colors group min-w-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch size={16} className="text-blue-400 shrink-0" />
          <span className="font-bold text-[#e5e5e6] truncate text-[16px]">
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setBranchContextMenu({ x: e.clientX, y: e.clientY, branch: branch.name });
                    }}
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

function BranchTreeItem({ node, activeBranch, level, filter = "", setBranchContextMenu, remotePrefix }: { node: BranchNode; activeBranch: string | null; level: number, filter?: string, setBranchContextMenu: (ctx: { x: number, y: number, branch: string } | null) => void, remotePrefix?: string }) {
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
                onContextMenu={(e) => {
                    if (node.isBranch) {
                        e.preventDefault();
                        const fullRef = remotePrefix ? `${remotePrefix}/${node.fullPath}` : node.fullPath;
                        setBranchContextMenu({ x: e.clientX, y: e.clientY, branch: fullRef });
                    }
                }}
                onDoubleClick={async () => {
                    if (node.isBranch && !isHead) {
                        const fullRef = remotePrefix ? `${remotePrefix}/${node.fullPath}` : node.fullPath;
                        await safeSwitchBranch(fullRef);
                    }
                }}
                className={`flex items-center group h-[24px] px-1.5 mx-1 rounded-md transition-all cursor-pointer whitespace-nowrap
                    ${isHead ? 'bg-[#1d3a5f] border-l-2 border-[#388bfd]' : 'hover:bg-[#1f2937] border-l-2 border-transparent'}
                `}
                style={{ paddingLeft: `${Math.max(6, level * 20.5 + 6)}px` }}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1 group">
                    {hasChildren ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                            <ChevronDown size={14} className={`text-[#6e7681] transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
                            <Folder size={14} className="text-[#388bfd] opacity-70" />
                        </div>
                    ) : (
                        <div className="shrink-0 w-4 flex justify-center">
                           {remotePrefix ? (
                             <Cloud size={14} className={isHead ? "text-[#388bfd]" : "text-[#6e7681] group-hover:text-[#e6edf3]"} />
                           ) : (
                             <GitBranch size={14} className={isHead ? "text-[#388bfd]" : "text-[#6e7681] group-hover:text-[#e6edf3]"} />
                           )}
                        </div>
                    )}
                    
                    <span className={`text-[13px] truncate flex-1 group-hover:text-[#e6edf3] transition-colors ${isHead ? 'text-[#e6edf3] font-semibold' : 'text-[#8b949e]'}`}>
                        <Highlight text={node.name} query={filter} />
                    </span>

                    {isHead && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#388bfd] mr-1" />
                    )}
                </div>
                
                {node.isBranch && (
                    <button 
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        const fullRef = remotePrefix ? `${remotePrefix}/${node.fullPath}` : node.fullPath;
                        setBranchContextMenu({ x: e.clientX, y: e.clientY, branch: fullRef });
                      }}
                    >
                      <MoreHorizontal size={14} className="text-[#8b949e]" />
                    </button>
                )}
            </div>

            {hasChildren && expanded && (
                <div className="flex flex-col">
                    {children.map(child => (
                        <BranchTreeItem key={child.fullPath} node={child} activeBranch={activeBranch} level={level + 1} filter={filter} setBranchContextMenu={setBranchContextMenu} remotePrefix={remotePrefix} />
                    ))}
                </div>
            )}
        </div>
    );
}

function SectionHeader({ title, count, open, setOpen }: { title: string; count: number | string; open: boolean; setOpen: (b: boolean) => void }) {
  return (
    <div onClick={() => setOpen(!open)} className="flex items-center group cursor-pointer h-6 px-2">
      <ChevronDown size={14} className={`text-[#6e7681] transition-transform duration-200 mr-1.5 ${open ? '' : '-rotate-90'}`} />
      <span className="section-header-text whitespace-nowrap mr-3">{title}</span>
      <hr className="flex-1 border-[#30363d]" />
      {count !== "" && (
          <span className="ml-3 bg-[#1c2128] text-[#6e7681] text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#30363d] min-w-[20px] text-center">{count}</span>
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

function BranchContextMenu({ branch, position, onClose }: { branch: string; position: { x: number; y: number }; onClose: () => void }) {
  const { branches, cherryPickState } = useAppStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState(position);

  const hasOrigin = branches.some(b => b.branch_type === 'remote' && b.name === `origin/${branch}`);
  const isProcessing = cherryPickState !== 'idle';

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = position;

    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    setMenuPos({ x, y });
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleForceCheckout = () => {
    onClose();
    useAppStore.setState({ forceCheckoutTarget: branch, forceCheckoutPhase: 'confirm_reset' });
  };

  return (
    <div 
      ref={menuRef}
      className="fixed bg-[#1c2128] border border-[#30363d] rounded shadow-2xl py-1 z-[9999] min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
      style={{ top: menuPos.y, left: menuPos.x }}
    >
      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-[#30363d] mb-1 truncate">
        Branch: {branch}
      </div>
      
      <button 
        disabled={!hasOrigin || isProcessing}
        onClick={handleForceCheckout}
        className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
          !hasOrigin || isProcessing 
            ? 'text-slate-600 cursor-not-allowed' 
            : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
        }`}
        title={!hasOrigin ? "No remote tracking branch found" : isProcessing ? "Complete current operation first" : ""}
      >
        <RotateCcw size={14} />
        Force checkout from origin
      </button>

      {!hasOrigin && (
        <div className="px-3 py-1 text-[10px] text-slate-500 italic">
          No tracking branch on origin
        </div>
      )}
    </div>
  );
}

