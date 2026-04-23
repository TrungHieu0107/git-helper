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
    <header className="h-[var(--toolbar-height)] border-b border-border/40 flex items-center px-3 justify-between bg-panel-background shrink-0 shadow-sm">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onCollapse} 
          className="h-7 w-7 text-muted-foreground/60 hover:text-foreground"
        >
          <ChevronsRight size={18} />
        </Button>
        <span className="section-header-text">Changes</span>
      </div>
      {hasChanges && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDiscardAll}
          className="h-7 w-7 text-dracula-red hover:text-dracula-red/80"
          title="Discard All"
        >
          <Trash size={16} />
        </Button>
      )}
    </header>
  );
};
