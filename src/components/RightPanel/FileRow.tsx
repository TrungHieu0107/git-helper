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
  if (status === 'untracked') return <Plus size={14} className="text-green-500 shrink-0" />;
  if (status === 'modified') return <Pencil size={12} className="text-yellow-500 shrink-0" />;
  if (status === 'deleted') return <Minus size={14} className="text-red-500 shrink-0" />;
  if (status === 'added') return <Plus size={14} className="text-green-500 shrink-0" />;
  if (status === 'renamed') return <ArrowRight size={12} className="text-blue-500 shrink-0" />;
  if (status === 'conflicted') return <AlertTriangle size={12} className="text-red-500 shrink-0" />;
  return <Pencil size={12} className="text-yellow-500 shrink-0" />;
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
      <span key={idx} className="bg-yellow-500/30 text-yellow-500 rounded-sm px-[1px]">
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
      className="flex items-center justify-between h-[26px] px-2 hover:bg-white/5 rounded-md cursor-pointer group transition-all duration-150 mx-1"
    >
      <div className="flex items-center gap-2 overflow-hidden min-w-0">
        <StatusIcon status={status} />
        <div className="flex items-center text-[12px] font-mono min-w-0 overflow-hidden" title={name}>
          {displayDirPath && (
            <span className="text-[#6e7681] shrink-0 opacity-60">
              <HighlightText text={displayDirPath} query={highlight} />
            </span>
          )}
          <span className="text-[#e6edf3] font-medium truncate">
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
