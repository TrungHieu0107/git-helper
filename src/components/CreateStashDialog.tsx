import { useState, useEffect, useRef } from 'react';
import { Archive, X, Check, Loader2, AlertTriangle, FileText, Plus, Info } from 'lucide-react';
import { useAppStore, FileStatus } from '../store';
import { createStash, stashUnstaged, saveCurrentState } from '../lib/repo';
import { toast } from '../lib/toast';

interface CreateStashDialogProps {
  onClose: () => void;
}

type StashMode = 'all' | 'unstaged';

export function CreateStashDialog({ onClose }: CreateStashDialogProps) {
  const { stagedFiles, unstagedFiles, lastStashMode, lastIncludeUntracked } = useAppStore();
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<StashMode>(lastStashMode);
  const [includeUntracked, setIncludeUntracked] = useState(lastIncludeUntracked);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const unstagedModified = unstagedFiles.filter(f => f.status !== 'untracked');
  const untrackedFiles = unstagedFiles.filter(f => f.status === 'untracked');

  const filesToStash = mode === 'all' 
    ? [...stagedFiles, ...unstagedModified, ...(includeUntracked ? untrackedFiles : [])]
    : [...unstagedModified, ...(includeUntracked ? untrackedFiles : [])];

  const filesRemaining = mode === 'unstaged' ? stagedFiles : [];

  const canSubmit = filesToStash.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const success = await stashUnstaged({ 
        message, 
        includeUntracked, 
        keepIndex: mode === 'unstaged' 
      });

      if (success) onClose();
    } catch (e) {
      toast.error(`Operation failed: ${e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-[500px] bg-[#1c2128] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#161b22]/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Archive size={18} />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[#e6edf3]">Stash Changes</h3>
              <p className="text-[11px] text-[#8b949e]">Save current work to a temporary area</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#484f58] hover:text-[#8b949e] transition-colors p-1.5 hover:bg-[#30363d] rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Message Input */}
          <div>
            <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-2 block">Message (Optional)</label>
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. work in progress on authentication"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#484f58] outline-none focus:border-[#388bfd] focus:ring-1 focus:ring-[#388bfd]/30 transition-all font-sans"
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
            />
          </div>

          {/* Stash Mode Selector */}
          <div>
            <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-2 block">Stash Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setMode('all');
                  useAppStore.setState({ lastStashMode: 'all' });
                  saveCurrentState();
                }}
                className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left ${mode === 'all' ? 'bg-[#388bfd]/10 border-[#388bfd] text-[#79c0ff]' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#484f58]'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Plus size={14} className={mode === 'all' ? 'text-blue-400' : 'text-slate-500'} />
                  <span className="text-[13px] font-semibold">Stash All</span>
                </div>
                <span className="text-[10px] opacity-80 leading-relaxed">Everything including staged changes will be stashed</span>
              </button>
              <button 
                onClick={() => {
                  setMode('unstaged');
                  useAppStore.setState({ lastStashMode: 'unstaged' });
                  saveCurrentState();
                }}
                className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left ${mode === 'unstaged' ? 'bg-[#388bfd]/10 border-[#388bfd] text-[#79c0ff]' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#484f58]'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} className={mode === 'unstaged' ? 'text-blue-400' : 'text-slate-500'} />
                  <span className="text-[13px] font-semibold">Unstaged Only</span>
                </div>
                <span className="text-[10px] opacity-80 leading-relaxed">Only modified files NOT in the index will be stashed</span>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
             <label className="flex items-center gap-2 cursor-pointer group select-none">
                <div 
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${includeUntracked ? 'bg-[#388bfd] border-[#388bfd]' : 'border-[#484f58] bg-transparent group-hover:border-[#8b949e]'}`}
                  onClick={() => {
                    const nextValue = !includeUntracked;
                    setIncludeUntracked(nextValue);
                    useAppStore.setState({ lastIncludeUntracked: nextValue });
                    saveCurrentState();
                  }}
                >
                  {includeUntracked && <Check size={12} className="text-white" />}
                </div>
                <span className="text-[12px] text-[#8b949e] group-hover:text-[#c9d1d9] transition-colors" 
                  onClick={() => {
                    const nextValue = !includeUntracked;
                    setIncludeUntracked(nextValue);
                    useAppStore.setState({ lastIncludeUntracked: nextValue });
                    saveCurrentState();
                  }}>
                  Include untracked files
                </span>
             </label>
          </div>

          {/* Preview Section */}
          <div className="space-y-3">
             <div className="rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden">
                <div className="px-3 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
                   <span className="text-[11px] font-bold text-[#8b949e] uppercase">Files to be stashed ({filesToStash.length})</span>
                </div>
                <div className="max-h-[120px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                   {filesToStash.length === 0 ? (
                     <div className="text-[11px] text-[#484f58] italic py-2 px-1">Nothing to stash</div>
                   ) : (
                     filesToStash.map(f => <FileRow key={f.path} file={f} />)
                   )}
                </div>
             </div>

             {mode === 'unstaged' && filesRemaining.length > 0 && (
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden opacity-60">
                   <div className="px-3 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#8b949e] uppercase">Remaining in index ({filesRemaining.length})</span>
                      <Info size={12} className="text-[#8b949e]" />
                   </div>
                   <div className="max-h-[80px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {filesRemaining.map(f => <FileRow key={f.path} file={f} dimmed />) }
                   </div>
                </div>
             )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#30363d] bg-[#161b22]/50 flex items-center justify-between">
          <div className="flex-1">
            {!canSubmit && (
               <div className="flex items-center gap-1.5 text-amber-500/80">
                  <AlertTriangle size={14} />
                  <span className="text-[11px] font-medium">No changes to stash</span>
               </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`px-5 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 transition-all ${!canSubmit || isSubmitting ? 'bg-[#30363d] text-[#484f58] cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-95'}`}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {mode === 'all' ? 'Stash All' : 'Stash Unstaged'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileRow({ file, dimmed = false }: { file: FileStatus, dimmed?: boolean }) {
  const statusColor = file.status === 'staged' ? 'text-emerald-400' : file.status === 'untracked' ? 'text-slate-400' : 'text-amber-400';
  return (
    <div className={`flex items-center gap-2 py-1 px-1 rounded hover:bg-white/5 group transition-colors ${dimmed ? 'opacity-50' : ''}`}>
      <span className={`text-[10px] w-4 font-bold text-center uppercase ${statusColor}`}>
        {file.status[0]}
      </span>
      <span className="text-[12px] text-slate-300 truncate flex-1 font-mono">{file.path}</span>
    </div>
  );
}
