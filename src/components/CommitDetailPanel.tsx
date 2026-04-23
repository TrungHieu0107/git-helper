import { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppStore, CommitDetail } from "../store";
import { selectFileDiff } from "../services/git/repoService";
import { FileContextMenu } from "./FileContextMenu";
import { motion, AnimatePresence } from "framer-motion";
import { 
  GitCommit, 
  Clock, 
  GitBranch, 
  Edit2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Folder, 
  ChevronRight, 
  ChevronsRight,
  ExternalLink,
  MessageSquare,
  FileText
} from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";
import { Spinner } from "./ui/Loading";
import { cn } from "../lib/utils";

interface CommitDetailPanelProps {
  onCollapse?: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) 
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function statusIcon(s: string) {
  switch (s) {
    case 'added': return <Plus size={12} className="text-dracula-green" />; 
    case 'deleted': return <Minus size={12} className="text-dracula-red" />; 
    case 'renamed': return <ArrowRight size={12} className="text-dracula-cyan" />; 
    default: return <Edit2 size={12} className="text-dracula-yellow" />; 
  }
}

function statusCount(files: CommitDetail['files']) {
  const counts = { modified: 0, added: 0, deleted: 0, renamed: 0 };
  files.forEach((f: { status: string }) => {
    if (f.status === 'added') counts.added++;
    else if (f.status === 'deleted') counts.deleted++;
    else if (f.status === 'renamed') counts.renamed++;
    else counts.modified++;
  });
  return counts;
}


interface TreeNode {
  name: string;
  fullPath: string;
  status?: string;
  children: Map<string, TreeNode>;
  isFolder: boolean;
}

function buildTree(files: CommitDetail['files']): TreeNode {
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

export function CommitDetailPanel({ onCollapse }: CommitDetailPanelProps = {}) {
  const detail = useAppStore(s => s.selectedCommitDetail);
  const loading = useAppStore(s => s.isLoadingCommitDetail);
  const [viewMode, setViewMode] = useState<'path' | 'tree'>('path');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [contextMenu, setContextMenu] = useState<{ 
    path: string; 
    x: number; 
    y: number; 
    commitOid?: string;
    shortOid?: string;
    commitMessage?: string;
  } | null>(null);

  const treeData = useMemo(() => {
    if (!detail) return null;
    return buildTree(detail.files);
  }, [detail]);

  const allFolderPaths = useMemo(() => {
    if (!treeData) return [];
    const paths: string[] = [];
    const traverse = (node: TreeNode) => {
      if (node.isFolder) paths.push(node.fullPath);
      node.children.forEach(traverse);
    };
    traverse(treeData);
    return paths;
  }, [treeData]);
  
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: detail?.files.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  if (!detail && !loading) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background/20 backdrop-blur-md z-20">
        <Spinner label="Analysing commit..." />
      </div>
    );
  }

  if (!detail) return null;

  const counts = statusCount(detail.files);

  const toggleFolder = (path: string) => {
    const newSet = new Set(expandedFolders);
    if (newSet.has(path)) newSet.delete(path);
    else newSet.add(path);
    setExpandedFolders(newSet);
  };

  const renderTree = (node: TreeNode, depth: number = 0) => {
    return Array.from(node.children.values())
      .sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map(child => {
        const isExpanded = expandedFolders.has(child.fullPath);
        return (
          <div key={child.fullPath}>
            <div 
              className="flex items-center gap-2.5 py-1.5 px-2.5 hover:bg-secondary/40 rounded-xl cursor-pointer group transition-all duration-200 border border-transparent hover:border-border/40"
              style={{ paddingLeft: `${depth * 14 + 10}px` }}
              onClick={() => child.isFolder ? toggleFolder(child.fullPath) : selectFileDiff(child.fullPath, false, detail.oid)}
              onContextMenu={(e) => {
                if (!child.isFolder) {
                  e.preventDefault();
                  setContextMenu({ 
                    path: child.fullPath, 
                    x: e.clientX, 
                    y: e.clientY,
                    commitOid: detail.oid,
                    shortOid: detail.short_oid,
                    commitMessage: detail.message
                  });
                }
              }}
            >
              {child.isFolder ? (
                <>
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="text-muted-foreground/40"
                  >
                    <ChevronRight size={14} />
                  </motion.div>
                  <Folder size={14} className="text-primary/60" />
                </>
              ) : (
                <div className="w-4 h-4 flex items-center justify-center">
                  {statusIcon(child.status!)}
                </div>
              )}
              <span className={cn(
                "text-[13px] truncate font-mono tracking-tight transition-colors",
                child.isFolder ? 'text-muted-foreground font-bold uppercase tracking-widest text-[10px]' : 'text-foreground/90 group-hover:text-foreground'
              )}>
                {child.name}
              </span>
            </div>
            <AnimatePresence>
              {child.isFolder && isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  {renderTree(child, depth + 1)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      });
  };

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="flex flex-col h-full bg-background/30 backdrop-blur-sm border-l border-border relative overflow-hidden"
    >
      {/* Header */}
      <header className="h-11 border-b border-border/40 flex items-center px-4 justify-between bg-background backdrop-blur-xl z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          {onCollapse && (
            <Button variant="ghost" size="icon" onClick={onCollapse} className="h-8 w-8 text-muted-foreground/60 hover:text-foreground rounded-xl">
              <ChevronsRight size={16} />
            </Button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <GitCommit size={16} className="text-primary" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Commit Detail
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-6 px-2 font-mono text-[11px] bg-secondary/50 border-border/30 text-primary">
            {detail.short_oid}
          </Badge>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-background/40">

        {/* Commit Info Block */}
        <div className="px-6 py-5 border-b border-border/20 shrink-0">
          {/* Author & Metadata */}
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-background text-lg font-bold shadow-2xl border border-white/10"
              style={{ background: `linear-gradient(135deg, #bd93f9, #ff79c6)` }}
            >
              {(detail.author?.[0] || '?').toUpperCase()}
            </div>
            <div className="flex flex-col gap-1.5 min-w-0 pt-0.5">
              <span className="text-base text-foreground font-bold truncate tracking-tight">{detail.author || 'Unknown Author'}</span>
              <div className="flex items-center gap-2.5 text-[12px] text-muted-foreground font-semibold">
                <Clock size={14} className="opacity-40" />
                <span>{formatDate(detail.timestamp)}</span>
              </div>
            </div>
          </div>

          {/* Message Card */}
          <Card className="bg-secondary/10 border-border/20 p-3.5 mb-4 shadow-none rounded-2xl relative group/msg">
            <div className="absolute -top-3 -left-2 p-1.5 bg-background border border-border/40 rounded-xl shadow-lg opacity-0 group-hover/msg:opacity-100 transition-opacity">
              <MessageSquare size={12} className="text-primary" />
            </div>
            <p className="text-[14px] text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium tracking-tight">
              {detail.message || 'No commit message provided.'}
            </p>
          </Card>

          {/* Parents & Actions */}
          <div className="flex flex-wrap items-center gap-4">
            {detail.parent_short_oids && detail.parent_short_oids.length > 0 && (
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-secondary/30 border border-border/40 backdrop-blur-md">
                <GitBranch size={14} className="text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">Parents</span>
                <div className="flex items-center gap-1.5">
                  {detail.parent_short_oids.map((p: string, i: number) => (
                    <Badge key={i} variant="outline" className="h-5 px-1.5 text-[11px] font-mono border-border/40 bg-background/40">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Button 
              size="xs" 
              className="h-8 px-4 text-[11px] font-bold uppercase tracking-widest ml-auto shadow-lg rounded-xl hover:scale-105 transition-transform"
              onClick={() => useAppStore.setState({ selectedRowIndex: 0, selectedCommitDetail: null })}
            >
              <ExternalLink size={12} className="mr-2" />
              Full View
            </Button>
          </div>
        </div>

        {/* Changes Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-3 sticky top-0 bg-background/40 backdrop-blur-xl z-10 border-b border-border/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-secondary/50 rounded-lg">
                  <FileText size={14} className="text-muted-foreground/60" />
                </div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Changes ({detail.files?.length ?? 0})
                </h3>
              </div>
              <div className="flex items-center bg-secondary/30 rounded-xl border border-border/40 p-1 backdrop-blur-md">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setViewMode('path')}
                  className={cn("h-7 px-4 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all", viewMode === 'path' && "bg-background shadow-md text-primary")}
                >
                  List
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setViewMode('tree')}
                  className={cn("h-7 px-4 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all", viewMode === 'tree' && "bg-background shadow-md text-primary")}
                >
                  Tree
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {Object.entries(counts).map(([key, count]) => {
                  if (count === 0) return null;
                  const colors: Record<string, string> = { 
                    added: "bg-dracula-green", 
                    deleted: "bg-dracula-red", 
                    renamed: "bg-dracula-cyan", 
                    modified: "bg-dracula-orange" 
                  };
                  return (
                    <div key={key} className="flex items-center gap-2 group/stat">
                      <div className={cn("w-2 h-2 rounded-full transition-transform group-hover/stat:scale-125", colors[key])} />
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest group-hover:text-foreground transition-colors">
                        {count} {key}
                      </span>
                    </div>
                  );
              })}
              
              <div className="ml-auto">
                {viewMode === 'tree' && (
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    className="h-7 text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary rounded-lg"
                    onClick={() => {
                      if (expandedFolders.size > 1) {
                        setExpandedFolders(new Set(['']));
                      } else {
                        setExpandedFolders(new Set(allFolderPaths));
                      }
                    }}
                  >
                    {expandedFolders.size > 1 ? 'Collapse All' : 'Expand All'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-4 overflow-hidden flex flex-col">
            {viewMode === 'path' ? (
              <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar">
                <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const f = detail.files[virtualRow.index];
                    return (
                      <div 
                        key={virtualRow.index}
                        onClick={() => selectFileDiff(f.path, false, detail.oid)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ 
                            path: f.path, 
                            x: e.clientX, 
                            y: e.clientY,
                            commitOid: detail.oid,
                            shortOid: detail.short_oid,
                            commitMessage: detail.message
                          });
                        }}
                        className="flex items-center gap-3 py-1.5 px-3 hover:bg-secondary/30 rounded-xl cursor-pointer group absolute top-0 left-0 w-full border border-transparent hover:border-border/40 shadow-sm"
                        style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <div className="shrink-0 w-5 h-5 flex items-center justify-center bg-background/40 rounded-lg group-hover:bg-background transition-colors">
                          {statusIcon(f.status)}
                        </div>
                        <div className="flex text-[13px] font-mono min-w-0 overflow-hidden tracking-tight" title={f.path}>
                          {f.path.includes('/') ? (
                              <>
                                <span className="truncate shrink text-muted-foreground/50">{f.path.substring(0, f.path.lastIndexOf('/') + 1)}</span>
                                <span className="shrink-0 text-foreground/90 font-bold group-hover:text-primary transition-colors">{f.path.substring(f.path.lastIndexOf('/') + 1)}</span>
                              </>
                          ) : (
                              <span className="truncate shrink-0 text-foreground/90 font-bold group-hover:text-primary transition-colors">{f.path}</span>
                          )}
                        </div>
                        <div className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity">
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {treeData && (
                  <div className="flex flex-col">
                    {renderTree(treeData)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {contextMenu && (
          <FileContextMenu 
            path={contextMenu.path}
            isStaged={false}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            commitOid={contextMenu.commitOid}
            shortOid={contextMenu.shortOid}
            commitMessage={contextMenu.commitMessage}
            onClose={() => setContextMenu(null)}
            hideGitActions={true}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
