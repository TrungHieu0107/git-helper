import { useState, useMemo } from "react";
import { useAppStore, CommitDetail } from "../store";
import { selectFileDiff } from "../lib/repo";
import { FileContextMenu } from "./FileContextMenu";
import { 
  GitCommit, 
  Clock, 
  GitBranch, 
  Edit2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Eye, 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  ChevronsRight 
} from "lucide-react";

interface CommitDetailPanelProps {
  onCollapse?: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) 
    + ' @ ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function statusIcon(s: string) {
  switch (s) {
    case 'added': return <Plus size={12} className="text-[#3fb950]" />;
    case 'deleted': return <Minus size={12} className="text-[#f85149]" />;
    case 'renamed': return <ArrowRight size={12} className="text-[#58a6ff]" />;
    default: return <Edit2 size={12} className="text-[#d29922]" />;
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

function avatarHue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
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

  if (!detail && !loading) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#5c6370] gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Loading commit...</span>
      </div>
    );
  }

  if (!detail) return null;

  const counts = statusCount(detail.files);
  const hue = avatarHue(detail.author);

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
              className="flex items-center gap-1.5 py-1 px-2 hover:bg-[#2c313a] rounded cursor-pointer group"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
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
                  {isExpanded ? <ChevronDown size={12} className="text-[#8b949e]" /> : <ChevronRight size={12} className="text-[#8b949e]" />}
                  <Folder size={12} className="text-[#58a6ff] opacity-80" />
                </>
              ) : (
                <>
                  {statusIcon(child.status!)}
                </>
              )}
              <span className={`text-[12px] truncate font-mono ${child.isFolder ? 'text-[#8b949e]' : 'text-[#e6edf3]'}`}>
                {child.name}
              </span>
            </div>
            {child.isFolder && isExpanded && renderTree(child, depth + 1)}
          </div>
        );
      });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-[36px] border-b border-[#181a1f] flex items-center px-3 justify-between bg-[#21252b] z-10 shrink-0">
        <div className="flex items-center gap-2">
          {onCollapse && (
            <button onClick={onCollapse} className="p-1 hover:bg-[#2c313a] rounded text-[#a0a6b1] hover:text-white transition-colors" title="Collapse Right Panel">
              <ChevronsRight size={16} />
            </button>
          )}
          <GitCommit size={14} className="text-blue-400 ml-1" />
          <span className="text-[11px] uppercase tracking-wider text-[#d7dae0] font-semibold">
            {detail.files.length} file changes in this commit
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              useAppStore.setState({ selectedRowIndex: 0, selectedCommitDetail: null });
            }}
            className="text-[10px] bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40 px-2 py-0.5 rounded hover:bg-[#238636]/30 transition-colors font-medium"
          >
            View Changes
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">

        {/* Commit Info Block */}
        <div className="px-4 py-3 border-b border-[#181a1f] shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-[#8b949e] font-mono">commit:</span>
            <span className="text-[13px] text-[#58a6ff] font-mono font-semibold">{detail.short_oid}</span>
          </div>

          {/* Message */}
          <div className="bg-[#1e2227] border border-[#30363d] rounded px-3 py-2 mb-3">
            <p className="text-[13px] text-[#e6edf3] leading-relaxed whitespace-pre-wrap">{detail.message}</p>
          </div>

          {/* Author & Metadata */}
          <div className="flex items-start gap-3">
            <div 
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ background: `linear-gradient(135deg, hsl(${hue}, 60%, 35%), hsl(${hue + 40}, 50%, 25%))` }}
            >
              {detail.author[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[13px] text-[#e6edf3] font-semibold truncate">{detail.author}</span>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e]">
                <Clock size={10} />
                <span>authored {formatDate(detail.timestamp)}</span>
              </div>
              {detail.parent_short_oids.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e] mt-0.5">
                  <GitBranch size={10} />
                  <span>parent: </span>
                  {detail.parent_short_oids.map((p: string, i: number) => (
                    <span key={i} className="text-[#58a6ff] font-mono">{p}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Changes Section */}
        <div className="px-4 py-3 flex-1 bg-[#0d1117]">
          {/* Stats */}
          <div className="flex items-center gap-3 mb-3 text-[11px] font-semibold">
            {Object.entries(counts).map(([key, count]) => {
                if (count === 0) return null;
                const colors = { modified: 'text-[#d29922]', added: 'text-[#3fb950]', deleted: 'text-[#f85149]', renamed: 'text-[#58a6ff]' };
                const Icons = { modified: Edit2, added: Plus, deleted: Minus, renamed: ArrowRight };
                const Icon = Icons[key as keyof typeof Icons];
                return (
                    <span key={key} className={`flex items-center gap-1 ${colors[key as keyof typeof colors]}`}>
                        <Icon size={10} /> {count} {key}
                    </span>
                );
            })}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-3 mb-2 border-b border-[#30363d] pb-1.5">
            <button 
              onClick={() => setViewMode('path')}
              className={`text-[11px] font-semibold pb-1 transition-all ${viewMode === 'path' ? 'text-[#58a6ff] border-b-2 border-[#58a6ff]' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
              Path
            </button>
            <button 
              onClick={() => setViewMode('tree')}
              className={`text-[11px] font-semibold pb-1 transition-all ${viewMode === 'tree' ? 'text-[#58a6ff] border-b-2 border-[#58a6ff]' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
              Tree
            </button>
            <div className="flex-1" />
            {viewMode === 'tree' ? (
              <button 
                onClick={() => {
                  if (expandedFolders.size > 1) {
                    setExpandedFolders(new Set(['']));
                  } else {
                    setExpandedFolders(new Set(allFolderPaths));
                  }
                }}
                className="flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#c9d1d9]"
              >
                {expandedFolders.size > 1 ? 'Collapse All' : 'Expand All'}
              </button>
            ) : (
              <button className="flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#c9d1d9]">
                <Eye size={10} /> View all files
              </button>
            )}
          </div>

          {/* File List / Tree */}
          <div className="flex flex-col">
            {viewMode === 'path' ? (
              detail.files.map((f: { path: string; status: string }, i: number) => (
                <div 
                  key={i}
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
                  className="flex items-center gap-2 py-1.5 px-2 hover:bg-[#2c313a] rounded cursor-pointer group"
                >
                  {statusIcon(f.status)}
                  <div className="flex text-[12px] text-[#e6edf3] font-mono min-w-0 overflow-hidden" title={f.path}>
                    {f.path.includes('/') ? (
                        <>
                          <span className="truncate shrink text-[#8b949e]">{f.path.substring(0, f.path.lastIndexOf('/') + 1)}</span>
                          <span className="shrink-0">{f.path.substring(f.path.lastIndexOf('/') + 1)}</span>
                        </>
                    ) : (
                        <span className="truncate shrink-0">{f.path}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
                treeData && renderTree(treeData)
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}
