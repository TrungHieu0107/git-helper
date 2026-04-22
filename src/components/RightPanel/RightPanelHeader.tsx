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
    <header className="h-10 border-b border-border/30 flex items-center px-4 justify-between bg-background shrink-0">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onCollapse} 
          className="h-7 w-7 text-muted-foreground/60 hover:text-foreground"
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
          className="h-7 w-7 text-dracula-red hover:text-dracula-red/80"
          title="Discard All"
        >
          <Trash size={14} />
        </Button>
      )}
    </header>
  );
};
