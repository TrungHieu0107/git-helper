import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, FileClock, History, User, Calendar, FolderOpen, Loader2, ChevronRight, Clock } from 'lucide-react';
import { getFileLog, FileCommit } from '../lib/repo';
import { MainDiffView } from './MainDiffView';
import { useAppStore } from '../store';
import { open } from '@tauri-apps/plugin-dialog';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Separator } from './ui/Separator';

export function FileHistoryModal() {
  const { showFileHistoryModal, fileHistoryPath, setFileHistory, activeRepoPath } = useAppStore();
  const [commits, setCommits] = useState<FileCommit[]>([]);
  const [selectedOid, setSelectedOid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pathInput, setPathInput] = useState(fileHistoryPath || '');

  useEffect(() => {
    if (showFileHistoryModal && fileHistoryPath) {
      setPathInput(fileHistoryPath);
      loadHistory(fileHistoryPath);
    }
  }, [showFileHistoryModal, fileHistoryPath]);

  const loadHistory = async (rawPath: string) => {
    if (!rawPath) return;
    
    // Normalize absolute path to relative if it starts with activeRepoPath
    let path = rawPath;
    if (activeRepoPath && path.startsWith(activeRepoPath)) {
      path = path.substring(activeRepoPath.length).replace(/^[\\\/]/, '').replace(/\\/g, '/');
      setPathInput(path);
    }

    setIsLoading(true);
    try {
      const { commits: logCommits } = await getFileLog(path);
      setCommits(logCommits);
      if (logCommits.length > 0) {
        setSelectedOid(logCommits[0].oid);
      } else {
        setSelectedOid(null);
      }
    } catch (e) {
      console.error(String(e));
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

  const getAvatarColor = (email: string) => {
    let h = 0;
    for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h) % 360}, 60%, 50%)`;
  };

  if (!showFileHistoryModal) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setFileHistory(null)}
          className="absolute inset-0 bg-background/40 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-background backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl w-full h-full max-w-[1400px] max-h-[900px] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent shrink-0">
            <div className="flex items-center gap-6 flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileClock size={22} />
                </div>
                <h2 className="text-[18px] font-bold text-foreground tracking-tight whitespace-nowrap">File History</h2>
              </div>
              
              <Separator orientation="vertical" className="h-8 bg-border/30" />

              <div className="flex-1 max-w-2xl flex items-center gap-3 bg-secondary/30 border border-border/50 px-4 py-2 rounded-xl focus-within:bg-background focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300 group">
                <Search size={16} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadHistory(pathInput)}
                  className="bg-transparent border-none outline-none text-[14px] text-foreground flex-1 placeholder:text-muted-foreground/30 font-medium"
                  placeholder="Search file path or history..."
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleBrowse}
                  className="h-8 w-8 text-muted-foreground/60 hover:text-foreground"
                >
                  <FolderOpen size={16} />
                </Button>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setFileHistory(null)}
              className="h-10 w-10 text-muted-foreground/40 hover:text-foreground"
            >
              <X size={24} />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex min-h-0">
            {/* Left Panel: Commits */}
            <div className="w-[380px] border-r border-border/30 flex flex-col bg-secondary/10 shrink-0">
              <div className="px-6 py-3 border-b border-border/20 bg-secondary/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                  <Clock size={14} />
                  <span>Timeline</span>
                </div>
                <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-bold bg-secondary/40">
                  {commits.length} COMMITS
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <span className="text-[13px] font-bold text-muted-foreground tracking-wide uppercase">Indexing History...</span>
                  </div>
                ) : commits.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-6 px-8 text-center">
                    <div className="p-6 bg-secondary/30 rounded-3xl text-muted-foreground/20 shadow-inner">
                      <History size={64} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-[16px] font-bold text-foreground/80">No history found</h3>
                      <p className="text-[12px] text-muted-foreground/60 leading-relaxed font-medium">
                        This file might not have been committed yet, or the path is incorrect.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => loadHistory(pathInput)} className="font-bold">
                      Retry Search
                    </Button>
                  </div>
                ) : (
                  commits.map((c, idx) => (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      key={c.oid}
                      onClick={() => setSelectedOid(c.oid)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl transition-all duration-300 border flex flex-col gap-3 group relative",
                        selectedOid === c.oid 
                          ? "bg-primary/5 border-primary ring-4 ring-primary/5 shadow-lg shadow-primary/5" 
                          : "bg-transparent border-transparent hover:bg-secondary/40 hover:border-border/30"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                         <Badge variant="secondary" className={cn(
                           "px-2 py-0.5 text-[10px] font-bold font-mono transition-colors",
                           selectedOid === c.oid ? "bg-primary/20 text-primary" : "bg-secondary/40 text-muted-foreground group-hover:text-foreground"
                         )}>
                           {c.short_oid}
                         </Badge>
                         <span className="text-[10px] text-muted-foreground/40 font-bold tracking-tighter group-hover:text-muted-foreground transition-colors">
                            {new Date(c.timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                         </span>
                      </div>
                      
                      <span className={cn(
                        "text-[14px] leading-snug line-clamp-2 font-medium transition-colors",
                        selectedOid === c.oid ? "text-foreground" : "text-foreground/60 group-hover:text-foreground/80"
                      )}>
                        {c.message}
                      </span>

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-black/20"
                            style={{ backgroundColor: getAvatarColor(c.author_email) }}
                          >
                            {c.author_name[0].toUpperCase()}
                          </div>
                          <span className="text-[12px] text-muted-foreground/60 truncate font-bold group-hover:text-muted-foreground/80 transition-colors">{c.author_name}</span>
                        </div>
                        {selectedOid === c.oid && (
                          <ChevronRight size={16} className="text-primary animate-pulse" />
                        )}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel: Diff */}
            <div className="flex-1 flex flex-col bg-background/20 min-w-0 relative">
              {selectedOid ? (
                <MainDiffView 
                  path={pathInput}
                  commitOid={selectedOid}
                  hideClose={true}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/20 gap-8">
                  <div className="w-[450px] aspect-video border-2 border-dashed border-border/30 rounded-[32px] flex flex-col items-center justify-center p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 bg-secondary/5">
                    <div className="p-6 bg-secondary/20 rounded-full mb-6 text-muted-foreground/10 shadow-inner">
                      <History size={64} />
                    </div>
                    <h4 className="text-[20px] font-bold text-muted-foreground/40 mb-3 tracking-tight">Historical Context</h4>
                    <p className="text-[13px] leading-relaxed max-w-[300px] text-muted-foreground/30 font-medium">
                      Select a snapshot from the timeline to analyze the specific evolution of this file.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer info */}
          {selectedCommit && (
            <div className="h-12 px-6 border-t border-border/30 bg-secondary/10 flex items-center justify-between text-[11px] font-bold text-muted-foreground/60 shrink-0">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2.5">
                  <User size={14} className="text-primary/60" />
                  <span>
                    <span className="text-foreground/60">{selectedCommit.author_name}</span>
                    <span className="opacity-40 font-medium px-2">/</span>
                    <span className="opacity-40">{selectedCommit.author_email}</span>
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4 bg-border/20" />
                <div className="flex items-center gap-2.5">
                  <Calendar size={14} className="text-primary/60" />
                  <span className="font-mono text-[10px] tracking-widest">{new Date(selectedCommit.timestamp * 1000).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-[10px] tracking-tight">
                <span className="text-muted-foreground/30 font-bold">OID</span>
                <Badge variant="secondary" className="px-2 py-0.5 font-bold font-mono opacity-60">{selectedCommit.oid}</Badge>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
