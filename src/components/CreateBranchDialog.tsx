import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

// ── Types ────────────────────────────────────────────────────────────

type CreationMode = 'local' | 'push' | 'remote';
type FormState = 'idle' | 'validating' | 'fetching' | 'loading' | 'success' | 'error';

interface CreateBranchDialogProps {
  onClose: () => void;
  defaultSource?: string;      // commit OID or branch name
  defaultSourceLabel?: string; // display text
}

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
  const [setUpstream] = useState(true);
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
    setTimeout(() => nameInputRef.current?.focus(), 150);
    checkWorkingTree().then(wt => {
      if (wt) setTreeCheck(wt);
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

    if (branches) {
      for (const b of branches) {
        if (b.branch_type === 'local' && !seen.has(b.name)) {
          seen.add(b.name);
          items.push({ label: b.name, value: b.name, type: 'branch', isHead: b.is_head });
        }
      }
    }

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
    }, 400);

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
      if (hasDirtyTree && stashDecision === 'stash') {
        const stashed = await autoStash(mode === 'remote' ? selectedRemoteBranch : name.trim());
        if (!stashed) {
          setFormState('error');
          setErrorMessage('Failed to stash changes');
          return;
        }
      }

      if (mode === 'remote') {
        await safeSwitchBranch(`origin/${selectedRemoteBranch}`);
        setResult({ name: selectedRemoteBranch, oid: '', short_oid: '' });
        setFormState('success');
      } else {
        const branchResult = await createBranch(name.trim(), selectedSource || undefined);
        if (!branchResult) {
          setFormState('error');
          setErrorMessage('Failed to create branch');
          return;
        }

        await safeSwitchBranch(branchResult.name);

        if (mode === 'push') {
          const pushed = await pushBranchToRemote(branchResult.name, 'origin', setUpstream);
          if (!pushed) {
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

  // ── Render ──────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/40 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative bg-background backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl w-full max-w-[480px] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <GitBranch size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-foreground tracking-tight">Create Branch</h2>
                <p className="text-[12px] text-muted-foreground/60">Initialize a new branch from a source</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground/40 hover:text-foreground">
              <X size={16} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {formState === 'success' && result ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-8 py-10 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-dracula-green/10 border border-dracula-green/20 flex items-center justify-center mx-auto mb-6">
                  <Check size={32} className="text-dracula-green" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Branch Created!</h3>
                <p className="text-[14px] text-muted-foreground mb-8">
                  {mode === 'push' ? 'Created locally and pushed to remote' : mode === 'remote' ? 'Now tracking remote branch' : 'Created locally'}
                </p>

                <div className="bg-secondary/30 rounded-xl border border-border/30 p-5 mb-8 text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-1.5 rounded-lg bg-dracula-green/20">
                      <GitBranch size={16} className="text-dracula-green" />
                    </div>
                    <code className="text-[15px] font-mono text-primary font-bold">{result.name}</code>
                  </div>
                  {result.short_oid && (
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground ml-1">
                      <span>HEAD pointing at</span>
                      <Badge variant="secondary" className="font-mono">{result.short_oid}</Badge>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" onClick={handleCopyName} className="gap-2 font-bold">
                    <Copy size={14} /> Copy
                  </Button>
                  <Button variant="outline" onClick={() => { openTerminal(); onClose(); }} className="gap-2 font-bold">
                    <Terminal size={14} /> Terminal
                  </Button>
                  <Button variant="primary" onClick={onClose} className="font-bold">
                    Done
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="px-8 py-6 space-y-6">
                {/* Mode selector */}
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Creation Mode</label>
                  <div className="grid grid-cols-3 p-1.5 bg-secondary/30 rounded-xl border border-border/20">
                    {([
                      { key: 'local' as const, icon: <Monitor size={14} />, label: 'Local' },
                      { key: 'push' as const, icon: <ArrowUpRight size={14} />, label: 'Push' },
                      { key: 'remote' as const, icon: <Globe size={14} />, label: 'Remote' },
                    ]).map(m => (
                      <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200",
                          mode === m.key 
                            ? "bg-background shadow-lg shadow-black/20 text-primary scale-100" 
                            : "text-muted-foreground hover:text-foreground hover:bg-background/40 scale-95 opacity-60"
                        )}
                      >
                        {m.icon}
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {mode !== 'remote' ? (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    {/* Branch name input */}
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Branch Name</label>
                      <div className="relative group">
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && canSubmit) handleSubmit();
                          }}
                          placeholder="feature/branch-name"
                          className={cn(
                            "w-full bg-secondary/40 border border-border/50 rounded-xl px-4 py-3.5 pr-10 text-[14px] text-foreground font-mono transition-all duration-300",
                            "focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none",
                            validation && !validation.valid && "border-destructive/50 focus:border-destructive focus:ring-destructive/10"
                          )}
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                          {isValidating ? (
                            <Loader2 size={16} className="animate-spin text-muted-foreground/40" />
                          ) : validation?.valid ? (
                             <Check size={16} className="text-dracula-green" />
                          ) : validation && !validation.valid ? (
                            <AlertTriangle size={16} className="text-destructive" />
                          ) : null}
                        </div>
                      </div>
                      <AnimatePresence>
                        {validation && !validation.valid && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-1 text-[12px] text-destructive flex items-start gap-2"
                          >
                            <span className="font-medium">• {validation.error}</span>
                            {validation.suggestion && (
                              <button
                                onClick={() => setName(validation.suggestion!)}
                                className="text-primary hover:underline font-bold"
                              >
                                Suggestion: {validation.suggestion}
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Source selector */}
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Base Source</label>
                      <div className="relative">
                        <button
                          onClick={() => setSourceOpen(!sourceOpen)}
                          className="w-full flex items-center justify-between bg-secondary/40 border border-border/50 rounded-xl px-4 py-3.5 hover:bg-secondary/60 hover:border-border transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <GitBranch size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="truncate font-mono text-[14px] font-medium">
                              {sourceLabel || selectedSource || activeBranch || 'HEAD'}
                            </span>
                            {sourceItems.find(s => s.value === selectedSource)?.isHead && (
                              <Badge variant="secondary" className="bg-dracula-green/10 text-dracula-green border-dracula-green/20">HEAD</Badge>
                            )}
                          </div>
                          <ChevronDown size={18} className={cn("text-muted-foreground transition-transform duration-300", sourceOpen && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                          {sourceOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute top-[calc(100%+8px)] left-0 right-0 z-[100] bg-background backdrop-blur-2xl border border-border shadow-2xl rounded-2xl overflow-hidden"
                            >
                              <div className="p-3 border-b border-border/50 bg-secondary/20">
                                <div className="relative">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                  <input
                                    type="text"
                                    value={sourceFilter}
                                    onChange={e => setSourceFilter(e.target.value)}
                                    placeholder="Search branches, tags, commits..."
                                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 pl-9 text-[12px] text-foreground placeholder-muted-foreground/40 outline-none focus:border-primary transition-all"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1.5">
                                {filteredSources.length === 0 ? (
                                  <div className="py-8 text-center text-muted-foreground/40 text-[12px]">No matching sources found</div>
                                ) : (
                                  filteredSources.map(s => (
                                    <button
                                      key={s.value}
                                      onClick={() => {
                                        setSelectedSource(s.value);
                                        setSourceLabel(s.label);
                                        setSourceOpen(false);
                                        setSourceFilter('');
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] transition-all duration-200 mb-1 last:mb-0",
                                        selectedSource === s.value 
                                          ? "bg-primary/10 text-primary font-bold" 
                                          : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                                      )}
                                    >
                                      {s.type === 'branch' && <GitBranch size={14} className="shrink-0 opacity-60" />}
                                      {s.type === 'commit' && <div className="w-5 h-5 flex items-center justify-center bg-dracula-orange/10 text-dracula-orange rounded text-[9px] font-bold border border-dracula-orange/20">SHA</div>}
                                      {s.type === 'tag' && <div className="w-5 h-5 flex items-center justify-center bg-dracula-purple/10 text-dracula-purple rounded text-[9px] font-bold border border-dracula-purple/20">TAG</div>}
                                      <span className="truncate font-mono">{s.label}</span>
                                      {s.isHead && <Badge variant="secondary" className="bg-dracula-green/10 text-dracula-green ml-auto h-4 px-1 text-[8px]">HEAD</Badge>}
                                      {selectedSource === s.value && <Check size={14} className="ml-auto text-primary" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Remote Branch</label>
                      {formState === 'fetching' ? (
                        <div className="flex flex-col items-center justify-center py-12 bg-secondary/20 rounded-xl border border-border/30 border-dashed gap-4">
                          <Loader2 size={24} className="animate-spin text-primary" />
                          <span className="text-[13px] font-medium text-muted-foreground">Fetching from origin...</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                            <input
                              type="text"
                              value={remoteFilter}
                              onChange={e => setRemoteFilter(e.target.value)}
                              placeholder="Search remote branches..."
                              className="w-full bg-secondary/40 border border-border/50 rounded-xl px-4 py-3.5 pl-11 text-[14px] text-foreground font-mono transition-all outline-none focus:bg-background focus:border-primary"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-[240px] overflow-y-auto custom-scrollbar bg-secondary/20 border border-border/30 rounded-xl overflow-hidden p-1.5">
                            {filteredRemoteBranches.length === 0 ? (
                              <div className="py-12 text-center">
                                <div className="p-3 bg-secondary/50 rounded-full w-fit mx-auto mb-4">
                                  <Globe size={24} className="text-muted-foreground/20" />
                                </div>
                                <span className="text-[12px] text-muted-foreground/40 font-medium">No remote branches available</span>
                              </div>
                            ) : (
                              filteredRemoteBranches.map(b => (
                                <button
                                  key={`${b.remote}/${b.name}`}
                                  onClick={() => setSelectedRemoteBranch(b.name)}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] rounded-lg transition-all duration-200 mb-1 last:mb-0 border border-transparent",
                                    selectedRemoteBranch === b.name 
                                      ? "bg-primary/10 border-primary/20 text-primary font-bold" 
                                      : "text-muted-foreground hover:bg-background hover:text-foreground"
                                  )}
                                >
                                  <Globe size={14} className="shrink-0 opacity-60" />
                                  <span className="truncate font-mono">{b.remote}/{b.name}</span>
                                  {selectedRemoteBranch === b.name && (
                                    <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                      <Check size={12} className="text-primary-foreground" />
                                    </div>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Stash Warning / Error State */}
                <AnimatePresence>
                  {showStashWarning && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="bg-dracula-orange/10 border border-dracula-orange/20 rounded-xl p-5 space-y-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-dracula-orange/20">
                          <AlertTriangle size={18} className="text-dracula-orange" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[14px] text-dracula-orange font-bold">Uncommitted Changes</p>
                          <p className="text-[12px] text-dracula-orange/70 mt-1 leading-relaxed">
                            You have {treeCheck?.has_staged ? 'staged' : 'modified'} files. We recommend stashing them to avoid conflicts.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-12">
                        <Button size="sm" variant="primary" className="bg-dracula-orange/80 hover:bg-dracula-orange text-dracula-bg border-none font-bold px-4" onClick={() => setStashDecision('stash')}>
                          Stash & Continue
                        </Button>
                        <Button size="sm" variant="ghost" className="text-dracula-orange/60 hover:text-dracula-orange hover:bg-dracula-orange/10 font-bold" onClick={() => setStashDecision('skip')}>
                          Skip Stashing
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {formState === 'error' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="bg-destructive/10 border border-destructive/20 rounded-xl p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-destructive/20">
                          <X size={18} className="text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-destructive font-bold">Action Failed</p>
                          <p className="text-[12px] text-destructive/70 mt-1 font-mono break-all line-clamp-2">{errorMessage}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/40 hover:text-destructive" onClick={() => { navigator.clipboard.writeText(errorMessage); toast.success('Error copied'); }}>
                          <Copy size={14} />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer */}
          {formState !== 'success' && (
            <div className="px-6 py-5 border-t border-border/30 bg-secondary/10 flex items-center justify-between">
              <div className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-tighter flex items-center gap-2">
                {mode === 'push' && <><ArrowUpRight size={10} /> Will push to origin</>}
                {mode === 'local' && <><Monitor size={10} /> Local only</>}
                {mode === 'remote' && <><Globe size={10} /> Tracks remote</>}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={onClose} className="px-5 font-bold text-muted-foreground hover:text-foreground">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!canSubmit || formState === 'loading'}
                  className="px-8 font-bold shadow-lg shadow-primary/20 min-w-[140px]"
                  isLoading={formState === 'loading'}
                >
                  {mode === 'remote' ? 'Checkout' : 'Create Branch'}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
