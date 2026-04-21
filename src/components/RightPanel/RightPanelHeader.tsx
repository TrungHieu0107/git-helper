import React from 'react';
import { ChevronsRight, Trash } from 'lucide-react';
import { Button } from '../ui/Button';

interface RightPanelHeaderProps {
  onCollapse: () => void;
  onDiscardAll: () => void;
  hasChanges: boolean;
}

export const RightPanelHeader: React.FC<RightPanelHeaderProps> = ({
  onCollapse,
  onDiscardAll,
  hasChanges
}) => {
  return (
    <header className="h-10 border-b border-[#30363d] flex items-center px-4 justify-between bg-[#161b22] shrink-0">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onCollapse} 
          className="h-7 w-7 text-[#6e7681]"
        >
          <ChevronsRight size={16} />
        </Button>
        <span className="section-header-text">Changes</span>
      </div>
      {hasChanges && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDiscardAll}
          className="h-7 w-7 text-red-500 hover:text-red-400"
          title="Discard All"
        >
          <Trash size={14} />
        </Button>
      )}
    </header>
  );
};
