import { useState, useMemo, useEffect, useRef } from "react";
import { useAppStore, FileStatus, StashEntry } from "../store";
import { ArrowRight, AlertTriangle, Sparkles, ChevronDown, ChevronRight, Folder, GitCommit, ChevronRight as ChevronRightIcon, ChevronsRight, ChevronsLeft, Trash, Search, X, Layers, CloudSync, Plus, GripVertical, Check, Copy } from "lucide-react";
import { stageFile, unstageFile, stageAll, unstageAll, commitRepo, selectFileDiff, loadConflictFile, getHeadCommitInfo, HeadCommitInfo } from "../lib/repo";
import { toast } from "../lib/toast";
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
  const { stagedFiles, unstagedFiles, activeBranch, selectedCommitDetail, isLoadingCommitDetail, cherryPickState, cherryPickConflictFiles, selectedConflictFile, activeRepoPath } = useAppStore();
  const [message, setMessage] = useState('');
  const charsLeft = 72 - message.length;
  const [description, setDescription] = useState('');

  const [amend, setAmend] = useState(false);
  const [headCommitInfo, setHeadCommitInfo] = useState<HeadCommitInfo | null>(null);

  // Reset amend state when navigating between commits or after selection change
  useEffect(() => {
    if (amend && selectedCommitDetail) {
      setAmend(false);
      setHeadCommitInfo(null);
    }
  }, [selectedCommitDetail]);

  const handleAmendToggle = async (checked: boolean) => {
    setAmend(checked);
    if (checked) {
      try {
        const info = await getHeadCommitInfo();
        if (info) {
          setHeadCommitInfo(info);
          setMessage(info.message.split('\n')[0]);
          setDescription(info.message.split('\n').slice(1).join('\n').trim());
        } else {
          setAmend(false);
          setHeadCommitInfo(null);
        }
      } catch (err: any) {
        setAmend(false);
        setHeadCommitInfo(null);
        toast.error(`Could not fetch head info: ${err}`);
      }
    } else {
      setHeadCommitInfo(null);
      setMessage('');
      setDescription('');
    }
  };
  const [viewMode, setViewMode] = useState<'path' | 'tree'>('path');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [fileFilter, setFileFilter] = useState('');

  // Vertical Resizing State
  const [unstagedFlex, setUnstagedFlex] = useState(1);
  const [stagedFlex, setStagedFlex] = useState(1);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState(() => parseInt(localStorage.getItem('git_rightpanel_w') || '340', 10));

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
      setHeadCommitInfo(null);
    }
  };

  const handleDiscardAll = () => {
    useAppStore.setState({ confirmDiscardAll: true });
  };

  const isViewingCommit = selectedCommitDetail || isLoadingCommitDetail;

  const filteredUnstaged = useMemo(() => 
    fileFilter ? unstagedFiles.filter(f => f.path.toLowerCase().includes(fileFilter.toLowerCase())) : unstagedFiles,
    [unstagedFiles, fileFilter]
  );
  const filteredStaged = useMemo(() => 
    fileFilter ? stagedFiles.filter(f => f.path.toLowerCase().includes(fileFilter.toLowerCase())) : stagedFiles,
    [stagedFiles, fileFilter]
  );

  const unstagedTree = useMemo(() => buildTree(filteredUnstaged), [filteredUnstaged]);
  const stagedTree = useMemo(() => buildTree(filteredStaged), [filteredStaged]);

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
              className="flex items-center justify-between h-[26px] hover:bg-[#1f2937] rounded-md cursor-pointer group mx-1"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => child.isFolder ? toggleFolder(child.fullPath) : onClick(child.fullPath)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {child.isFolder ? (
                  <>
                    <ChevronDown size={14} className={`text-[#6e7681] transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                    <Folder size={14} className="text-[#388bfd] opacity-70 shrink-0" />
                  </>
                ) : (
                  <StatusIcon status={child.status!} />
                )}
                <span className={`text-[12px] truncate font-mono ${child.isFolder ? 'text-[#e6edf3]' : 'text-[#e6edf3]'}`}>
                  {child.name}
                </span>
              </div>
              {!child.isFolder && (
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     onAction(child.fullPath);
                   }}
                   className="invisible group-hover:visible shrink-0 bg-[#388bfd] text-white px-2 py-0.5 rounded text-[10px] font-bold"
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
      className={`flex flex-col bg-[#161b22] border-l border-[#30363d] shrink-0 text-[#8b949e] select-none h-full relative transition-[width] duration-300 ${isCollapsed ? 'items-center bg-[#0d1117]' : 'w-[var(--right-width)]'}`}
      style={{ width: isCollapsed ? '48px' : undefined }}
    >
      
      {/* Col Resizer Handle */}
      {!isCollapsed && (
        <div 
          onMouseDown={handleResize}
          className="absolute top-0 left-[-2px] w-[5px] h-full cursor-col-resize hover:bg-[#388bfd]/40 transition-colors z-[101]"
        />
      )}

      {isCollapsed ? (
        <button onClick={() => setIsCollapsed(false)} className="p-2 hover:bg-[#1c2128] rounded-md text-[#6e7681] hover:text-[#e6edf3] mt-3 transition-colors">
           <ChevronsLeft size={16} />
        </button>
      ) : isViewingCommit ? (
        <div className="flex flex-col h-full relative">
          <CommitDetailPanel onCollapse={() => setIsCollapsed(true)} />
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="h-10 border-b border-[#30363d] flex items-center px-4 justify-between bg-[#161b22] shrink-0">
             <div className="flex items-center gap-3">
               <button onClick={() => setIsCollapsed(true)} className="p-1.5 hover:bg-[#1c2128] rounded-md text-[#6e7681] hover:text-[#e6edf3] transition-colors">
                  <ChevronsRight size={16} />
               </button>
               <span className="section-header-text">Changes</span>
             </div>
             {(stagedFiles.length > 0 || unstagedFiles.length > 0) && (
                 <button 
                   onClick={handleDiscardAll} 
                   className="p-1.5 text-[#f85149] hover:bg-[#f85149]/10 rounded-md transition-colors" 
                   title="Discard All"
                 >
                   <Trash size={14} />
                 </button>
             )}
          </header>
          
          {/* Tabs + Filter */}
          <div className="flex items-center gap-4 px-4 pt-3 border-b border-[#30363d] shrink-0">
            <button 
              onClick={() => setViewMode('path')}
              className={`text-[11px] font-bold pb-2 transition-all shrink-0 uppercase tracking-widest ${viewMode === 'path' ? 'text-[#388bfd] border-b-2 border-[#388bfd]' : 'text-[#6e7681] hover:text-[#e6edf3]'}`}
            >
              Path
            </button>
            <button 
              onClick={() => setViewMode('tree')}
              className={`text-[11px] font-bold pb-2 transition-all shrink-0 uppercase tracking-widest ${viewMode === 'tree' ? 'text-[#388bfd] border-b-2 border-[#388bfd]' : 'text-[#6e7681] hover:text-[#e6edf3]'}`}
            >
              Tree
            </button>
            <div className="flex-1 flex items-center bg-[#0d1117] rounded-md border border-[#30363d] px-2 mb-2 shadow-inner">
              <Search size={12} className="text-[#6e7681] shrink-0" />
              <input
                type="text"
                placeholder="Filter files..."
                value={fileFilter}
                onChange={e => setFileFilter(e.target.value)}
                className="w-full bg-transparent border-none text-[11px] py-1.5 px-2 outline-none text-[#e6edf3] placeholder-[#6e7681] font-mono"
              />
              {fileFilter && (
                <button onClick={() => setFileFilter('')} className="text-[#6e7681] hover:text-[#e6edf3]">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List Area */}
          <div ref={listContainerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
             
             {/* Conflicts */}
             {cherryPickState === 'conflict' && cherryPickConflictFiles.length > 0 && (
               <div className="flex flex-col p-2 shrink-0">
                 <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[#f85149] mb-2 px-1 gap-2">
                   <AlertTriangle size={12} /> Conflicts ({cherryPickConflictFiles.length})
                 </div>
                 <div className="flex flex-col bg-[#1c2128] rounded-lg border border-[#f85149]/30 py-1 overflow-hidden">
                   {cherryPickConflictFiles.map((f, i) => (
                     <div 
                        key={i}
                        onClick={() => activeRepoPath && loadConflictFile(activeRepoPath, f)}
                        className={`flex items-center justify-between h-[26px] px-2 rounded-md cursor-pointer transition-all mx-1 ${selectedConflictFile === f ? 'bg-[#f85149]/20 text-[#f85149]' : 'hover:bg-[#1f2937] text-[#e6edf3]'}`}
                     >
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                           <AlertTriangle size={12} className="text-[#f85149] shrink-0" />
                           <span className="text-[12px] font-mono truncate">{f}</span>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {/* Unstaged Files */}
             <div className="flex flex-col p-2" style={{ flex: unstagedFlex, minHeight: 0 }}>
                  <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[#6e7681] mb-2 px-1 shrink-0 justify-between">
                     <div className="flex items-center gap-2">
                        <span className="text-[#e3b341]">UNSTAGED</span>
                        <span className="bg-[#0d1117] px-1.5 py-0.5 rounded-full border border-[#e3b341]/20 text-[#e3b341]/80">{filteredUnstaged.length}{fileFilter ? `/${unstagedFiles.length}` : ''}</span>
                     </div>
                     {unstagedFiles.length > 0 && (
                       <button 
                         onClick={stageAll}
                         className="text-[#3fb950] hover:bg-[#3fb950]/10 px-2 py-0.5 rounded-md border border-[#3fb950]/20 transition-all font-bold uppercase tracking-wide text-[9px]"
                       >
                         Stage All
                       </button>
                     )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar-hidden flex flex-col bg-[#0d1117] rounded-lg border border-[#30363d] py-1">
                    {filteredUnstaged.length > 0 ? (
                     viewMode === 'path' ? (
                       filteredUnstaged.map((f, i) => (
                           <FileRow 
                             key={i} 
                             name={f.path} 
                             status={f.status} 
                             onAction={() => stageFile(f.path)}
                             actionLabel="Stage"
                             onClick={() => selectFileDiff(f.path, false)}
                             highlight={fileFilter}
                           />
                       ))
                     ) : (
                       renderTree(unstagedTree, stageFile, "Stage", (p) => selectFileDiff(p, false))
                     )
                   ) : (
                     <div className="text-[11px] italic px-6 py-4 opacity-40 text-center">No modified files</div>
                   )}
                 </div>
             </div>

              {/* Row Resizer Handle */}
              <div 
                onMouseDown={startVerticalResizing}
                className="h-2 bg-[#0d1117] border-y border-[#30363d] w-full cursor-row-resize hover:bg-[#388bfd]/20 transition-all shrink-0 flex items-center justify-center group"
              >
                 <div className="w-8 h-1 bg-[#30363d] rounded-full group-hover:bg-[#388bfd] transition-colors" />
              </div>

             {/* Staged Files */}
             <div className="flex flex-col p-2" style={{ flex: stagedFlex, minHeight: 0 }}>
                <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[#6e7681] mb-2 px-1 shrink-0 justify-between">
                   <div className="flex items-center gap-2">
                      <span className="text-[#3fb950]">STAGED</span>
                      <span className="bg-[#0d1117] px-1.5 py-0.5 rounded-full border border-[#3fb950]/20 text-[#3fb950]/80">{filteredStaged.length}{fileFilter ? `/${stagedFiles.length}` : ''}</span>
                   </div>
                   {stagedFiles.length > 0 && (
                     <button 
                       onClick={unstageAll}
                       className="text-[#f85149] hover:bg-[#f85149]/10 px-2 py-0.5 rounded-md border border-[#f85149]/20 transition-all font-bold uppercase tracking-wide text-[9px]"
                     >
                       Unstage All
                     </button>
                   )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar-hidden flex flex-col bg-[#0d1117] rounded-lg border border-[#30363d] py-1">
                  {filteredStaged.length > 0 ? (
                    viewMode === 'path' ? (
                      filteredStaged.map((f, i) => (
                          <FileRow 
                            key={i} 
                            name={f.path} 
                            status={f.status} 
                            onAction={() => unstageFile(f.path)}
                            actionLabel="Unstage"
                            onClick={() => selectFileDiff(f.path, true)}
                            highlight={fileFilter}
                          />
                      ))
                    ) : (
                      renderTree(stagedTree, unstageFile, "Unstage", (p) => selectFileDiff(p, true))
                    )
                  ) : (
                    <div className="text-[11px] italic px-6 py-4 opacity-40 text-center">No files staged</div>
                  )}
                </div>
             </div>
          </div>

          {/* Commit Area */}
          <div className="border-t border-[#30363d] bg-[#161b22] flex flex-col shrink-0 p-4 gap-4 shadow-2xl z-10 relative">
             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-[#3fb950] rounded-sm" />
                    <span className="section-header-text">NEW COMMIT</span>
                 </div>
                 <div 
                   onClick={() => handleAmendToggle(!amend)}
                   className="flex items-center gap-2 cursor-pointer group"
                 >
                    <span className="text-[10px] font-bold text-[#6e7681] group-hover:text-[#e6edf3] transition-colors uppercase">Amend</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${amend ? 'bg-[#3fb950]' : 'bg-[#30363d]'}`}>
                       <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${amend ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                 </div>
             </div>
             
             {amend && headCommitInfo && (
               <div className="flex flex-col gap-2 p-2 bg-[#d29922]/10 border border-[#d29922]/20 rounded-md">
                 {headCommitInfo.is_pushed && (
                   <div className="flex items-center gap-2 text-[10px] text-[#e3b341] font-bold">
                     <AlertTriangle size={12} />
                     <span>Already pushed (requires force)</span>
                   </div>
                 )}
                 <div className="text-[11px] text-[#6e7681] font-mono truncate">
                   amend: {headCommitInfo.oid.substring(0, 7)} - {headCommitInfo.author_name}
                 </div>
               </div>
             )}
             
             <div className="flex flex-col gap-2">
                <div className="relative group/input">
                   <input 
                     type="text" 
                     placeholder="Summary (required)" 
                     className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#388bfd] rounded-md px-3 py-2 outline-none text-[#e6edf3] text-[13px] transition-all shadow-inner" 
                     value={message} 
                     onChange={e => setMessage(e.target.value)} 
                   />
                   <div className={`absolute right-2.5 top-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md border border-white/5 shadow-sm
                     ${charsLeft < 0 ? 'bg-[#f85149]/20 text-[#f85149]' : charsLeft < 22 ? 'bg-[#e3b341]/20 text-[#e3b341]' : 'bg-white/5 text-[#6e7681]'}`}>
                     {charsLeft}
                   </div>
                </div>
                
                <textarea 
                   placeholder="Description (optional)" 
                   rows={3} 
                   value={description}
                   onChange={e => setDescription(e.target.value)}
                   className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#388bfd] rounded-md px-3 py-2 outline-none text-[#e6edf3] text-[13px] resize-none transition-all shadow-inner min-h-[60px]"
                />
             </div>

             <button 
              onClick={handleCommit}
              disabled={(!amend && stagedFiles.length === 0) || message.trim() === ''}
              className={`w-full py-3 rounded-md font-bold text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all 
                ${((!amend && stagedFiles.length === 0) || message.trim() === '') 
                  ? 'bg-[#1c2128] text-[#6e7681] border border-[#30363d] cursor-not-allowed' 
                  : 'bg-[#238636] text-white hover:bg-[#2ea043] shadow-[0_0_15px_rgba(35,134,54,0.4)] hover:shadow-[0_0_20px_rgba(46,160,67,0.5)]'}`}
             >
                <GitCommit size={14} /> 
                {amend ? 'Amend last commit' : 'Commit changes'}
             </button>
          </div>
        </>
      )}

    </aside>
  );
}

function StatusIcon({ status, size = 10 }: { status: string, size?: number }) {
  const base = "w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 border";
  if (status === 'untracked') return <div className={`${base} bg-[#1f2937] text-[#388bfd] border-[#388bfd]/30`}>U</div>;
  if (status === 'modified') return <div className={`${base} bg-[#251e0b] text-[#e3b341] border-[#e3b341]/30`}>M</div>;
  if (status === 'deleted') return <div className={`${base} bg-[#2a1b1b] text-[#f85149] border-[#f85149]/30`}>D</div>;
  if (status === 'added') return <div className={`${base} bg-[#1a231f] text-[#3fb950] border-[#3fb950]/30`}>A</div>;
  if (status === 'renamed') return <div className={`${base} bg-[#142331] text-[#388bfd] border-[#388bfd]/30`}>R</div>;
  if (status === 'conflicted') return <div className={`${base} bg-[#2a1b1b] text-[#f85149] border-[#f85149]/30`}><AlertTriangle size={9} /></div>;
  return <div className={`${base} bg-[#251e0b] text-[#e3b341] border-[#e3b341]/30`}>M</div>;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerQuery);
  while (idx !== -1) {
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
    parts.push(
      <span key={idx} className="bg-[#e3b341]/30 text-[#e3b341] rounded-sm px-[1px]">
        {text.slice(idx, idx + query.length)}
      </span>
    );
    lastIndex = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

function FileRow({ name, status, onAction, actionLabel, onClick, highlight = '' }: { name: string, status: string, onAction?: () => void, actionLabel?: string, onClick?: () => void, highlight?: string }) {
  const fileName = name.includes('/') ? name.substring(name.lastIndexOf('/') + 1) : name;
  const dirPath = name.includes('/') ? name.substring(0, name.lastIndexOf('/') + 1) : '';

  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between h-[26px] px-2 hover:bg-[#1f2937] rounded-md cursor-pointer group transition-all duration-150 mx-1`}
    >
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
           <StatusIcon status={status} />
           <div className="flex items-baseline text-[12px] font-mono min-w-0 overflow-hidden" title={name}>
              <span className="text-[#e6edf3] font-medium shrink-0">
                <HighlightText text={fileName} query={highlight} />
              </span>
              {dirPath && (
                <span className="text-[#6e7681] truncate ml-1.5 text-[11px] opacity-70 group-hover:opacity-100 transition-opacity">
                  <HighlightText text={dirPath} query={highlight} />
                </span>
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
