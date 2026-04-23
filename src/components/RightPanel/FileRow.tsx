import React, { useMemo } from 'react';
import { Pencil, Plus, Minus, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface FileRowProps {
  name: string;
  status: string;
  onAction?: () => void;
  actionLabel?: string;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  highlight?: string;
  isCompact?: boolean;
}

export const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'untracked') return <Plus size={16} className="text-dracula-green shrink-0" />;
  if (status === 'modified') return <Pencil size={14} className="text-dracula-orange shrink-0" />;
  if (status === 'deleted') return <Minus size={16} className="text-dracula-red shrink-0" />;
  if (status === 'added') return <Plus size={16} className="text-dracula-green shrink-0" />;
  if (status === 'renamed') return <ArrowRight size={14} className="text-dracula-cyan shrink-0" />;
  if (status === 'conflicted') return <AlertTriangle size={14} className="text-dracula-red shrink-0" />;
  return <Pencil size={14} className="text-dracula-orange shrink-0" />;
};

export const HighlightText = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerQuery);
  while (idx !== -1) {
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
    parts.push(
      <span key={idx} className="bg-dracula-orange/30 text-dracula-orange rounded-sm px-[1px]">
        {text.slice(idx, idx + query.length)}
      </span>
    );
    lastIndex = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
};

export const FileRow: React.FC<FileRowProps> = ({ 
  name, 
  status, 
  onAction, 
  actionLabel, 
  onClick, 
  onContextMenu, 
  highlight = '', 
  isCompact = false 
}) => {
  const fileName = name.includes('/') ? name.substring(name.lastIndexOf('/') + 1) : name;
  const dirPath = name.includes('/') ? name.substring(0, name.lastIndexOf('/') + 1) : '';

  const displayDirPath = useMemo(() => {
    if (!dirPath) return '';
    if (!isCompact) return dirPath;
    const parts = dirPath.split('/').filter(Boolean);
    if (parts.length <= 1) return dirPath;
    return `${parts[0]}/.../`;
  }, [dirPath, isCompact]);

  return (
    <div 
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="flex items-center justify-between h-[var(--row-height)] px-2 hover:bg-white/5 rounded-md cursor-pointer group mx-1"
    >
      <div className="flex items-center gap-2 overflow-hidden min-w-0">
        <StatusIcon status={status} />
        <div className="flex items-center text-[var(--app-font-size)] font-mono min-w-0 overflow-hidden tracking-tight" title={name}>
          {displayDirPath && (
            <span className="text-muted-foreground shrink-0 opacity-60">
              <HighlightText text={displayDirPath} query={highlight} />
            </span>
          )}
          <span className="text-foreground font-medium truncate">
            <HighlightText text={fileName} query={highlight} />
          </span>
        </div>
      </div>
      <Button 
        variant="primary" 
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onAction?.();
        }}
        className="invisible group-hover:visible h-5 px-1.5"
      >
        {actionLabel}
      </Button>
    </div>
  );
};
