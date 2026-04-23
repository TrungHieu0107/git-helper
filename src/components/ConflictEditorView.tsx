import { useState, useRef, useEffect } from "react";
import { resolveConflictFile } from "../lib/repo";
import { useAppStore } from "../store";
import { toast } from "../lib/toast";
import { Editor, useMonaco } from "@monaco-editor/react";
import { CheckCircle, X, ShieldAlert, Zap, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { parseConflictMarkers, ParsedConflict, ConflictHunk } from "../lib/conflictParser";
import { buildOursDecorations, buildTheirsDecorations, buildResultDecorations } from "../lib/monacoDecorations";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Separator } from "./ui/Separator";

export function ConflictEditorView() {
  const { 
    activeRepoPath, 
    activeConflictFile, 
    activeConflictMode, 
    conflictVersions, 
    isLoadingConflict, 
    cherryPickConflictedOid,
    closeConflictEditor,
    fontSize
  } = useAppStore();
  
  const oursEditorRef = useRef<any>(null);
  const theirsEditorRef = useRef<any>(null);
  const resultEditorRef = useRef<any>(null);
  
  const [parsed, setParsed] = useState<ParsedConflict | null>(null);
  const monaco = useMonaco();
  const oursDecsRef = useRef<any>(null);
  const theirsDecsRef = useRef<any>(null);
  const resultDecsRef = useRef<any>(null);
  const [mountedEditors, setMountedEditors] = useState(0);
  const [currentHunkIndex, setCurrentHunkIndex] = useState(0);
  const [remainingConflicts, setRemainingConflicts] = useState(0);

  useEffect(() => {
    if (conflictVersions?.raw) {
      setParsed(parseConflictMarkers(conflictVersions.raw));
    } else {
      setParsed(null);
    }
  }, [conflictVersions?.raw]);

  useEffect(() => {
    if (parsed && resultEditorRef.current && monaco) {
      try {
        const editor = resultEditorRef.current;
        editor.setValue(parsed.displayBase);
        refreshHiddenAreas();
        setRemainingConflicts(parsed.hunks.length);
        setCurrentHunkIndex(0);
        
        const disposable = editor.onDidChangeModelContent(() => {
          refreshHiddenAreas();
          updateRemainingCount();
        });
        
        return () => disposable.dispose();
      } catch (e) {
        console.warn("Failed to initialize result editor:", e);
      }
    }
  }, [parsed, monaco, mountedEditors]);

  const updateRemainingCount = () => {
    if (!resultEditorRef.current) return;
    const content = resultEditorRef.current.getValue();
    const count = (content.match(/^<<<<<<< /gm) || []).length;
    setRemainingConflicts(count);
  };

  useEffect(() => {
    if (!parsed || !monaco) return;
    
    const updateDecorations = (editor: any, decsRef: any, builder: any) => {
      if (!editor) return;
      const decs = builder(parsed.hunks, monaco.Range, currentHunkIndex);
      if (editor.createDecorationsCollection) {
        decsRef.current = editor.createDecorationsCollection(decs);
      } else {
        editor.deltaDecorations([], decs);
      }
    };

    updateDecorations(oursEditorRef.current, oursDecsRef, buildOursDecorations);
    updateDecorations(theirsEditorRef.current, theirsDecsRef, buildTheirsDecorations);
    updateDecorations(resultEditorRef.current, resultDecsRef, buildResultDecorations);
  }, [parsed, monaco, mountedEditors, currentHunkIndex]);

  useEffect(() => {
    if (mountedEditors === 3) {
      let isSyncing = false;
      const syncScroll = (source: string, e: any) => {
        if (isSyncing) return;
        isSyncing = true;
        const editors = [
          { name: 'ours', ref: oursEditorRef },
          { name: 'result', ref: resultEditorRef },
          { name: 'theirs', ref: theirsEditorRef }
        ];

        editors.forEach(ed => {
          if (ed.name !== source && ed.ref.current) {
            ed.ref.current.setScrollTop(e.scrollTop);
            ed.ref.current.setScrollLeft(e.scrollLeft);
          }
        });
        
        requestAnimationFrame(() => isSyncing = false);
      };

      const d1 = oursEditorRef.current?.onDidScrollChange((e: any) => syncScroll('ours', e));
      const d2 = resultEditorRef.current?.onDidScrollChange((e: any) => syncScroll('result', e));
      const d3 = theirsEditorRef.current?.onDidScrollChange((e: any) => syncScroll('theirs', e));
      
      return () => {
        d1?.dispose();
        d2?.dispose();
        d3?.dispose();
      };
    }
  }, [mountedEditors, parsed]);

  useEffect(() => {
    if (!monaco || !resultEditorRef.current || !parsed) return;
    
    const editor = resultEditorRef.current;
    const widgets: any[] = [];

    parsed.hunks.forEach((hunk) => {
      const id = `widget-${hunk.id}`;
      const domNode = document.createElement('div');
      domNode.className = 'conflict-action-bar flex items-center gap-1.5 bg-background backdrop-blur-md border border-border/50 rounded-xl shadow-2xl p-1.5 z-50';
      domNode.style.cssText = 'pointer-events: auto !important; z-index: 9999; position: relative;';
      
      const createBtn = (label: string, variant: string, type: 'ours' | 'theirs' | 'both') => {
        const btn = document.createElement('button');
        btn.innerText = label;
        btn.className = cn(
          "px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all duration-200 active:scale-95",
          variant === 'ours' ? "bg-dracula-green/20 text-dracula-green hover:bg-dracula-green/30" :
          variant === 'theirs' ? "bg-dracula-orange/20 text-dracula-orange hover:bg-dracula-orange/30" :
          "bg-dracula-cyan/20 text-dracula-cyan hover:bg-dracula-cyan/30"
        );
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          resolveHunk(hunk, type);
        };
        return btn;
      };

      domNode.appendChild(createBtn('Accept Ours', 'ours', 'ours'));
      domNode.appendChild(createBtn('Accept Theirs', 'theirs', 'theirs'));
      domNode.appendChild(createBtn('Both', 'both', 'both'));

      const widget = {
        getId: () => id,
        getDomNode: () => domNode,
        getPosition: () => ({
          position: { lineNumber: hunk.markerStartLine + 1, column: 1 },
          preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE]
        })
      };

      editor.addContentWidget(widget);
      widgets.push(widget);
    });

    return () => {
      widgets.forEach(w => editor.removeContentWidget(w));
    };
  }, [monaco, parsed, mountedEditors, remainingConflicts]);

  if (!activeConflictFile || !conflictVersions || !activeRepoPath) return null;

  const handleResolve = () => {
    if (!resultEditorRef.current || !activeConflictFile) return;
    const resolvedContent = resultEditorRef.current.getValue();
    resolveConflictFile(activeRepoPath!, activeConflictFile, resolvedContent);
    
    const store = useAppStore.getState();
    const currentMsg = store.commitMessage;
    const resolvedText = `Resolved conflict in ${activeConflictFile}`;
    if (!currentMsg) {
      store.setCommitMessage(resolvedText);
    } else if (!currentMsg.includes(activeConflictFile)) {
      store.setCommitMessage(`${currentMsg}\n${resolvedText}`);
    }
  };

  const goToNext = () => {
    if (!parsed || parsed.hunks.length === 0) return;
    const nextIndex = (currentHunkIndex + 1) % parsed.hunks.length;
    setCurrentHunkIndex(nextIndex);
    revealHunk(nextIndex);
  };

  const goToPrev = () => {
    if (!parsed || parsed.hunks.length === 0) return;
    const prevIndex = (currentHunkIndex - 1 + parsed.hunks.length) % parsed.hunks.length;
    setCurrentHunkIndex(prevIndex);
    revealHunk(prevIndex);
  };

  const revealHunk = (index: number) => {
    if (!parsed || !parsed.hunks[index]) return;
    const hunk = parsed.hunks[index];
    [resultEditorRef, oursEditorRef, theirsEditorRef].forEach(ref => {
      ref.current?.revealLineInCenter(hunk.markerStartLine);
    });
  };

  const resolveHunk = (hunk: ConflictHunk, type: 'ours' | 'theirs' | 'both') => {
    if (!resultEditorRef.current) return;
    const model = resultEditorRef.current.getModel();
    if (!model) return;

    const currentContent = model.getValue();
    const eol = currentContent.includes('\r\n') ? '\r\n' : '\n';
    const normalizedContent = currentContent.replace(/\r\n/g, '\n');
    const startMarker = `<<<<<<< CONFLICT ${hunk.id} >>>>>>>`;
    const endMarker = `>>>>>>> END CONFLICT ${hunk.id} >>>>>>>`;

    const startIndex = normalizedContent.indexOf(startMarker);
    const endIndex = normalizedContent.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      toast.error('Conflict block not found. It may have been manually modified.');
      return;
    }

    let newText = "";
    const hOurs = hunk.oursContent || "";
    const hTheirs = hunk.theirsContent || "";
    
    if (type === 'ours') newText = hOurs;
    else if (type === 'theirs') newText = hTheirs;
    else newText = hOurs + (hOurs && hTheirs ? "\n" : "") + hTheirs;

    const newNormalized = normalizedContent.slice(0, startIndex) + newText + normalizedContent.slice(endIndex + endMarker.length);
    const finalContent = eol === '\r\n' ? newNormalized.replace(/\n/g, '\r\n') : newNormalized;

    model.setValue(finalContent);
    updateRemainingCount();
    goToNext();
  };

  const refreshHiddenAreas = () => {
    if (!resultEditorRef.current || !monaco) return;
    const editor = resultEditorRef.current;
    const model = editor.getModel();
    if (!model) return;

    const hiddenAreas: any[] = [];
    const lines = model.getLinesContent();
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('<<<<<<< CONFLICT') || lines[i].startsWith('>>>>>>> END CONFLICT')) {
        hiddenAreas.push(new monaco.Range(i + 1, 1, i + 1, 1));
      }
    }
    editor.setHiddenAreas(hiddenAreas);
  };

  const useOurs = () => {
    if (resultEditorRef.current && parsed) {
      resultEditorRef.current.setValue(parsed.oursContent);
    }
  };

  const useTheirs = () => {
    if (resultEditorRef.current && parsed) {
      resultEditorRef.current.setValue(parsed.theirsContent);
    }
  };
  
  const handleMount = (editor: any, ref: any) => {
    ref.current = editor;
    setMountedEditors((prev: number) => prev + 1);
  };

  const language = (() => {
    const ext = activeConflictFile?.split('.').pop()?.toLowerCase();
    switch(ext) {
      case 'ts': case 'tsx': return 'typescript';
      case 'js': case 'jsx': return 'javascript';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'rs': return 'rust';
      case 'py': return 'python';
      case 'go': return 'go';
      case 'yaml': case 'yml': return 'yaml';
      case 'sql': return 'sql';
      case 'xml': return 'xml';
      case 'sh': case 'bash': return 'shell';
      default: return 'plaintext';
    }
  })();

  const sharedOptions = {
    minimap: { enabled: false },
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: fontSize - 1,
    scrollBeyondLastLine: false,
    renderOverviewRuler: false,
    wordWrap: "off" as const,
    lineNumbersMinChars: 3,
    glyphMargin: true,
    folding: true,
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col min-w-0 bg-background relative z-10 border-r border-border/50 overflow-hidden"
    >
      {/* Premium Navigation Toolbar */}
      <div className="h-[52px] px-6 shrink-0 flex items-center justify-between border-b border-border/30 bg-background backdrop-blur-2xl shadow-sm z-30">
        <div className="flex items-center gap-6 overflow-hidden">
          <div className="flex flex-col gap-0.5 min-w-0">
             <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-foreground tracking-tight truncate">
                  {activeConflictFile}
                </span>
                <Badge variant="secondary" className="px-1.5 py-0 font-mono text-[10px] bg-secondary/50 border-border/20">
                  {activeConflictMode}
                </Badge>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-dracula-red animate-pulse shadow-[0_0_8px_rgba(255,85,85,0.5)]" />
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                  Resolution required
                </span>
             </div>
          </div>
          
          <Separator orientation="vertical" className="h-6 opacity-30" />
          
          <div className="flex items-center gap-1.5 bg-secondary/30 rounded-xl border border-border/20 p-1">
            <Button variant="ghost" size="icon" onClick={goToPrev} className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <ChevronLeft size={14}/>
            </Button>
            <span className="text-[11px] font-mono font-bold text-primary px-2 min-w-[50px] text-center">
              {parsed && parsed.hunks.length > 0 ? `${currentHunkIndex + 1} / ${parsed.hunks.length}` : '0 / 0'}
            </span>
            <Button variant="ghost" size="icon" onClick={goToNext} className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <ChevronRight size={14}/>
            </Button>
          </div>
          
          {remainingConflicts > 0 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-3 py-1 bg-dracula-red/10 text-dracula-red text-[11px] font-bold rounded-full border border-dracula-red/20 flex items-center gap-2"
            >
              <ShieldAlert size={12} />
              {remainingConflicts} REMAINING
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={useOurs}
              className="text-dracula-green hover:text-dracula-green/80 hover:bg-dracula-green/10 border-dracula-green/20 font-bold px-4"
            >
              Take Ours
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={useTheirs}
              className="text-dracula-orange hover:text-dracula-orange/80 hover:bg-dracula-orange/10 border-dracula-orange/20 font-bold px-4"
            >
              Take Theirs
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6 opacity-30 mx-1" />

          <Button 
            variant="primary"
            size="sm"
            onClick={handleResolve}
            disabled={remainingConflicts > 0}
            className={cn(
              "font-bold tracking-wide px-6 shadow-lg",
              remainingConflicts > 0 ? "opacity-50 grayscale" : "shadow-primary/20"
            )}
          >
            {remainingConflicts > 0 ? <Zap size={14} className="mr-2" /> : <CheckCircle size={14} className="mr-2" />}
            Mark Resolved
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={closeConflictEditor} 
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <X size={18} />
          </Button>
        </div>
      </div>

      {/* Editor Grid */}
      <div className="flex-1 grid grid-cols-3 gap-1.5 p-1.5 bg-secondary/10">
        
        {/* Ours Pane */}
        <div className="flex flex-col border border-border/40 rounded-2xl overflow-hidden bg-background/50 shadow-inner group">
           <div className="flex items-center justify-between px-4 py-2.5 bg-dracula-green/5 border-b border-dracula-green/10 transition-colors group-hover:bg-dracula-green/10">
             <div className="flex items-center gap-2.5">
               <div className="w-2 h-2 bg-dracula-green rounded-full shadow-[0_0_8px_rgba(80,250,123,0.4)]" />
               <span className="text-dracula-green text-[11px] font-bold tracking-[0.2em] uppercase">OURS</span>
             </div>
             <Badge variant="outline" className="font-mono text-[9px] border-dracula-green/20 text-dracula-green/60 uppercase">LOCAL BRANCH</Badge>
           </div>
           <div className="flex-1 relative">
             <Editor
               value={parsed?.oursContent || ""}
               language={language}
               theme="vs-dark"
               onMount={(editor) => handleMount(editor, oursEditorRef)}
               options={{ ...sharedOptions, readOnly: true }}
             />
           </div>
        </div>

        {/* Result Pane (Active/Elevated) */}
        <div className="flex flex-col border-2 border-primary/30 rounded-2xl overflow-hidden bg-background shadow-2xl z-20 scale-[1.01] transition-transform duration-500">
           <div className="flex items-center justify-between px-4 py-2.5 bg-primary/10 border-b border-primary/20">
             <div className="flex items-center gap-2.5">
               <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(189,147,249,0.4)] animate-pulse" />
               <span className="text-primary text-[11px] font-bold tracking-[0.2em] uppercase">RESULT</span>
             </div>
             <div className="flex items-center gap-2">
               <span className="text-[10px] text-muted-foreground font-bold italic opacity-60">Manual editing allowed</span>
             </div>
           </div>
           <div className="flex-1 relative">
             <AnimatePresence>
               {isLoadingConflict && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-background backdrop-blur-md flex items-center justify-center"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 size={32} className="animate-spin text-primary" />
                      <span className="text-[11px] text-primary font-bold uppercase tracking-widest animate-pulse">Syncing Conflict State...</span>
                    </div>
                  </motion.div>
               )}
             </AnimatePresence>
             <Editor
               defaultValue={parsed?.displayBase || ""}
               language={language}
               theme="vs-dark"
               onMount={(editor) => handleMount(editor, resultEditorRef)}
               options={sharedOptions}
             />
           </div>
        </div>

        {/* Theirs Pane */}
        <div className="flex flex-col border border-border/40 rounded-2xl overflow-hidden bg-background/50 shadow-inner group">
           <div className="flex items-center justify-between px-4 py-2.5 bg-dracula-orange/5 border-b border-dracula-orange/10 transition-colors group-hover:bg-dracula-orange/10">
             <div className="flex items-center gap-2.5">
               <div className="w-2 h-2 bg-dracula-orange rounded-full shadow-[0_0_8px_rgba(255,184,108,0.4)]" />
               <span className="text-dracula-orange text-[11px] font-bold tracking-[0.2em] uppercase">THEIRS</span>
             </div>
             <Badge variant="outline" className="font-mono text-[9px] border-dracula-orange/20 text-dracula-orange/60 uppercase">
               {cherryPickConflictedOid ? cherryPickConflictedOid.substring(0, 7) : 'INCOMING'}
             </Badge>
           </div>
           <div className="flex-1 relative">
             <Editor
               value={parsed?.theirsContent || ""}
               language={language}
               theme="vs-dark"
               onMount={(editor) => handleMount(editor, theirsEditorRef)}
               options={{ ...sharedOptions, readOnly: true }}
             />
           </div>
        </div>
      </div>
    </motion.div>
  );
}
