import React from 'react';
import { Search, X } from 'lucide-react';
import { ViewMode } from './types';

interface RightPanelTabsProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  fileFilter: string;
  setFileFilter: (filter: string) => void;
}

export const RightPanelTabs: React.FC<RightPanelTabsProps> = ({
  viewMode,
  setViewMode,
  fileFilter,
  setFileFilter
}) => {
  return (
    <div className="flex items-center gap-4 px-4 pt-3 border-b border-[#30363d] shrink-0">
      <button 
        onClick={() => setViewMode('path')}
        className={`text-[11px] font-bold pb-2 transition-all shrink-0 uppercase tracking-widest ${viewMode === 'path' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-[#6e7681] hover:text-[#e6edf3]'}`}
      >
        Path
      </button>
      <button 
        onClick={() => setViewMode('tree')}
        className={`text-[11px] font-bold pb-2 transition-all shrink-0 uppercase tracking-widest ${viewMode === 'tree' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-[#6e7681] hover:text-[#e6edf3]'}`}
      >
        Tree
      </button>
      <div className="flex-1 flex items-center bg-[#0d1117] rounded-md border border-[#30363d] px-2 mb-2 shadow-inner focus-within:border-blue-500/50 transition-colors">
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
  );
};
