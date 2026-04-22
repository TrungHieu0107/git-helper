import React, { useState } from 'react';
import { ChevronDown, Folder, GitBranch, Cloud, MoreHorizontal } from 'lucide-react';
import { Highlight } from './utils';
import { safeSwitchBranch } from '../../lib/repo';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store';


export interface BranchNode {
  name: string;
  fullPath: string;
  isBranch: boolean;
  children: Map<string, BranchNode>;
}

interface BranchTreeItemProps {
  node: BranchNode;
  activeBranch: string | null;
  level: number;
  filter?: string;
  setBranchContextMenu: (ctx: { x: number, y: number, branch: string } | null) => void;
  remotePrefix?: string;
}

export const BranchTreeItem: React.FC<BranchTreeItemProps> = ({ 
  node, 
  activeBranch, 
  level, 
  filter = "", 
  setBranchContextMenu, 
  remotePrefix 
}) => {
  const [expanded, setExpanded] = useState(true);
  const isHead = activeBranch === node.fullPath;
  const hasChildren = node.children.size > 0;

  const children = Array.from(node.children.values()).sort((a, b) => {
    if (!a.isBranch && b.isBranch) return -1;
    if (a.isBranch && !b.isBranch) return 1;
    return a.name.localeCompare(b.name);
  });

  if (!node.isBranch && !hasChildren) return null;

  return (
    <div className="flex flex-col">
      <div 
        onClick={() => { 
          if (hasChildren) {
            setExpanded(!expanded); 
          } else if (node.isBranch && remotePrefix && !isHead) {
            const fullRef = `${remotePrefix}/${node.fullPath}`;
            useAppStore.setState({ forceCheckoutTarget: fullRef, forceCheckoutPhase: 'confirm_reset' });
          }
        }}
        onContextMenu={(e) => {
          if (node.isBranch) {
            e.preventDefault();
            const fullRef = remotePrefix ? `${remotePrefix}/${node.fullPath}` : node.fullPath;
            setBranchContextMenu({ x: e.clientX, y: e.clientY, branch: fullRef });
          }
        }}
        onDoubleClick={async () => {
          if (node.isBranch && !isHead) {
            const fullRef = remotePrefix ? `${remotePrefix}/${node.fullPath}` : node.fullPath;
            await safeSwitchBranch(fullRef);
          }
        }}
        className={`flex items-center group h-[26px] px-1.5 mx-1 rounded-md transition-all cursor-pointer whitespace-nowrap
          ${isHead ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-white/5 border-l-2 border-transparent'}
        `}
        style={{ paddingLeft: `${Math.max(6, level * 16 + 6)}px` }}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 group">
          {hasChildren ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <ChevronDown size={14} className={`text-[#6e7681] transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
              <Folder size={14} className="text-blue-500 opacity-70" />
            </div>
          ) : (
            <div className="shrink-0 w-4 flex justify-center">
               {remotePrefix ? (
                 <Cloud size={14} className={isHead ? "text-blue-400" : "text-[#6e7681] group-hover:text-[#e6edf3]"} />
               ) : (
                 <GitBranch size={14} className={isHead ? "text-blue-400" : "text-[#6e7681] group-hover:text-[#e6edf3]"} />
               )}
            </div>
          )}
          
          <span className={`text-[12px] truncate flex-1 group-hover:text-[#e6edf3] transition-colors ${isHead ? 'text-[#e6edf3] font-semibold' : 'text-[#8b949e]'}`}>
            <Highlight text={node.name} query={filter} />
          </span>

          {isHead && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          )}
        </div>
        
        {node.isBranch && (
          <Button 
            variant="ghost" 
            size="icon"
            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              const fullRef = remotePrefix ? `${remotePrefix}/${node.fullPath}` : node.fullPath;
              setBranchContextMenu({ x: e.clientX, y: e.clientY, branch: fullRef });
            }}
          >
            <MoreHorizontal size={14} />
          </Button>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="flex flex-col">
          {children.map(child => (
            <BranchTreeItem 
              key={child.fullPath} 
              node={child} 
              activeBranch={activeBranch} 
              level={level + 1} 
              filter={filter} 
              setBranchContextMenu={setBranchContextMenu} 
              remotePrefix={remotePrefix} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
