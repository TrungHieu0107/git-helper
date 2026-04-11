import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, FileClock, History, User, Calendar, FolderOpen, AlertCircle, Loader2 } from 'lucide-react';
import { getFileLog, FileCommit } from '../lib/repo';
import { MainDiffView } from './MainDiffView';
import { useAppStore } from '../store';
import { open } from '@tauri-apps/plugin-dialog';

export function FileHistoryModal() {
  const { showFileHistoryModal, fileHistoryPath, setFileHistory, activeRepoPath } = useAppStore();
  const [commits, setCommits] = useState<FileCommit[]>([]);
  const [selectedOid, setSelectedOid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pathInput, setPathInput] = useState(fileHistoryPath || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showFileHistoryModal && fileHistoryPath) {
      setPathInput(fileHistoryPath);
      loadHistory(fileHistoryPath);
    }
  }, [showFileHistoryModal, fileHistoryPath]);

  const loadHistory = async (path: string) => {
    if (!path) return;
    setIsLoading(true);
    setError(null);
    try {
      const log = await getFileLog(path);
      setCommits(log);
      if (log.length > 0) {
        setSelectedOid(log[0].oid);
      } else {
        setSelectedOid(null);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowse = async () => {
    if (!activeRepoPath) return;
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        defaultPath: activeRepoPath,
        filters: [{
           name: 'All Files',
           extensions: ['*']
        }]
      });
      if (selected && typeof selected === 'string') {
        const relativePath = selected.startsWith(activeRepoPath) 
           ? selected.substring(activeRepoPath.length).replace(/^[\\\/]/, '') 
           : selected;
        setPathInput(relativePath);
        loadHistory(relativePath);
      }
    } catch (e) {
      console.error('Browse failed:', e);
    }
  };

  const selectedCommit = useMemo(() => 
    commits.find(c => c.oid === selectedOid), [commits, selectedOid]
  );

  if (!showFileHistoryModal) return null;

  const getAvatarColor = (email: string) => {
    let h = 0;
    for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h) % 360}, 60%, 50%)`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full h-full max-w-[1400px] max-h-[900px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#30363d] bg-[#161b22] shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
            <div className="p-2 bg-[#1f2937] rounded-lg text-[#388bfd]">
              <FileClock size={20} />
            </div>
            <div className="flex-1 max-w-2xl flex items-center gap-2 bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded-lg focus-within:border-[#388bfd] focus-within:ring-1 focus-within:ring-[#388bfd] transition-all">
              <Search size={14} className="text-[#8b949e]" />
              <input 
                type="text" 
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadHistory(pathInput)}
                className="bg-transparent border-none outline-none text-[13px] text-[#e6edf3] flex-1 placeholder-[#484f58]"
                placeholder="Search file path..."
              />
              <button 
                onClick={handleBrowse}
                className="p-1 hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded-md transition-colors"
                title="Browse file"
              >
                <FolderOpen size={14} />
              </button>
            </div>
          </div>
          <button 
            onClick={() => setFileHistory(null)}
            className="p-2 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel: Commits */}
          <div className="w-[350px] border-r border-[#30363d] flex flex-col bg-[#0d1117] shrink-0">
            <div className="px-4 py-2 border-b border-[#30363d] bg-[#161b22]/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                <History size={12} />
                Commits
              </div>
              <span className="text-[10px] text-[#484f58] font-mono px-1.5 py-0.5 bg-[#21262d] rounded">
                {commits.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 opacity-50">
                  <Loader2 size={32} className="animate-spin text-[#388bfd]" />
                  <span className="text-xs font-medium text-[#8b949e]">Loading history...</span>
                </div>
              ) : commits.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="p-4 bg-[#1f2937]/50 rounded-full text-[#484f58]">
                    <History size={40} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#e6edf3] mb-1">No commits found</h3>
                    <p className="text-[11px] text-[#8b949e] leading-relaxed">
                      This file might never have been committed, or the path is incorrect.
                      <br />
                      <span className="italic opacity-60 mt-2 block">Tip: History may be incomplete if the file was renamed.</span>
                    </p>
                  </div>
                </div>
              ) : (
                commits.map((c) => (
                  <button
                    key={c.oid}
                    onClick={() => setSelectedOid(c.oid)}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex flex-col gap-2 group
                      ${selectedOid === c.oid 
                        ? 'bg-[#121d2f] border-[#388bfd]/50 shadow-[0_0_15px_rgba(56,139,253,0.05)]' 
                        : 'bg-transparent border-transparent hover:bg-[#1f2937]/40 hover:border-white/5'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                       <span className="text-[11px] font-mono text-[#388bfd] font-semibold">{c.short_oid}</span>
                       <span className="text-[10px] text-[#484f58] font-medium">
                          {new Date(c.timestamp * 1000).toLocaleDateString()}
                       </span>
                    </div>
                    <span className={`text-[13px] leading-snug line-clamp-2 ${selectedOid === c.oid ? 'text-[#e6edf3]' : 'text-[#8b949e] group-hover:text-[#c9d1d9]'}`}>
                      {c.message}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: getAvatarColor(c.author_email) }}
                      >
                        {c.author_name[0].toUpperCase()}
                      </div>
                      <span className="text-[11px] text-[#8b949e] truncate font-medium">{c.author_name}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Diff */}
          <div className="flex-1 flex flex-col bg-[#0d1117] min-w-0">
            {selectedOid ? (
              <MainDiffView 
                path={pathInput}
                commitOid={selectedOid}
                hideClose={true}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#484f58] gap-4 bg-[#0d1117]">
                <div className="w-[400px] h-[300px] border-2 border-dashed border-[#30363d] rounded-2xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="p-4 bg-[#1f2937]/30 rounded-full mb-4">
                    <History size={48} />
                  </div>
                  <h4 className="text-[#8b949e] font-semibold mb-2">Historical Diff View</h4>
                  <p className="text-xs leading-relaxed max-w-[280px]">
                    Select a commit from the left list to view what changed in this version.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        {selectedCommit && (
          <div className="h-10 px-4 border-t border-[#30363d] bg-[#161b22] flex items-center justify-between text-[11px] text-[#8b949e] shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <User size={12} />
                <span><span className="text-[#c9d1d9]">{selectedCommit.author_name}</span> &lt;{selectedCommit.author_email}&gt;</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={12} />
                <span>{new Date(selectedCommit.timestamp * 1000).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-[#484f58]">OID:</span>
              <span className="text-[#c9d1d9]">{selectedCommit.oid}</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
