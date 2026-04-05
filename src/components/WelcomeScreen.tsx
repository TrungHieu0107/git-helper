import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, GitBranch, X, Clock } from 'lucide-react';
import { RecentRepo } from '../store';
import { loadRepo } from '../lib/repo';

export function WelcomeScreen() {
  const [recent, setRecent] = useState<RecentRepo[]>([]);

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
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#282c34] h-full text-white">
      <div className="w-[500px] bg-[#1e2227] rounded-lg shadow-xl shadow-black/40 border border-[#3e4451] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-[#3e4451]">
           <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
             <GitBranch size={28} className="text-white transform -rotate-3" />
           </div>
           <div>
             <h1 className="text-2xl font-bold tracking-tight text-gray-100">GitKit</h1>
             <p className="text-sm text-gray-400">Desktop Git Client</p>
           </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 flex flex-col gap-3 border-b border-[#3e4451] bg-[#21262d]/50">
           <button 
              onClick={pickRepo}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors rounded-md text-sm font-semibold shadow-sm"
           >
              <FolderOpen size={18} />
              Open Repository
           </button>
           <button 
              onClick={() => alert('Coming soon!')}
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#3e4451]/50 hover:bg-[#3e4451] transition-colors rounded-md text-sm font-medium text-gray-300 shadow-sm"
           >
              <GitBranch size={18} />
              Clone Repository
           </button>
        </div>

        {/* Recent Repos */}
        <div className="p-6 flex-1 flex flex-col min-h-0">
           <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
             <Clock size={14} />
             Recent Repositories
           </h2>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-2">
              {recent.length === 0 ? (
                <div className="text-sm text-gray-500 italic text-center py-8">
                  No recent repositories
                </div>
              ) : (
                recent.map(repo => (
                  <div 
                    key={repo.path} 
                    onClick={() => loadRepo(repo.path)}
                    className="flex items-center justify-between group px-3 py-2.5 rounded-md hover:bg-[#2c313a] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <FolderOpen size={16} className="text-blue-400 shrink-0 opacity-80" />
                      <div className="flex flex-col min-w-0">
                         <span className="text-sm font-medium text-gray-200 truncate">{repo.name}</span>
                         <span className="text-[11px] text-gray-500 truncate" title={repo.path}>{repo.path}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                       <span className="text-[11px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         {timeAgo(repo.last_opened)}
                       </span>
                       <button 
                         onClick={(e) => removeRecent(e, repo.path)}
                         className="p-1 rounded bg-[#3e4451]/0 group-hover:bg-[#3e4451]/50 hover:!bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                         title="Remove from recent"
                       >
                         <X size={14} />
                       </button>
                    </div>
                  </div>
                ))
              )}
           </div>
           
           <div className="mt-6 text-center border-t border-[#3e4451]/50 pt-4">
             <p className="text-xs font-medium text-gray-500 opacity-60">Or drag and drop a folder here</p>
           </div>
        </div>
      </div>
    </div>
  );
}
