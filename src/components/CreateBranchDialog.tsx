import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GitBranch, Search, Check, AlertTriangle, Copy, Terminal, Loader2, X, ArrowUpRight, Globe, Monitor, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store';
import {
  createBranch,
  validateBranchName,
  checkWorkingTree,
  safeSwitchBranch,
  pushBranchToRemote,
  fetchAndListRemote,
  autoStash,
  openTerminal,
  type BranchValidation,
  type WorkingTreeCheck,
  type CreateBranchResult,
  type RemoteBranchInfo,
} from '../lib/repo';
import { toast } from '../lib/toast';

// ── Types ────────────────────────────────────────────────────────────

type CreationMode = 'local' | 'push' | 'remote';
type FormState = 'idle' | 'validating' | 'fetching' | 'loading' | 'success' | 'error';

interface CreateBranchDialogProps {
  onClose: () => void;
  defaultSource?: string;      // commit OID or branch name
  defaultSourceLabel?: string; // display text
}

// ── Source Item ───────────────────────────────────────────────────────

interface SourceItem {
  label: string;    // display name: "main", "v1.0.0", "abc1234"
  value: string;    // git ref or OID
  type: 'branch' | 'tag' | 'commit' | 'remote';
  isHead?: boolean;
}

// ── Component ────────────────────────────────────────────────────────

export function CreateBranchDialog({ onClose, defaultSource, defaultSourceLabel }: CreateBranchDialogProps) {
  // Form fields
  const [name, setName] = useState('');
  const [mode, setMode] = useState<CreationMode>('local');
  const [setUpstream, setSetUpstream] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>(defaultSource || '');
  const [sourceLabel, setSourceLabel] = useState(defaultSourceLabel || '');

  // Validation
  const [validation, setValidation] = useState<BranchValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Working tree
  const [treeCheck, setTreeCheck] = useState<WorkingTreeCheck | null>(null);
  const [stashDecision, setStashDecision] = useState<'none' | 'stash' | 'skip'>('none');

  // Remote branches (mode === 'remote')
  const [remoteBranches, setRemoteBranches] = useState<RemoteBranchInfo[]>([]);
  const [selectedRemoteBranch, setSelectedRemoteBranch] = useState<string>('');

  // State machine
  const [formState, setFormState] = useState<FormState>('idle');
  const [result, setResult] = useState<CreateBranchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Source dropdown
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('');
  const [remoteFilter, setRemoteFilter] = useState('');

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const validationTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Store data
  const branches = useAppStore(s => s.branches);
  const commitLog = useAppStore(s => s.commitLog);
  const activeBranch = useAppStore(s => s.activeBranch);

  // ── Initialize ──────────────────────────────────────────────────

  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 80);
    // Check working tree on mount
    checkWorkingTree().then(wt => {
      if (wt) setTreeCheck(wt);
      // Set default source to HEAD if not provided
      if (!defaultSource && wt?.head_branch) {
        setSelectedSource(wt.head_branch);
        setSourceLabel(wt.head_branch);
      } else if (!defaultSource && wt?.head_oid) {
        setSelectedSource(wt.head_oid);
        setSourceLabel(wt.head_oid.substring(0, 7));
      }
    });
  }, [defaultSource]);

  // ── Source items ────────────────────────────────────────────────

  const sourceItems = useMemo((): SourceItem[] => {
    const items: SourceItem[] = [];
    const seen = new Set<string>();

    // Local branches from store
    if (branches) {
      for (const b of branches) {
        if (b.branch_type === 'local' && !seen.has(b.name)) {
          seen.add(b.name);
          items.push({ label: b.name, value: b.name, type: 'branch', isHead: b.is_head });
        }
      }
    }

    // Tags from commit refs
    if (commitLog) {
      for (const c of commitLog) {
        for (const ref of c.refs) {
          if (ref.startsWith('tag:') && !seen.has(ref)) {
            seen.add(ref);
            items.push({ label: ref, value: ref, type: 'tag' });
          }
        }
      }
    }

    // If defaultSource is a commit OID, add it
    if (defaultSource && !seen.has(defaultSource)) {
      items.unshift({
        label: defaultSourceLabel || defaultSource.substring(0, 7),
        value: defaultSource,
        type: 'commit',
      });
    }

    return items;
  }, [branches, commitLog, defaultSource, defaultSourceLabel]);

  const filteredSources = useMemo(() => {
    if (!sourceFilter) return sourceItems;
    const q = sourceFilter.toLowerCase();
    return sourceItems.filter(s => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q));
  }, [sourceItems, sourceFilter]);

  // ── Debounced Validation ───────────────────────────────────────

  useEffect(() => {
    if (!name.trim()) {
      setValidation(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    if (validationTimer.current) clearTimeout(validationTimer.current);

    validationTimer.current = setTimeout(async () => {
      try {
        const result = await validateBranchName(name.trim());
        setValidation(result);
      } catch {
        setValidation({ valid: false, error: 'Validation failed', suggestion: null });
      } finally {
        setIsValidating(false);
      }
    }, 300);

    return () => {
      if (validationTimer.current) clearTimeout(validationTimer.current);
    };
  }, [name]);

  // ── Fetch remote branches when mode changes to 'remote' ────────

  useEffect(() => {
    if (mode === 'remote' && remoteBranches.length === 0) {
      setFormState('fetching');
      fetchAndListRemote().then(branches => {
        setRemoteBranches(branches);
        setFormState('idle');
      }).catch(() => {
        setFormState('error');
        setErrorMessage('Failed to fetch remote branches');
      });
    }
  }, [mode]);

  const filteredRemoteBranches = useMemo(() => {
    if (!remoteFilter) return remoteBranches;
    const q = remoteFilter.toLowerCase();
    return remoteBranches.filter(b => b.name.toLowerCase().includes(q));
  }, [remoteBranches, remoteFilter]);

  // ── State helpers ──────────────────────────────────────────────

  const hasDirtyTree = treeCheck && (treeCheck.has_staged || treeCheck.has_unstaged);
  const showStashWarning = hasDirtyTree && stashDecision === 'none' && formState === 'idle';

  const canSubmit = (() => {
    if (formState !== 'idle') return false;
    if (mode === 'remote') return !!selectedRemoteBranch;
    if (!name.trim()) return false;
    if (validation && !validation.valid) return false;
    if (isValidating) return false;
    if (showStashWarning) return false;
    return true;
  })();

  // ── Submit handler ─────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setFormState('loading');
    setErrorMessage('');

    try {
      // Handle stash if needed
      if (hasDirtyTree && stashDecision === 'stash') {
        const stashed = await autoStash(mode === 'remote' ? selectedRemoteBranch : name.trim());
        if (!stashed) {
          setFormState('error');
          setErrorMessage('Failed to stash changes');
          return;
        }
      }

      if (mode === 'remote') {
        // Mode C: From remote
        await safeSwitchBranch(`origin/${selectedRemoteBranch}`);
        setResult({ name: selectedRemoteBranch, oid: '', short_oid: '' });
        setFormState('success');
      } else {
        // Mode A & B: Create branch
        const branchResult = await createBranch(name.trim(), selectedSource || undefined);
        if (!branchResult) {
          setFormState('error');
          setErrorMessage('Failed to create branch');
          return;
        }

        // Switch to new branch
        await safeSwitchBranch(branchResult.name);

        // Mode B: Push to remote
        if (mode === 'push') {
          const pushed = await pushBranchToRemote(branchResult.name, 'origin', setUpstream);
          if (!pushed) {
            // Branch created locally but push failed
            toast.info(`Branch created locally. Push to remote failed.`);
          }
        }

        setResult(branchResult);
        setFormState('success');
      }
    } catch (e) {
      setFormState('error');
      setErrorMessage(String(e));
    }
  }, [canSubmit, name, mode, selectedSource, selectedRemoteBranch, setUpstream, hasDirtyTree, stashDecision]);

  const handleCopyName = () => {
    if (result) {
      navigator.clipboard.writeText(result.name);
      toast.success('Branch name copied');
    }
  };

  // ── Render: Success State ──────────────────────────────────────

  if (formState === 'success' && result) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="create-branch-dialog w-[440px]" onClick={e => e.stopPropagation()}>
          {/* Success header */}
          <div className="px-5 pt-5 pb-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#238636]/20 border border-[#238636]/40 flex items-center justify-center mx-auto mb-3">
              <Check size={24} className="text-[#3fb950]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#e6edf3]">Branch Created</h3>
            <p className="text-[12px] text-[#8b949e] mt-1">
              {mode === 'push' ? 'Created locally and pushed to remote' : mode === 'remote' ? 'Now tracking remote branch' : 'Created locally'}
            </p>
          </div>

          {/* Branch info card */}
          <div className="mx-5 mb-4 bg-[#0d1117] rounded-lg border border-[#21262d] p-3">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch size={14} className="text-[#3fb950]" />
              <code className="text-[13px] font-mono text-[#79c0ff] font-semibold">{result.name}</code>
            </div>
            {result.short_oid && (
              <div className="text-[11px] text-[#8b949e]">
                HEAD at <code className="text-[#79c0ff] bg-[#161b22] px-1 py-0.5 rounded text-[10px]">{result.short_oid}</code>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex items-center gap-2">
            <button onClick={handleCopyName}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-all">
              <Copy size={12} /> Copy name
            </button>
            <button onClick={() => { openTerminal(); onClose(); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-all">
              <Terminal size={12} /> Terminal
            </button>
            <button onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-white bg-[#238636] hover:bg-[#2ea043] border border-[#238636] transition-all">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Main Form ──────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="create-branch-dialog w-[440px]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-[14px] font-semibold text-[#e6edf3] flex items-center gap-2">
            <GitBranch size={16} className="text-[#3fb950]" />
            Create Branch
          </h3>
          <button onClick={onClose} className="text-[#484f58] hover:text-[#8b949e] transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Mode selector — segmented control */}
        <div className="px-5 pt-2 pb-3">
          <div className="branch-segmented-control">
            {([
              { key: 'local' as const, icon: <Monitor size={12} />, label: 'Local Only' },
              { key: 'push' as const, icon: <ArrowUpRight size={12} />, label: 'Create + Push' },
              { key: 'remote' as const, icon: <Globe size={12} />, label: 'From Remote' },
            ]).map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`branch-segmented-item ${mode === m.key ? 'active' : ''}`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Mode A & B: Name + Source ─────────────────────────── */}
        {mode !== 'remote' && (
          <>
            {/* Branch name input */}
            <div className="px-5 pb-1">
              <label className="text-[11px] font-medium text-[#8b949e] uppercase tracking-wide mb-1.5 block">Branch Name</label>
              <div className="relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && canSubmit) handleSubmit();
                    if (e.key === 'Escape') onClose();
                  }}
                  placeholder="feat/my-feature"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 pr-8 text-[13px] text-[#e6edf3] placeholder-[#484f58] outline-none focus:border-[#388bfd] focus:ring-1 focus:ring-[#388bfd]/30 transition-all font-mono"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {isValidating && <Loader2 size={14} className="animate-spin text-[#484f58]" />}
                  {!isValidating && validation?.valid && <Check size={14} className="text-[#3fb950]" />}
                  {!isValidating && validation && !validation.valid && <X size={14} className="text-[#f85149]" />}
                </div>
              </div>

              {/* Validation message */}
              {validation && !validation.valid && (
                <div className="mt-1.5 text-[11px] text-[#f85149] flex items-start gap-1.5">
                  <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                  <div>
                    {validation.error}
                    {validation.suggestion && (
                      <button
                        onClick={() => setName(validation.suggestion!)}
                        className="ml-1 text-[#79c0ff] hover:underline"
                      >
                        Use "{validation.suggestion}"?
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Source selector */}
            <div className="px-5 py-2">
              <label className="text-[11px] font-medium text-[#8b949e] uppercase tracking-wide mb-1.5 block">Source (from)</label>
              <div className="relative">
                <button
                  onClick={() => setSourceOpen(!sourceOpen)}
                  className="w-full flex items-center justify-between bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-[13px] text-[#e6edf3] hover:border-[#484f58] transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch size={12} className="text-[#8b949e] shrink-0" />
                    <span className="truncate font-mono text-[12px]">
                      {sourceLabel || selectedSource || activeBranch || 'HEAD'}
                    </span>
                    {sourceItems.find(s => s.value === selectedSource)?.isHead && (
                      <span className="text-[9px] bg-[#238636]/30 text-[#3fb950] px-1 py-0 rounded font-sans">HEAD</span>
                    )}
                  </div>
                  <ChevronDown size={14} className={`text-[#484f58] transition-transform ${sourceOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Source dropdown */}
                {sourceOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[100] branch-source-dropdown">
                    <div className="p-2 border-b border-[#21262d]">
                      <div className="relative">
                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#484f58]" />
                        <input
                          type="text"
                          value={sourceFilter}
                          onChange={e => setSourceFilter(e.target.value)}
                          placeholder="Filter branches..."
                          className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 pl-7 text-[11px] text-[#e6edf3] placeholder-[#484f58] outline-none focus:border-[#388bfd]"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                      {filteredSources.length === 0 && (
                        <div className="text-[11px] text-[#484f58] text-center py-3">No matching branches</div>
                      )}
                      {filteredSources.map(s => (
                        <button
                          key={s.value}
                          onClick={() => {
                            setSelectedSource(s.value);
                            setSourceLabel(s.label);
                            setSourceOpen(false);
                            setSourceFilter('');
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[12px] transition-colors ${
                            selectedSource === s.value ? 'bg-[#388bfd]/15 text-[#79c0ff]' : 'text-[#c9d1d9] hover:bg-[#21262d]'
                          }`}
                        >
                          {s.type === 'branch' && <GitBranch size={11} className="shrink-0 text-[#8b949e]" />}
                          {s.type === 'commit' && <span className="text-[10px] text-[#f0883e] shrink-0">SHA</span>}
                          {s.type === 'tag' && <span className="text-[10px] text-[#d2a8ff] shrink-0">TAG</span>}
                          <span className="truncate font-mono">{s.label}</span>
                          {s.isHead && <span className="text-[9px] bg-[#238636]/30 text-[#3fb950] px-1 rounded ml-auto">HEAD</span>}
                          {selectedSource === s.value && <Check size={12} className="ml-auto text-[#3fb950] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Mode C: Remote Branch Selector ────────────────────── */}
        {mode === 'remote' && (
          <div className="px-5 py-2">
            <label className="text-[11px] font-medium text-[#8b949e] uppercase tracking-wide mb-1.5 block">Remote Branch</label>
            {formState === 'fetching' ? (
              <div className="flex items-center gap-2 text-[12px] text-[#8b949e] py-3">
                <Loader2 size={14} className="animate-spin" />
                Fetching remote branches...
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#484f58]" />
                  <input
                    type="text"
                    value={remoteFilter}
                    onChange={e => setRemoteFilter(e.target.value)}
                    placeholder="Filter remote branches..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 pl-8 text-[12px] text-[#e6edf3] placeholder-[#484f58] outline-none focus:border-[#388bfd] transition-all font-mono"
                    autoFocus
                  />
                </div>
                <div className="max-h-[180px] overflow-y-auto custom-scrollbar bg-[#0d1117] border border-[#21262d] rounded-lg">
                  {filteredRemoteBranches.length === 0 && (
                    <div className="text-[11px] text-[#484f58] text-center py-4">
                      {remoteBranches.length === 0 ? 'No remote branches found' : 'No matching branches'}
                    </div>
                  )}
                  {filteredRemoteBranches.map(b => (
                    <button
                      key={`${b.remote}/${b.name}`}
                      onClick={() => setSelectedRemoteBranch(b.name)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors border-b border-[#21262d] last:border-0 ${
                        selectedRemoteBranch === b.name ? 'bg-[#388bfd]/15 text-[#79c0ff]' : 'text-[#c9d1d9] hover:bg-[#161b22]'
                      }`}
                    >
                      <Globe size={11} className="shrink-0 text-[#8b949e]" />
                      <span className="truncate font-mono">{b.remote}/{b.name}</span>
                      {selectedRemoteBranch === b.name && <Check size={12} className="ml-auto text-[#3fb950] shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Set upstream checkbox (mode B only) ───────────────── */}
        {mode === 'push' && (
          <div className="px-5 pb-2">
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  setUpstream ? 'bg-[#388bfd] border-[#388bfd]' : 'border-[#484f58] bg-transparent group-hover:border-[#8b949e]'
                }`}
                onClick={() => setSetUpstream(!setUpstream)}
              >
                {setUpstream && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[12px] text-[#8b949e] group-hover:text-[#c9d1d9] transition-colors" onClick={() => setSetUpstream(!setUpstream)}>
                Set as upstream tracking
              </span>
            </label>
          </div>
        )}

        {/* ── Stash Warning ────────────────────────────────────── */}
        {showStashWarning && (
          <div className="mx-5 mb-3 branch-warning-banner">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-[#d29922] mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[12px] text-[#e3b341] font-medium">Uncommitted changes detected</p>
                <p className="text-[11px] text-[#8b949e] mt-0.5">
                  {treeCheck?.has_staged ? 'Staged' : 'Modified'} files in your working tree.
                  Stash them before creating the branch?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5 pl-5">
              <button
                onClick={() => setStashDecision('stash')}
                className="px-2.5 py-1 rounded text-[11px] font-medium text-white bg-[#d29922]/80 hover:bg-[#d29922] transition-all"
              >
                Stash & Continue
              </button>
              <button
                onClick={() => setStashDecision('skip')}
                className="px-2.5 py-1 rounded text-[11px] font-medium text-[#8b949e] hover:text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] transition-all"
              >
                Skip
              </button>
              <button
                onClick={onClose}
                className="px-2.5 py-1 rounded text-[11px] font-medium text-[#484f58] hover:text-[#8b949e] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Error state ──────────────────────────────────────── */}
        {formState === 'error' && (
          <div className="mx-5 mb-3 p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg">
            <div className="flex items-start gap-2">
              <X size={14} className="text-[#f85149] mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[12px] text-[#f85149] font-medium">Error</p>
                <p className="text-[11px] text-[#f85149]/80 mt-0.5 font-mono break-all">{errorMessage}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(errorMessage); toast.success('Error copied'); }}
                className="text-[#484f58] hover:text-[#8b949e] p-1"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
        )}

        {/* ── Footer: Submit ───────────────────────────────────── */}
        <div className="px-5 pb-4 pt-2 flex items-center justify-between border-t border-[#21262d]">
          <div className="text-[10px] text-[#484f58]">
            {mode === 'local' && 'Branch will be created locally'}
            {mode === 'push' && 'Branch will be pushed to origin'}
            {mode === 'remote' && 'Will track selected remote branch'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#8b949e] hover:text-[#e6edf3] bg-transparent hover:bg-[#21262d] border border-[#30363d] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || formState === 'loading'}
              className="px-4 py-1.5 rounded-lg text-[12px] font-medium text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 disabled:cursor-not-allowed border border-[#238636] hover:border-[#2ea043] transition-all flex items-center gap-1.5"
            >
              {formState === 'loading' && <Loader2 size={12} className="animate-spin" />}
              {mode === 'remote' ? 'Checkout Branch' : 'Create Branch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
