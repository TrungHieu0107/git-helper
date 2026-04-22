import React from 'react';
import { GitCommit, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { HeadCommitInfo } from '../../lib/repo';

interface CommitAreaProps {
  message: string;
  setMessage: (msg: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  amend: boolean;
  setAmend: (amend: boolean) => void;
  headCommitInfo: HeadCommitInfo | null;
  onCommit: () => void;
  stagedCount: number;
}

export const CommitArea: React.FC<CommitAreaProps> = ({
  message,
  setMessage,
  description,
  setDescription,
  amend,
  setAmend,
  headCommitInfo,
  onCommit,
  stagedCount
}) => {
  const charsLeft = 72 - message.length;
  const isCommitDisabled = (!amend && stagedCount === 0) || message.trim() === '';

  return (
    <div className="border-t border-border/30 bg-background flex flex-col shrink-0 p-3 gap-3 shadow-2xl z-10 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-dracula-green rounded-sm" />
          <span className="section-header-text">NEW COMMIT</span>
        </div>
        <div 
          onClick={() => setAmend(!amend)}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase">Amend</span>
          <div className={`w-8 h-4 rounded-full relative transition-colors ${amend ? 'bg-dracula-green/80' : 'bg-border/40'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${amend ? 'right-0.5' : 'left-0.5'}`} />
          </div>
        </div>
      </div>
      
      {amend && headCommitInfo && (
        <div className="flex flex-col gap-2 p-2 bg-dracula-orange/10 border border-dracula-orange/20 rounded-md">
          {headCommitInfo.is_pushed && (
            <div className="flex items-center gap-2 text-[10px] text-dracula-orange font-bold">
              <AlertTriangle size={12} />
              <span>Already pushed (requires force)</span>
            </div>
          )}
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            amend: {headCommitInfo.oid.substring(0, 7)} - {headCommitInfo.author_name}
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-2">
        <div className="relative group/input">
          <input 
            type="text" 
            placeholder="Summary (required)" 
            className="w-full bg-secondary/20 border border-border/30 focus:border-dracula-cyan rounded-md px-3 py-2 outline-none text-foreground text-[13px] transition-all shadow-inner" 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
          />
          <div className={`absolute right-2.5 top-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md border border-white/5 shadow-sm
            ${charsLeft < 0 ? 'bg-dracula-red/20 text-dracula-red' : charsLeft < 22 ? 'bg-dracula-orange/20 text-dracula-orange' : 'bg-white/5 text-muted-foreground'}`}>
            {charsLeft}
          </div>
        </div>
        
        <textarea 
          placeholder="Description (optional)" 
          rows={3} 
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-secondary/20 border border-border/30 focus:border-dracula-cyan rounded-md px-3 py-2 outline-none text-foreground text-[13px] resize-none transition-all shadow-inner min-h-[60px]"
        />
      </div>

      <Button 
        onClick={onCommit}
        variant="primary"
        className="w-full py-5 text-[12px]"
        disabled={isCommitDisabled}
        leftIcon={<GitCommit size={14} />}
      >
        {amend ? 'Amend last commit' : 'Commit changes'}
      </Button>
    </div>
  );
};
