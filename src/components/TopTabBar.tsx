import { Home, X, Monitor } from "lucide-react";
import { useAppStore } from "../store";
import { switchTab, closeRepoTab } from "../lib/repo";

export function TopTabBar() {
  const { repos, activeTabId } = useAppStore();

  return (
    <div className="h-[36px] w-full bg-panel-background border-b border-border/30 flex items-center px-2 shrink-0 select-none overflow-x-auto custom-scrollbar no-scrollbar-buttons">
      
      {/* Home Tab */}
      <div 
        onClick={() => switchTab('home')}
        className={`h-[calc(100%-4px)] mt-[4px] flex items-center gap-2 px-4 cursor-pointer transition-all border-b-2 rounded-t-md relative group min-w-[100px] justify-center
          ${activeTabId === 'home' 
            ? 'bg-secondary/40 border-dracula-cyan text-foreground' 
            : 'border-transparent text-muted-foreground/80 hover:bg-secondary/20 hover:text-foreground'}`}
      >
        <Home size={14} className={activeTabId === 'home' ? 'text-dracula-cyan' : 'text-muted-foreground/80 group-hover:text-foreground'} />
        <span className="text-[11px] font-bold uppercase tracking-wider">Home</span>
      </div>

      {/* Repo Tabs */}
      {repos.map((repo) => (
        <div 
          key={repo.path}
          className={`h-[calc(100%-4px)] mt-[4px] flex items-center group relative border-b-2 transition-all min-w-[140px] max-w-[240px] border-r border-border/10 rounded-t-md
            ${activeTabId === repo.path 
              ? 'bg-secondary/40 border-dracula-cyan text-foreground' 
              : 'border-transparent text-muted-foreground/80 hover:bg-secondary/20 hover:text-foreground'}`}
        >
          <div 
            onClick={() => switchTab(repo.path)}
            className="flex-1 h-full flex items-center gap-2 px-3 cursor-pointer min-w-0"
          >
            <Monitor size={12} className={activeTabId === repo.path ? 'text-dracula-cyan' : 'text-muted-foreground/80'} />
            <span className="text-[11px] font-medium truncate py-1">
              {repo.name}
            </span>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              closeRepoTab(repo.path);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded hover:bg-white/10 transition-all text-muted-foreground/60 hover:text-dracula-red"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {/* Settings Tab (Temporary) */}
      {activeTabId === 'settings' && (
        <div 
          className="h-[calc(100%-4px)] mt-[4px] flex items-center gap-2 px-4 bg-secondary/40 border-b-2 border-dracula-cyan text-foreground rounded-t-md min-w-[120px] justify-center"
        >
          <X 
            size={14} 
            className="text-muted-foreground/60 hover:text-dracula-red cursor-pointer" 
            onClick={() => switchTab('home')} 
          />
          <span className="text-[11px] font-bold uppercase tracking-wider">Settings</span>
        </div>
      )}
    </div>
  );
}
