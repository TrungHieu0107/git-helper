import { useState, useMemo, useEffect, useRef } from "react";
import { useAppStore, FileStatus } from "../store";
import { ArrowRight, AlertTriangle, Sparkles, ChevronDown, ChevronRight, Folder, GitCommit, ChevronRight as ChevronRightIcon, ChevronsRight, ChevronsLeft, Trash } from "lucide-react";
import { stageFile, unstageFile, stageAll, unstageAll, commitRepo, selectFileDiff } from "../lib/repo";
import { CommitDetailPanel } from "./CommitDetailPanel";

interface TreeNode {
  name: string;
  fullPath: string;
  status?: string;
  children: Map<string, TreeNode>;
  isFolder: boolean;
}

function buildTree(files: FileStatus[]): TreeNode {
  const root: TreeNode = { name: 'root', fullPath: '', children: new Map(), isFolder: true };
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath: parts.slice(0, index + 1).join('/'),
          status: isLast ? file.status : undefined,
          children: new Map(),
          isFolder: !isLast
        });
      }
      current = current.children.get(part)!;
    });
  });
  
  return root;
}

export function RightPanel() {
  const { stagedFiles, unstagedFiles, activeBranch, selectedCommitDetail, isLoadingCommitDetail } = useAppStore();
  const [message, setMessage] = useState('');
  const charsLeft = 72 - message.length;
  const [description, setDescription] = useState('');

  const [amend, setAmend] = useState(false);
  const [viewMode, setViewMode] = useState<'path' | 'tree'>('path');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Vertical Resizing State
  const [unstagedFlex, setUnstagedFlex] = useState(1);
  const [stagedFlex, setStagedFlex] = useState(1);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState(() => parseInt(localStorage.getItem('git_rightpanel_w') || '320', 10));

  useEffect(() => {
    document.documentElement.style.setProperty('--right-width', `${width}px`);
    localStorage.setItem('git_rightpanel_w', width.toString());
  }, [width]);

  const handleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startW = width;
    
    const onMove = (mv: MouseEvent) => {
      const newW = Math.max(250, Math.min(800, startW - (mv.pageX - startX)));
      setWidth(newW);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startVerticalResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startUnstaged = unstagedFlex;
    const startStaged = stagedFlex;
    const totalFlex = startUnstaged + startStaged;
    
    const containerHeight = listContainerRef.current?.clientHeight || 400;
    const flexUnitHeight = containerHeight / totalFlex;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const flexDelta = deltaY / flexUnitHeight;
      const newUnstaged = Math.max(0.1, startUnstaged + flexDelta);
      const newStaged = Math.max(0.1, totalFlex - newUnstaged);
      setUnstagedFlex(newUnstaged);
      setStagedFlex(newStaged);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'row-resize';
  };

  const handleCommit = async () => {
    const fullMessage = description ? `${message}\n\n${description}` : message;
    const success = await commitRepo(fullMessage, amend);
    if (success) {
      setMessage('');
      setDescription('');
      setAmend(false);
    }
  };

  const handleDiscardAll = () => {
    useAppStore.setState({ confirmDiscardAll: true });
  };

  const isViewingCommit = selectedCommitDetail || isLoadingCommitDetail;

  const unstagedTree = useMemo(() => buildTree(unstagedFiles), [unstagedFiles]);
  const stagedTree = useMemo(() => buildTree(stagedFiles), [stagedFiles]);

  const toggleFolder = (path: string) => {
    const newSet = new Set(expandedFolders);
    if (newSet.has(path)) newSet.delete(path);
    else newSet.add(path);
    setExpandedFolders(newSet);
  };

  const renderTree = (node: TreeNode, onAction: (path: string) => void, actionLabel: string, onClick: (path: string) => void, depth: number = 0) => {
    return Array.from(node.children.values())
      .sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map(child => {
        const isExpanded = expandedFolders.has(child.fullPath);
        return (
          <div key={child.fullPath} className="flex flex-col">
            <div 
              className="flex items-center justify-between py-1 px-2 hover:bg-[#2c313a] rounded cursor-pointer group"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => child.isFolder ? toggleFolder(child.fullPath) : onClick(child.fullPath)}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                {child.isFolder ? (
                  <>
                    {isExpanded ? <ChevronDown size={12} className="text-[#8b949e] shrink-0" /> : <ChevronRight size={12} className="text-[#8b949e] shrink-0" />}
                    <Folder size={12} className="text-[#58a6ff] opacity-80 shrink-0" />
                  </>
                ) : (
                  <>
                    <StatusIcon status={child.status!} size={12} />
                  </>
                )}
                <span className={`text-[12px] truncate font-mono ${child.isFolder ? 'text-[#8b949e]' : 'text-[#e6edf3]'}`}>
                  {child.name}
                </span>
              </div>
              {!child.isFolder && (
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     onAction(child.fullPath);
                   }}
                   className="invisible group-hover:visible shrink-0 bg-transparent text-[#5c6370] hover:text-[#e5e5e6] px-1 text-[11px]"
                 >
                   {actionLabel}
                 </button>
              )}
            </div>
            {child.isFolder && isExpanded && renderTree(child, onAction, actionLabel, onClick, depth + 1)}
          </div>
        );
      });
  };

  return (
    <aside 
      className={`flex flex-col bg-[#21252b] border-l border-[#181a1f] shrink-0 text-[#a0a6b1] select-none h-full relative transition-[width] duration-300 ${isCollapsed ? 'items-center border-t border-[#181a1f]' : 'w-[var(--right-width)]'}`}
      style={{ width: isCollapsed ? '48px' : undefined }}
    >
      
      {/* Resizer Handle */}
      {!isCollapsed && (
        <div 
          onMouseDown={handleResize}
          className="absolute top-0 left-[-2px] w-[5px] h-full cursor-col-resize hover:bg-[#58a6ff]/40 transition-colors z-[101]"
          title="Drag to resize right panel"
        />
      )}

      {isCollapsed ? (
        <button onClick={() => setIsCollapsed(false)} className="p-1 hover:bg-[#2c313a] rounded text-[#a0a6b1] hover:text-white mt-2 transition-colors" title="Expand Right Panel">
           <ChevronsLeft size={16} />
        </button>
      ) : isViewingCommit ? (
        <div className="flex flex-col h-full relative">
          <CommitDetailPanel onCollapse={() => setIsCollapsed(true)} />
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="h-[36px] border-b border-[#181a1f] flex items-center px-3 justify-between bg-[#21252b] z-10 shrink-0">
             <div className="flex items-center gap-2">
               <button onClick={() => setIsCollapsed(true)} className="p-1 hover:bg-[#2c313a] rounded text-[#a0a6b1] hover:text-white transition-colors" title="Collapse Right Panel">
                  <ChevronsRight size={16} />
               </button>
               {(stagedFiles.length > 0 || unstagedFiles.length > 0) && (
                 <button 
                   onClick={handleDiscardAll} 
                   className="p-1 text-[#f85149] hover:bg-[#da3633]/20 rounded transition-colors ml-1" 
                   title="Discard All Changes (reset --hard & clean)"
                 >
                   <Trash size={14} />
                 </button>
               )}
               <span className="text-[11px] uppercase tracking-wider text-[#d7dae0] font-semibold ml-1">
                  {stagedFiles.length + unstagedFiles.length} file changes on 
                  <span className="bg-[#58a6ff]/10 text-[#58a6ff] px-1.5 py-0.5 rounded ml-2 border border-[#58a6ff]/20">{activeBranch || '...'}</span>
               </span>
             </div>
          </header>
          
          {/* Tabs */}
          <div className="flex items-center gap-4 px-4 pt-2 border-b border-[#30363d] bg-[#21252b] shrink-0">
            <button 
              onClick={() => setViewMode('path')}
              className={`text-[11px] font-semibold pb-1.5 transition-all ${viewMode === 'path' ? 'text-[#58a6ff] border-b-2 border-[#58a6ff] drop-shadow-[0_0_4px_rgba(88,166,255,0.8)]' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
              Path
            </button>
            <button 
              onClick={() => setViewMode('tree')}
              className={`text-[11px] font-semibold pb-1.5 transition-all ${viewMode === 'tree' ? 'text-[#58a6ff] border-b-2 border-[#58a6ff] drop-shadow-[0_0_4px_rgba(88,166,255,0.8)]' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
              Tree
            </button>
          </div>

          {/* Scrollable File List */}
          <div ref={listContainerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden text-sm relative">
             
             {/* Unstaged Files */}
             <div className="flex flex-col p-2" style={{ flex: unstagedFlex, minHeight: 0 }}>
                 <div className="flex items-center text-[11px] font-semibold uppercase text-[#8b949e] mb-2 px-1 shrink-0 justify-between">
                    <span>Unstaged Files ({unstagedFiles.length})</span>
                    {unstagedFiles.length > 0 && (
                      <button 
                        onClick={stageAll}
                        className="bg-[#238636]/10 border border-[#238636]/30 text-[#3fb950] hover:bg-[#238636] hover:text-white transition-all px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide drop-shadow-[0_0_2px_rgba(63,185,80,0.4)]"
                      >
                        Stage All
                      </button>
                    )}
                 </div>
                 
                 <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col bg-[#0d1117] rounded border border-[#30363d] py-1">
                   {unstagedFiles.length > 0 ? (
                    viewMode === 'path' ? (
                      unstagedFiles.map((f, i) => (
                          <FileRow 
                            key={i} 
                            name={f.path} 
                            status={f.status} 
                            onAction={() => stageFile(f.path)}
                            actionLabel="Stage"
                            onClick={() => selectFileDiff(f.path, false)}
                          />
                      ))
                    ) : (
                      renderTree(unstagedTree, stageFile, "Stage", (p) => selectFileDiff(p, false))
                    )
                  ) : (
                    <div className="text-xs italic px-6 py-1.5 opacity-50 text-[#8b949e]">(khu vực trống)</div>
                  )}
                </div>
             </div>

             {/* Resizer Handle */}
             <div 
               onMouseDown={startVerticalResizing}
               className="h-1 bg-[#181a1f] w-full cursor-row-resize hover:bg-[#58a6ff]/40 transition-colors shrink-0"
               title="Drag to resize sections"
             />

             {/* Staged Files */}
             <div className="flex flex-col p-2" style={{ flex: stagedFlex, minHeight: 0 }}>
                <div className="flex items-center text-[11px] font-semibold uppercase text-[#8b949e] mb-2 px-1 shrink-0 justify-between">
                   <span>Staged Files ({stagedFiles.length})</span>
                   {stagedFiles.length > 0 && (
                     <button 
                       onClick={unstageAll}
                       className="bg-[#da3633]/10 border border-[#da3633]/30 text-[#f85149] hover:bg-[#da3633] hover:text-white transition-all px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                     >
                       Unstage All
                     </button>
                   )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col bg-[#0d1117] rounded border border-[#30363d] py-1">
                  {stagedFiles.length > 0 ? (
                    viewMode === 'path' ? (
                      stagedFiles.map((f, i) => (
                          <FileRow 
                            key={i} 
                            name={f.path} 
                            status={f.status} 
                            onAction={() => unstageFile(f.path)}
                            actionLabel="Unstage"
                            onClick={() => selectFileDiff(f.path, true)}
                          />
                      ))
                    ) : (
                      renderTree(stagedTree, unstageFile, "Unstage", (p) => selectFileDiff(p, true))
                    )
                  ) : (
                    <div className="text-[12px] italic px-6 py-1.5 opacity-50 text-[#8b949e]">(khu vực trống – chưa có file nào sẵn sàng commit)</div>
                  )}
                </div>
             </div>

          </div>

          {/* Commit Area (Bottom - Vibe Ready To Ship) */}
          <div className="border-t border-[#30363d] bg-[#161b22] flex flex-col shrink-0 p-3 pb-4 xl:p-4 gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-10 relative">
             <div className="flex items-center justify-between text-[#8b949e] mb-1 px-1">
                 <span className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[#e6edf3]">
                   <GitCommit size={14} className="text-[#3fb950]" /> Commit
                 </span>
                 <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-[#8b949e] hover:text-[#c9d1d9] transition-colors">
                    <input 
                      type="checkbox" 
                      checked={amend}
                      onChange={e => setAmend(e.target.checked)}
                      className="accent-[#3fb950] w-3 h-3 rounded-sm bg-[#0d1117] border-[#30363d] cursor-pointer" 
                    />
                    Amend previous commit
                 </label>
             </div>
             
             <div className="flex flex-col gap-2">
               <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Commit summary" 
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 outline-none text-[#e6edf3] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] text-[13px] pr-10 shadow-inner" 
                    value={message} 
                    onChange={e => setMessage(e.target.value)} 
                  />
                  <span className={`absolute right-3 top-2.5 text-[10px] font-mono font-bold ${charsLeft < 0 ? 'text-[#f85149]' : charsLeft < 20 ? 'text-[#d29922]' : 'text-[#8b949e]'}`}>{charsLeft}</span>
               </div>
               
               <textarea 
                  placeholder="Description" 
                  rows={3} 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 outline-none text-[#e6edf3] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] text-[12px] resize-none shadow-inner"
                ></textarea>
             </div>

             <div className="flex items-center justify-between mt-1">
               <button className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-[#c9d1d9] font-medium transition-colors">
                 <ChevronRightIcon size={12} /> Commit options
               </button>
               <button className="text-[#58a6ff] hover:bg-[#58a6ff]/10 p-1.5 rounded transition-colors" title="Compose commits with AI">
                  <Sparkles size={14} />
               </button>
             </div>
             
             <button 
              onClick={handleCommit}
              disabled={(!amend && stagedFiles.length === 0) || message.trim() === ''}
              className={`w-full py-2.5 rounded-md font-bold text-[12px] uppercase tracking-wide flex items-center justify-center gap-2 transition-all 
                ${((!amend && stagedFiles.length === 0) || message.trim() === '') 
                  ? 'bg-[#238636]/30 text-[#e6edf3]/40 cursor-not-allowed border border-[#238636]/20' 
                  : 'bg-[#238636] text-white hover:bg-[#2ea043] border border-[#2ea043]/50 drop-shadow-[0_0_8px_rgba(35,134,54,0.6)]'}`}
             >
                <GitCommit size={14} /> 
                {amend ? 'Amend Commit' : stagedFiles.length > 0 ? 'Stage Changes to Commit' : 'Commit Changes'}
             </button>
          </div>
        </>
      )}

    </aside>
  );
}

function StatusIcon({ status, size = 12 }: { status: string, size?: number }) {
  if (status === 'untracked') return <span className="font-mono text-[#3fb950] font-bold text-[11px] leading-none shrink-0" style={{ fontSize: size }}>+</span>;
  if (status === 'deleted') return <span className="font-mono text-[#f85149] font-bold text-[11px] leading-none shrink-0" style={{ fontSize: size }}>-</span>;
  if (status === 'renamed') return <ArrowRight size={size} className="text-[#58a6ff] shrink-0" />;
  if (status === 'conflicted') return <AlertTriangle size={size} className="text-[#f85149] shrink-0" />;
  return <span className="font-mono text-[#d29922] font-bold text-[11px] leading-none shrink-0">~</span>; // Instead of pencil, we can use ~ or Edit2
}

function FileRow({ name, status, onAction, actionLabel, onClick }: { name: string, status: string, onAction?: () => void, actionLabel?: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between py-1.5 px-3 hover:bg-[#2c313a] rounded cursor-pointer group whitespace-nowrap"
    >
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
           <StatusIcon status={status} />
           <div className="flex text-[12px] text-[#e6edf3] font-mono min-w-0 overflow-hidden" title={name}>
             {name.includes('/') ? (
                 <>
                   <span className="truncate shrink text-[#8b949e]">{name.substring(0, name.lastIndexOf('/') + 1)}</span>
                   <span className="shrink-0">{name.substring(name.lastIndexOf('/') + 1)}</span>
                 </>
             ) : (
                 <span className="truncate shrink-0">{name}</span>
             )}
           </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
          }}
          className="invisible group-hover:visible shrink-0 bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:text-white px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
        >
          {actionLabel}
        </button>
    </div>
  )
}
