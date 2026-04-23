import React from 'react';
import { ChevronDown, Folder } from 'lucide-react';
import { TreeNode } from './types';
import { StatusIcon } from './FileRow';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface FileTreeProps {
  node: TreeNode;
  onAction: (path: string) => void;
  actionLabel: string;
  onFileClick: (path: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  depth?: number;
}

export const FileTree: React.FC<FileTreeProps> = ({
  node,
  onAction,
  actionLabel,
  onFileClick,
  expandedFolders,
  toggleFolder,
  depth = 0
}) => {
  return (
    <>
      {Array.from(node.children.values())
        .sort((a, b) => {
          if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map(child => {
          const isExpanded = expandedFolders.has(child.fullPath);
          return (
            <div key={child.fullPath} className="flex flex-col relative">
              <div 
                className="flex items-center justify-between h-[var(--row-height)] hover:bg-white/5 rounded-md cursor-pointer group px-2 transition-colors relative z-10"
                onClick={() => child.isFolder ? toggleFolder(child.fullPath) : onFileClick(child.fullPath)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {child.isFolder ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ChevronDown size={14} className={cn("text-muted-foreground/40 transition-transform duration-200", !isExpanded && "-rotate-90")} />
                      <Folder size={16} className="text-primary/60 fill-primary/5 shrink-0" />
                    </div>
                  ) : (
                    <div className="pl-[20px] flex items-center relative">
                      <div className="absolute left-[8px] top-1/2 -translate-y-1/2 w-2 h-[1px] bg-border/40" />
                      <StatusIcon status={child.status!} />
                    </div>
                  )}
                  <span className={cn(
                    "text-[var(--app-font-size)] truncate font-mono tracking-tight",
                    child.isFolder ? "text-foreground/90 font-medium" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {child.name}
                  </span>
                </div>
                {!child.isFolder && (
                   <Button 
                     size="sm"
                     variant="primary"
                     onClick={(e) => {
                       e.stopPropagation();
                       onAction(child.fullPath);
                     }}
                     className="invisible group-hover:visible h-5 px-1.5 text-[9px] font-bold uppercase tracking-wider rounded-[4px]"
                   >
                     {actionLabel}
                   </Button>
                )}
              </div>
              {child.isFolder && isExpanded && (
                <div className="ml-[18px] border-l border-border/40 pl-1 relative">
                  <FileTree 
                    node={child} 
                    onAction={onAction} 
                    actionLabel={actionLabel} 
                    onFileClick={onFileClick} 
                    expandedFolders={expandedFolders} 
                    toggleFolder={toggleFolder} 
                    depth={depth + 1} 
                  />
                </div>
              )}
            </div>
          );
        })}
    </>
  );
};
