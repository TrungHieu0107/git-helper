import { useRef, useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import { DiffEditor } from "@monaco-editor/react";
import { X, Columns, AlignLeft, ArrowUp, ArrowDown, FileCode, Binary, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EncodingBadge } from "./EncodingBadge";
import { useAppStore } from "../store";
import { Spinner } from "./ui/Loading";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Separator } from "./ui/Separator";
import { cn } from "../lib/utils";

export interface MainDiffViewProps {
  path?: string;
  staged?: boolean;
  commitOid?: string;
  hideClose?: boolean;
  onClose?: () => void;
}

export function MainDiffView(props: MainDiffViewProps) {
  const store = useAppStore();
  
  const path = props.path ?? store.selectedDiff?.path;
  const staged = props.staged ?? store.selectedDiff?.staged ?? false;
  const commitOid = props.commitOid ?? store.selectedDiff?.commitOid;
  
  const { activeRepoPath, refreshTimestamp, fontSize } = store;

  const [oldContent, setOldContent] = useState<string | null>(null);
  const [newContent, setNewContent] = useState<string | null>(null);
  const [isBinary, setIsBinary] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSplitMode, setIsSplitMode] = useState<boolean>(true);
  const [isFullFile, setIsFullFile] = useState<boolean>(false);
  
  const [detection, setDetection] = useState<{ encoding: string, confidence: number, hadBom: boolean }>({
    encoding: 'utf-8',
    confidence: 1.0,
    hadBom: false
  });
  const [forceEncoding, setForceEncoding] = useState<string | null>(null);
  
  const [changes, setChanges] = useState<any[]>([]);
  const [currentChangeIndex, setCurrentChangeIndex] = useState<number>(-1);
  const diffEditorRef = useRef<any>(null);
  const prevTimestampRef = useRef<number>(refreshTimestamp);
  const lastSelectionRef = useRef<string | null>(null);

  const handleEditorMount = (editor: any) => {
    diffEditorRef.current = editor;

    editor.onDidUpdateDiff(() => {
      const lineChanges = editor.getLineChanges() || [];
      setChanges(lineChanges);
      if (lineChanges.length > 0) {
        setCurrentChangeIndex(0);
        if (lastSelectionRef.current !== null) {
          const change = lineChanges[0];
          const modEditor = editor.getModifiedEditor();
          const targetLine = Math.max(1, change.modifiedStartLineNumber);
          modEditor.revealLineInCenter(targetLine);
          modEditor.setPosition({ lineNumber: targetLine, column: 1 });
        }
      } else {
        setCurrentChangeIndex(-1);
      }
    });

    editor.getModifiedEditor().onDidChangeCursorPosition((e: any) => {
      const lineChanges = editor.getLineChanges() || [];
      const line = e.position.lineNumber;
      let activeIndex = -1;
      for (let i = 0; i < lineChanges.length; i++) {
        const c = lineChanges[i];
        if (line >= c.modifiedStartLineNumber && (c.modifiedEndLineNumber === 0 || line <= c.modifiedEndLineNumber)) {
          activeIndex = i;
          break;
        }
      }
      if (activeIndex !== -1) {
        setCurrentChangeIndex(activeIndex);
      }
    });
  };

  useEffect(() => {
    if (diffEditorRef.current) {
      diffEditorRef.current.updateOptions({
        hideUnchangedRegions: {
          enabled: !isFullFile,
          revealLineCount: 5,
          minimumLineCount: 2,
          contextLineCount: 3,
        }
      });
    }
  }, [isFullFile]);

  const nextChange = () => {
    if (!diffEditorRef.current || changes.length === 0) return;
    const nextIdx = (currentChangeIndex + 1) % changes.length;
    setCurrentChangeIndex(nextIdx);
    
    const change = changes[nextIdx];
    const editor = diffEditorRef.current.getModifiedEditor();
    
    const targetLine = Math.max(1, change.modifiedStartLineNumber);
    editor.setPosition({ lineNumber: targetLine, column: 1 });
    editor.revealLineInCenter(targetLine);
    editor.focus();
  };

  const previousChange = () => {
    if (!diffEditorRef.current || changes.length === 0) return;
    const prevIdx = currentChangeIndex <= 0 ? changes.length - 1 : currentChangeIndex - 1;
    setCurrentChangeIndex(prevIdx);
    
    const change = changes[prevIdx];
    const editor = diffEditorRef.current.getModifiedEditor();
    
    const targetLine = Math.max(1, change.modifiedStartLineNumber);
    editor.setPosition({ lineNumber: targetLine, column: 1 });
    editor.revealLineInCenter(targetLine);
    editor.focus();
  };

  useEffect(() => {
    if (!path || !activeRepoPath) return;

    let isMounted = true;
    const selectionKey = `${path}-${staged}-${commitOid}`;
    const isNewSelection = lastSelectionRef.current !== selectionKey;
    const isRefresh = !isNewSelection && prevTimestampRef.current !== refreshTimestamp;
    
    lastSelectionRef.current = selectionKey;
    prevTimestampRef.current = refreshTimestamp;

    if (isNewSelection) {
      setForceEncoding(null);
    }

    if (!isRefresh) {
      setIsLoading(true);
      setError(null);
      setIsBinary(false);
    }

    invoke<any>('get_file_contents', {
      repoPath: activeRepoPath,
      path: path,
      commitOid: commitOid || null,
      staged: staged,
      forceEncoding: forceEncoding === 'auto' ? null : forceEncoding
    })
      .then((res) => {
        if (!isMounted) return;
        
        const models = diffEditorRef.current?.getModel();
        if (isRefresh && models && !res.is_binary) {
          models.original.setValue(res.old_content || "");
          models.modified.setValue(res.new_content || "");
        } else {
          setOldContent(res.old_content || "");
          setNewContent(res.new_content || "");
        }
        
        setDetection({
          encoding: res.encoding,
          confidence: res.confidence,
          hadBom: res.had_bom
        });
        setIsBinary(res.is_binary);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err === 'FILE_TOO_LARGE') {
          setError('File is too large to preview (> 5 MB). Open in external editor.');
        } else {
          setError(typeof err === 'string' ? err : 'Unknown error');
        }
        setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [path, staged, commitOid, activeRepoPath, forceEncoding, refreshTimestamp]);

  const handleEncodingOverride = (enc: string) => {
    setForceEncoding(enc === 'auto' ? null : enc);
  };

  useEffect(() => {
    return () => {
      const editor = diffEditorRef.current;
      if (editor) {
        try {
          // Retrieve models before detaching so we can dispose them manually
          const model = editor.getModel();
          editor.setModel(null);
          // Dispose orphaned models to prevent memory leaks
          if (model) {
            model.original?.dispose();
            model.modified?.dispose();
          }
        } catch (_) {
          // Silently handle race condition with @monaco-editor/react internal cleanup
        }
        diffEditorRef.current = null;
      }
    };
  }, []);

  if (!path) return null;

  const closeView = () => {
    if (props.onClose) {
      props.onClose();
    } else {
      useAppStore.setState({ selectedDiff: null });
    }
  };

  const extension = path.split('.').pop()?.toLowerCase();
  const getLanguage = (ext: string | undefined) => {
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
  };
  const language = getLanguage(extension);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background relative z-10 border-r border-border overflow-hidden">
      
      {/* Diff Toolbar */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-10 px-4 shrink-0 flex items-center justify-between border-b border-border bg-background/50 backdrop-blur-sm z-20"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 rounded-md bg-secondary/50 text-muted-foreground">
            <FileCode size={14} />
          </div>
          <span className="text-[13px] font-mono text-foreground font-medium truncate tracking-tight">
            {path}
          </span>
          <Badge variant="glass" className="h-5 px-1.5 font-mono text-[9px] border-none uppercase opacity-60">
            {commitOid ? `Commit ${commitOid.substring(0, 7)}` : staged ? 'Staged' : 'Unstaged'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          
          <div className="flex items-center bg-secondary/30 rounded-lg border border-border/50 p-0.5">
            <Button
               variant="ghost"
               size="xs"
               onClick={() => setIsFullFile(false)}
               className={cn("h-6 px-2 text-[10px] uppercase font-bold tracking-wider", !isFullFile && "bg-background shadow-sm text-foreground")}
            >
               Hunks
            </Button>
            <Button
               variant="ghost"
               size="xs"
               onClick={() => setIsFullFile(true)}
               className={cn("h-6 px-2 text-[10px] uppercase font-bold tracking-wider", isFullFile && "bg-background shadow-sm text-foreground")}
            >
               Full
            </Button>
          </div>

          <Separator orientation="vertical" className="h-4 mx-1 opacity-50" />

          <div className="flex items-center bg-secondary/30 rounded-lg border border-border/50 p-0.5">
            <Button
               variant="ghost"
               size="icon"
               onClick={previousChange}
               title="Previous Change"
               className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
               <ArrowUp size={12} />
            </Button>
            <span className="text-[10px] text-muted-foreground min-w-[32px] text-center font-mono font-bold opacity-60">
              {changes.length > 0 ? `${currentChangeIndex + 1}/${changes.length}` : '0/0'}
            </span>
            <Button
               variant="ghost"
               size="icon"
               onClick={nextChange}
               title="Next Change"
               className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
               <ArrowDown size={12} />
            </Button>
          </div>

          <div className="flex items-center bg-secondary/30 rounded-lg border border-border/50 p-0.5">
            <Button
               variant="ghost"
               size="icon"
               onClick={() => setIsSplitMode(true)}
               title="Side-by-Side"
               className={cn("h-6 w-6 text-muted-foreground hover:text-foreground", isSplitMode && "bg-background shadow-sm text-primary")}
            >
               <Columns size={12} />
            </Button>
            <Button
               variant="ghost"
               size="icon"
               onClick={() => setIsSplitMode(false)}
               title="Inline"
               className={cn("h-6 w-6 text-muted-foreground hover:text-foreground", !isSplitMode && "bg-background shadow-sm text-primary")}
            >
               <AlignLeft size={12} />
            </Button>
          </div>

          <EncodingBadge 
            encoding={detection.encoding}
            confidence={detection.confidence}
            hadBom={detection.hadBom}
            onOverride={handleEncodingOverride}
          />

          {!props.hideClose && (
            <>
              <Separator orientation="vertical" className="h-4 mx-1 opacity-50" />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={closeView} 
                className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X size={16} />
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Editor Content Area */}
      <div className="flex-1 relative overflow-hidden bg-background">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background z-50"
            >
               <Spinner label="Analyzing diff..." />
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-destructive p-6 text-center bg-background z-[60]"
            >
              <AlertCircle size={32} className="mb-4 opacity-50" />
              <p className="text-sm font-medium max-w-md leading-relaxed">
                {error}
              </p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-6">
                Retry Connection
              </Button>
            </motion.div>
          ) : isBinary ? (
            <motion.div 
              key="binary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground italic text-sm bg-background z-40"
            >
              <Binary size={32} className="mb-4 opacity-20" />
              Binary file contents cannot be displayed
            </motion.div>
          ) : (
            <motion.div 
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full"
            >
              <DiffEditor
                original={oldContent || ""}
                modified={newContent || ""}
                language={language}
                theme="vs-dark"
                onMount={handleEditorMount}
                keepCurrentOriginalModel={true}
                keepCurrentModifiedModel={true}
                options={{
                  renderSideBySide: isSplitMode,
                  readOnly: true,
                  minimap: { enabled: false },
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  fontSize: fontSize - 1,
                  scrollBeyondLastLine: false,
                  renderOverviewRuler: false,
                  ignoreTrimWhitespace: false,
                  wordWrap: "off",
                  useInlineViewWhenSpaceIsLimited: false,
                  hideUnchangedRegions: {
                    enabled: !isFullFile,
                    revealLineCount: 5,
                    minimumLineCount: 2,
                    contextLineCount: 3,
                  },
                  folding: true,
                  lineNumbersMinChars: 3,
                  glyphMargin: true,
                  renderIndicators: true,
                  originalEditable: false,
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    useShadows: false,
                    verticalHasArrows: false,
                    horizontalHasArrows: false,
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
