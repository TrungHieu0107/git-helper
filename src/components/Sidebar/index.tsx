import { useState, useRef, useMemo } from "react";
import { Search, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, StashEntry } from "../../store";
import { BranchNode, BranchTreeItem } from "./BranchTree";
import { SectionHeader } from "./SectionHeader";
import { StashEntryItem, StashContextMenu } from "./Stashes";
import { BranchContextMenu } from "./BranchContextMenu";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Separator } from "../ui/Separator";
import { cn } from "../../lib/utils";

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
      className={cn(
        "bg-background/95 backdrop-blur-md flex flex-col h-full border-r border-border shrink-0 text-muted-foreground select-none relative transition-all duration-300 ease-out-expo group/sidebar",
        isCollapsed && "w-12 items-center"
      )}
      style={{ width: isCollapsed ? '48px' : `${sidebarWidth}px` }}
    >
      {!isCollapsed && (
        <div 
          onMouseDown={startHorizontalResizing}
          className="absolute top-0 right-[-2px] w-1 h-full cursor-col-resize hover:bg-primary/40 transition-colors z-[101]"
        />
      )}

      {isCollapsed ? (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsCollapsed(false)} 
          className="mt-4 h-9 w-9 hover:bg-secondary"
        >
           <ChevronsRight size={16} />
        </Button>
      ) : (
        <>
          {/* Sidebar Header */}
          <div className="p-3 pb-2 flex flex-col gap-3">
            <div className="flex justify-between items-center pl-1">
               <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Navigation</span>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={() => setIsCollapsed(true)} 
                 className="h-7 w-7 text-muted-foreground hover:text-foreground"
               >
                   <ChevronsLeft size={16} />
               </Button>
            </div>
        
            <div className="relative group">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Filter everything..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="pl-8 h-8 bg-secondary/30 border-transparent focus-visible:ring-primary/30 text-[13px]"
              />
              {filter && (
                <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <Separator className="mx-3 w-auto opacity-50" />

          {/* Sidebar Content */}
          <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden px-2 pt-2 gap-0 relative">
            
            {/* Local Branches */}
            <div className={cn("flex flex-col min-h-0", localOpen ? "shrink" : "shrink-0")} style={{ flex: localOpen ? localFlex : '0 0 auto' }}>
                <SectionHeader title="Local Branches" count={filteredLocalTree.length} open={localOpen} setOpen={setLocalOpen} />
                <AnimatePresence>
                  {localOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex-1 flex flex-col mt-1 overflow-y-auto custom-scrollbar bg-secondary/20 rounded-lg border border-border/50 py-1"
                    >
                      {filteredLocalTree.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground/60 italic p-4 text-center">No local branches</div>
                      ) : (
                        filteredLocalTree.map(node => (
                          <BranchTreeItem key={node.fullPath} node={node} activeBranch={activeBranch} level={0} filter={filter} setBranchContextMenu={setBranchContextMenu} />
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>

            {localOpen && remoteOpen && (
              <div onMouseDown={startResizing('local')} className="h-1.5 cursor-row-resize hover:bg-primary/20 transition-colors my-0.5 shrink-0 z-10" />
            )}

            {/* Remote Branches */}
            <div className={cn("flex flex-col min-h-0 pt-2", remoteOpen ? "grow shrink" : "shrink-0")} style={{ flex: remoteOpen ? remoteFlex : '0 0 auto' }}>
               <SectionHeader title="Remotes" count={filteredRemoteTree.size} open={remoteOpen} setOpen={setRemoteOpen} />
               <AnimatePresence>
                 {remoteOpen && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     className="flex-1 flex flex-col mt-1 overflow-y-auto custom-scrollbar bg-secondary/20 rounded-lg border border-border/50 py-1"
                   >
                     {filteredRemoteTree.size === 0 ? (
                       <div className="text-[11px] text-muted-foreground/60 italic p-4 text-center">No remote repositories</div>
                     ) : (
                       Array.from(filteredRemoteTree.entries()).map(([remote, tree]) => (
                         <div key={remote}>
                            {tree.map(node => (
                              <BranchTreeItem key={`${remote}/${node.fullPath}`} node={node} activeBranch={null} level={0} filter={filter} setBranchContextMenu={setBranchContextMenu} remotePrefix={remote} />
                            ))}
                         </div>
                       ))
                     )}
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {remoteOpen && stashOpen && (
              <div onMouseDown={startResizing('remote')} className="h-1.5 cursor-row-resize hover:bg-primary/20 transition-colors my-0.5 shrink-0 z-10" />
            )}

            {/* Stashes */}
            <div className={cn("flex flex-col min-h-0 pt-2 mb-2", stashOpen ? "shrink" : "shrink-0")} style={{ flex: stashOpen ? stashFlex : '0 0 auto' }}>
               <SectionHeader title="Stashes" count={filteredStashes.length} open={stashOpen} setOpen={setStashOpen} />
               <AnimatePresence>
                 {stashOpen && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     className="flex-1 flex flex-col mt-1 overflow-y-auto custom-scrollbar bg-secondary/20 rounded-lg border border-border/50 py-1 px-1 gap-1"
                   >
                     {filteredStashes.length === 0 ? (
                       <div className="text-[11px] text-muted-foreground/60 italic p-4 text-center">Empty stash</div>
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
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {/* Context Menus */}
      <AnimatePresence>
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
      </AnimatePresence>
    </aside>
  );
}
