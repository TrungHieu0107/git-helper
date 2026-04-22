import React, { useState } from 'react';
import { ChevronDown, Folder, GitBranch, Cloud, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { Highlight } from './utils';
import { safeSwitchBranch } from '../../lib/repo';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
        className={cn(
          "flex items-center group h-7 px-2 rounded-md transition-all cursor-pointer whitespace-nowrap",
          isHead ? "bg-primary/10 text-primary" : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
        )}
        style={{ marginLeft: `${level * 12}px` }}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 group/inner">
          {hasChildren ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <motion.div
                animate={{ rotate: expanded ? 0 : -90 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={12} className="opacity-40" />
              </motion.div>
              <Folder size={14} className="text-primary/70 fill-primary/10" />
            </div>
          ) : (
            <div className="shrink-0 w-4 flex justify-center items-center">
               {remotePrefix ? (
                 <Cloud size={14} className={cn("opacity-50", isHead && "opacity-100 text-primary")} />
               ) : (
                 <GitBranch size={14} className={cn("opacity-50", isHead && "opacity-100 text-primary")} />
               )}
            </div>
          )}
          
          <span className={cn(
            "text-[var(--app-font-size)] truncate flex-1 tracking-tight transition-colors",
            isHead && "font-semibold"
          )}>
            <Highlight text={node.name} query={filter} />
          </span>

          {isHead && (
            <CheckCircle2 size={12} className="text-primary mr-1" />
          )}
        </div>
        
        {node.isBranch && (
          <Button 
            variant="ghost" 
            size="icon"
            className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 hover:bg-primary/20 hover:text-primary transition-all"
            onClick={(e) => {
              e.stopPropagation();
              const fullRef = remotePrefix ? `${remotePrefix}/${node.fullPath}` : node.fullPath;
              setBranchContextMenu({ x: e.clientX, y: e.clientY, branch: fullRef });
            }}
          >
            <MoreHorizontal size={12} />
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
