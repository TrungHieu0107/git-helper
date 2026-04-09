import { Home, X, Monitor } from "lucide-react";
import { useAppStore } from "../store";
import { switchTab, closeRepoTab } from "../lib/repo";

export function TopTabBar() {
  const { repos, activeTabId } = useAppStore();

  return (
    <div className="h-[36px] w-full bg-[#161b22] border-b border-[#30363d] flex items-center px-2 shrink-0 select-none overflow-x-auto custom-scrollbar no-scrollbar-buttons">
      
      {/* Home Tab */}
      <div 
        onClick={() => switchTab('home')}
        className={`h-[calc(100%-4px)] mt-[4px] flex items-center gap-2 px-4 cursor-pointer transition-all border-b-2 rounded-t-md relative group min-w-[100px] justify-center
          ${activeTabId === 'home' 
            ? 'bg-[#282c34] border-blue-500 text-white' 
            : 'border-transparent text-[#768390] hover:bg-[#30363d]/30 hover:text-[#adbac7]'}`}
      >
        <Home size={14} className={activeTabId === 'home' ? 'text-blue-400' : 'text-[#768390] group-hover:text-[#adbac7]'} />
        <span className="text-[11px] font-bold uppercase tracking-wider">Home</span>
      </div>

      {/* Repo Tabs */}
      {repos.map((repo) => (
        <div 
          key={repo.path}
          className={`h-[calc(100%-4px)] mt-[4px] flex items-center group relative border-b-2 transition-all min-w-[140px] max-w-[240px] border-r border-[#30363d]/50 rounded-t-md
            ${activeTabId === repo.path 
              ? 'bg-[#282c34] border-blue-500 text-white' 
              : 'border-transparent text-[#768390] hover:bg-[#30363d]/30 hover:text-[#adbac7]'}`}
        >
          <div 
            onClick={() => switchTab(repo.path)}
            className="flex-1 h-full flex items-center gap-2 px-3 cursor-pointer min-w-0"
          >
            <Monitor size={12} className={activeTabId === repo.path ? 'text-sky-400' : 'text-[#768390]'} />
            <span className="text-[11px] font-medium truncate py-1">
              {repo.name}
            </span>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              closeRepoTab(repo.path);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded hover:bg-white/10 transition-all text-[#768390] hover:text-red-400"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
