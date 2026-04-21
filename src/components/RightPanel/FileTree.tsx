import React from 'react';
import { ChevronDown, Folder } from 'lucide-react';
import { TreeNode } from './types';
import { StatusIcon } from './FileRow';
import { Button } from '../ui/Button';

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
            <div key={child.fullPath} className="flex flex-col">
              <div 
                className="flex items-center justify-between h-[26px] hover:bg-white/5 rounded-md cursor-pointer group mx-1"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => child.isFolder ? toggleFolder(child.fullPath) : onFileClick(child.fullPath)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {child.isFolder ? (
                    <>
                      <ChevronDown size={14} className={`text-[#6e7681] transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                      <Folder size={14} className="text-blue-500 opacity-70 shrink-0" />
                    </>
                  ) : (
                    <StatusIcon status={child.status!} />
                  )}
                  <span className={`text-[12px] truncate font-mono text-[#e6edf3]`}>
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
                     className="invisible group-hover:visible h-5 px-1.5"
                   >
                     {actionLabel}
                   </Button>
                )}
              </div>
              {child.isFolder && isExpanded && (
                <FileTree 
                  node={child} 
                  onAction={onAction} 
                  actionLabel={actionLabel} 
                  onFileClick={onFileClick} 
                  expandedFolders={expandedFolders} 
                  toggleFolder={toggleFolder} 
                  depth={depth + 1} 
                />
              )}
            </div>
          );
        })}
    </>
  );
};
