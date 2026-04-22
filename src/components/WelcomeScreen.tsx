import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, GitBranch, X, Clock, Monitor, Plus, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, RecentRepo } from '../store';
import { loadRepo, switchTab, closeRepoTab, autoFetch } from '../services/git/repoService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function WelcomeScreen() {
  const [recent, setRecent] = useState<RecentRepo[]>([]);
  const repos = useAppStore(state => state.repos);

  useEffect(() => {
    fetchRecent();
  }, []);

  const fetchRecent = async () => {
    try {
      const repos = await invoke<RecentRepo[]>('get_recent_repos');
      setRecent(repos);
    } catch (e) {
      console.error("Failed to load recent repos", e);
    }
  };

  const pickRepo = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Open Repository' });
      if (!selected) return;
      await loadRepo(selected as string);
      autoFetch(selected as string);
    } catch (e) {
      console.error(e);
    }
  };

  const removeRecent = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      await invoke('remove_recent_repo', { path });
      fetchRecent();
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
  };

  return (
    <div className="flex-1 flex flex-col items-center py-16 bg-background h-full text-foreground overflow-y-auto custom-scrollbar">
      <div className="w-[640px] flex flex-col gap-8">
        
        {/* Header Hero */}
        <Card className="overflow-hidden border-none shadow-2xl bg-gradient-to-br from-card to-background/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-primary),transparent_50%)] opacity-10" />
          <CardHeader className="flex-row items-center gap-6 p-8 relative">
            <motion.div 
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40"
            >
              <GitBranch size={36} className="text-primary-foreground" />
            </motion.div>
            <div className="flex-1">
              <CardTitle className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                GitKit <span className="text-primary">Pro</span>
              </CardTitle>
              <CardDescription className="text-base font-medium opacity-60">
                The next-generation Git workflow for professionals.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-8 pt-0 flex gap-4 relative">
             <Button 
                onClick={pickRepo}
                size="lg"
                className="flex-1 gap-2 text-base font-bold shadow-xl shadow-primary/20"
             >
                <Plus size={20} />
                Open Repository
             </Button>
             <Button 
                variant="glass"
                size="lg"
                className="flex-1 gap-2 text-base font-bold"
                onClick={() => {}}
             >
                <Download size={20} />
                Clone Remote
             </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-8">
          {/* Currently Open */}
          <AnimatePresence>
            {repos.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Monitor size={12} />
                    Active Sessions
                  </h2>
                  <Badge variant="glass">{repos.length} Open</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {repos.map((repo, idx) => (
                    <motion.div
                      key={repo.path}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card 
                        className="group hover:border-primary/50 cursor-pointer transition-all bg-secondary/30 border-dashed"
                        onClick={() => switchTab(repo.path)}
                      >
                        <CardContent className="p-4 flex flex-col gap-1 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-destructive"
                              onClick={(e) => { e.stopPropagation(); closeRepoTab(repo.path); }}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                          <span className="text-[13px] font-black truncate pr-6">{repo.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate opacity-60 font-mono tracking-tight">{repo.path}</span>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Recent List */}
          <section className="flex flex-col gap-4">
             <div className="px-2">
               <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                 <Clock size={12} />
                 Recent History
               </h2>
             </div>
             
             <Card className="bg-transparent border-none shadow-none">
               <div className="flex flex-col gap-2">
                  {recent.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                      Your recent repositories will appear here.
                    </div>
                  ) : (
                    recent.map((repo, idx) => (
                      <motion.div
                        key={repo.path}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="group"
                      >
                        <div 
                          onClick={() => {
                            loadRepo(repo.path);
                            autoFetch(repo.path);
                          }}
                          className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary transition-all cursor-pointer border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <FolderOpen size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex flex-col min-w-0">
                               <span className="text-[14px] font-bold text-foreground truncate tracking-tight">{repo.name}</span>
                               <span className="text-[11px] text-muted-foreground truncate opacity-50 font-mono" title={repo.path}>{repo.path}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0">
                             <Badge variant="glass" className="opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[10px]">
                               {timeAgo(repo.last_opened)}
                             </Badge>
                             <Button 
                               variant="ghost" 
                               size="icon"
                               onClick={(e) => removeRecent(e, repo.path)}
                               className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10"
                             >
                               <X size={14} />
                             </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
               </div>
             </Card>
          </section>
        </div>

        <div className="mt-8 text-center border-t border-border/50 pt-8">
          <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase opacity-40">GitKit Open Source Project</p>
        </div>
      </div>
    </div>
  );
}
