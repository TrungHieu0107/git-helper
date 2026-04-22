import { useState, useMemo, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, FileStatus } from "../../store";
import { AlertTriangle, ChevronsLeft } from "lucide-react";
import { stageFile, unstageFile, stageAll, unstageAll, commitRepo, selectFileDiff, loadConflictFile, getHeadCommitInfo, HeadCommitInfo, discardAllChanges } from "../../lib/repo";
import { toast } from "../../lib/toast";
import { confirm } from "../ui/ConfirmDialog";
import { CommitDetailPanel } from "../CommitDetailPanel";
import { FileContextMenu } from "../FileContextMenu";
import { RightPanelHeader } from "./RightPanelHeader";
import { RightPanelTabs } from "./RightPanelTabs";
import { FileRow } from "./FileRow";
import { FileTree } from "./FileTree";
import { CommitArea } from "./CommitArea";
import { TreeNode, ViewMode } from "./types";

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
  const { stagedFiles, unstagedFiles, selectedCommitDetail, isLoadingCommitDetail, cherryPickState, cherryPickConflictFiles, selectedConflictFile, activeRepoPath, commitMessage: message, setCommitMessage: setMessage, commitDescription: description, setCommitDescription: setDescription } = useAppStore();
  const [amend, setAmend] = useState(false);
  const [headCommitInfo, setHeadCommitInfo] = useState<HeadCommitInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('path');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [fileFilter, setFileFilter] = useState('');
  const [contextMenu, setContextMenu] = useState<{ path: string, isStaged: boolean, position: { x: number, y: number } } | null>(null);

  // Vertical Resizing State
  const [unstagedFlex, setUnstagedFlex] = useState(1);
  const [stagedFlex, setStagedFlex] = useState(1);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() => parseInt(localStorage.getItem('git_rightpanel_w') || '340', 10));

  useEffect(() => {
    document.documentElement.style.setProperty('--right-width', `${width}px`);
    localStorage.setItem('git_rightpanel_w', width.toString());
  }, [width]);

  useEffect(() => {
    if (amend && selectedCommitDetail) {
      setAmend(false);
      setHeadCommitInfo(null);
    }
  }, [selectedCommitDetail, amend]);

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

  const handleFileClick = async (path: string, isStaged: boolean) => {
    const files = isStaged ? stagedFiles : unstagedFiles;
    const file = files.find(f => f.path === path);
    
    if (file?.status === 'conflicted') {
      const context = await invoke<any>('get_conflict_context', { repoPath: activeRepoPath });
      if (context) {
        const fileInContext = context.files.find((f: any) => f.path === path);
        if (fileInContext?.status === 'DD') {
          toast.info("File was deleted on both sides. Use 'Discard' to remove it or 'Stage' to keep the deletion.");
          return;
        }
        
        await loadConflictFile(activeRepoPath!, path);
        useAppStore.getState().openConflictEditor(path, context.source);
        return;
      }
    }
    
    selectFileDiff(path, isStaged);
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

  const handleDiscardAll = async () => {
    const ok = await confirm({
      title: 'Discard All Changes',
      message: 'Are you sure you want to discard all unstaged changes? This action cannot be undone.',
      confirmLabel: 'Discard All',
      variant: 'danger'
    });
    
    if (ok) {
      await discardAllChanges();
    }
  };

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

  const handleFileContextMenu = (e: React.MouseEvent, path: string, isStaged: boolean) => {
    e.preventDefault();
    setContextMenu({
      path,
      isStaged,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const isViewingCommit = selectedCommitDetail || isLoadingCommitDetail;

  return (
    <>
      <aside 
        className={`flex flex-col bg-[#161b22] border-l border-[#30363d] shrink-0 text-[#8b949e] select-none h-full relative transition-all duration-300 ${isCollapsed ? 'w-12 items-center bg-[#0d1117]' : 'w-[var(--right-width)]'}`}
      >
        {!isCollapsed && (
          <div 
            onMouseDown={handleResize}
            className="absolute top-0 left-[-2px] w-[5px] h-full cursor-col-resize hover:bg-blue-500/40 transition-colors z-[101]"
          />
        )}

        {isCollapsed ? (
          <button onClick={() => setIsCollapsed(false)} className="p-2 hover:bg-white/5 rounded-md text-[#6e7681] hover:text-[#e6edf3] mt-3 transition-colors">
             <ChevronsLeft size={16} />
          </button>
        ) : isViewingCommit ? (
          <div className="flex flex-col h-full relative">
            <CommitDetailPanel onCollapse={() => setIsCollapsed(true)} />
          </div>
        ) : (
          <>
            <RightPanelHeader 
              onCollapse={() => setIsCollapsed(true)} 
              onDiscardAll={handleDiscardAll}
              hasChanges={stagedFiles.length > 0 || unstagedFiles.length > 0}
            />
            
            <RightPanelTabs 
              viewMode={viewMode} 
              setViewMode={setViewMode} 
              fileFilter={fileFilter} 
              setFileFilter={setFileFilter} 
            />

            <div ref={listContainerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
               {cherryPickState === 'conflict' && cherryPickConflictFiles.length > 0 && (
                 <div className="flex flex-col p-2 shrink-0">
                   <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2 px-1 gap-2">
                     <AlertTriangle size={12} /> Conflicts ({cherryPickConflictFiles.length})
                   </div>
                   <div className="flex flex-col bg-[#1c2128] rounded-lg border border-red-500/30 py-1 overflow-hidden">
                     {cherryPickConflictFiles.map((f, i) => (
                       <div 
                          key={i}
                          onClick={() => activeRepoPath && loadConflictFile(activeRepoPath, f)}
                          className={`flex items-center justify-between h-[26px] px-2 rounded-md cursor-pointer transition-all mx-1 ${selectedConflictFile === f ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/5 text-[#e6edf3]'}`}
                       >
                          <div className="flex items-center gap-2 overflow-hidden min-w-0">
                             <AlertTriangle size={12} className="text-red-500 shrink-0" />
                             <span className="text-[12px] font-mono truncate">{f}</span>
                          </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               <div className="flex flex-col p-2" style={{ flex: unstagedFlex, minHeight: 0 }}>
                    <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[#6e7681] mb-2 px-1 shrink-0 justify-between">
                       <div className="flex items-center gap-2">
                          <span className="text-yellow-500">UNSTAGED</span>
                          <span className="bg-[#0d1117] px-1.5 py-0.5 rounded-full border border-yellow-500/20 text-yellow-500/80">{filteredUnstaged.length}</span>
                       </div>
                       {unstagedFiles.length > 0 && (
                         <button onClick={stageAll} className="text-green-500 hover:bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20 transition-all font-bold uppercase tracking-wide text-[9px]">
                           Stage All
                         </button>
                       )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar-hidden flex flex-col bg-[#0d1117] rounded-lg border border-[#30363d] py-1">
                      {filteredUnstaged.length > 0 ? (
                       viewMode === 'path' ? (
                         filteredUnstaged.map((f, i) => (
                              <FileRow 
                                key={i} 
                                name={f.path} 
                                status={f.status} 
                                onAction={() => stageFile(f.path)}
                                actionLabel="Stage"
                                onClick={() => handleFileClick(f.path, false)}
                                onContextMenu={(e) => handleFileContextMenu(e, f.path, false)}
                                highlight={fileFilter}
                                isCompact={width < 450}
                              />
                         ))
                       ) : (
                         <FileTree 
                           node={unstagedTree} 
                           onAction={stageFile} 
                           actionLabel="Stage" 
                           onFileClick={(p) => handleFileClick(p, false)}
                           expandedFolders={expandedFolders}
                           toggleFolder={toggleFolder}
                         />
                       )
                     ) : (
                       <div className="text-[11px] italic px-6 py-4 opacity-40 text-center">No modified files</div>
                     )}
                   </div>
               </div>

                <div 
                  onMouseDown={startVerticalResizing}
                  className="h-2 bg-[#0d1117] border-y border-[#30363d] w-full cursor-row-resize hover:bg-blue-500/20 transition-all shrink-0 flex items-center justify-center group"
                >
                   <div className="w-8 h-1 bg-[#30363d] rounded-full group-hover:bg-blue-500 transition-colors" />
                </div>

               <div className="flex flex-col p-2" style={{ flex: stagedFlex, minHeight: 0 }}>
                  <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[#6e7681] mb-2 px-1 shrink-0 justify-between">
                     <div className="flex items-center gap-2">
                        <span className="text-green-500">STAGED</span>
                        <span className="bg-[#0d1117] px-1.5 py-0.5 rounded-full border border-green-500/20 text-green-500/80">{filteredStaged.length}</span>
                     </div>
                     {stagedFiles.length > 0 && (
                       <button onClick={unstageAll} className="text-red-500 hover:bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 transition-all font-bold uppercase tracking-wide text-[9px]">
                         Unstage All
                       </button>
                     )}
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar-hidden flex flex-col bg-[#0d1117] rounded-lg border border-[#30363d] py-1">
                    {filteredStaged.length > 0 ? (
                      viewMode === 'path' ? (
                        filteredStaged.map((f, i) => (
                            <FileRow 
                              key={i} 
                              name={f.path} 
                              status={f.status} 
                              onAction={() => unstageFile(f.path)}
                              actionLabel="Unstage"
                              onClick={() => handleFileClick(f.path, true)}
                              onContextMenu={(e) => handleFileContextMenu(e, f.path, true)}
                              highlight={fileFilter}
                              isCompact={width < 450}
                            />
                        ))
                      ) : (
                        <FileTree 
                          node={stagedTree} 
                          onAction={unstageFile} 
                          actionLabel="Unstage" 
                          onFileClick={(p) => handleFileClick(p, true)}
                          expandedFolders={expandedFolders}
                          toggleFolder={toggleFolder}
                        />
                      )
                    ) : (
                      <div className="text-[11px] italic px-6 py-4 opacity-40 text-center">No files staged</div>
                    )}
                  </div>
               </div>
            </div>

            <CommitArea 
              message={message}
              setMessage={setMessage}
              description={description}
              setDescription={setDescription}
              amend={amend}
              setAmend={handleAmendToggle}
              headCommitInfo={headCommitInfo}
              onCommit={handleCommit}
              stagedCount={stagedFiles.length}
            />
          </>
        )}
      </aside>
      {contextMenu && (
        <FileContextMenu 
          path={contextMenu.path}
          isStaged={contextMenu.isStaged}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
