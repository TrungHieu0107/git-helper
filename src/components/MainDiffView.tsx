import { useRef, useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import { DiffEditor } from "@monaco-editor/react";
import { X, Columns, AlignLeft, ArrowUp, ArrowDown } from "lucide-react";
import { EncodingBadge } from "./EncodingBadge";
import { useAppStore } from "../store";

export interface MainDiffViewProps {
  path?: string;
  staged?: boolean;
  commitOid?: string;
  hideClose?: boolean;
  onClose?: () => void;
}



export function MainDiffView(props: MainDiffViewProps) {
  const store = useAppStore();
  
  // Prioritize props over store for portability (Bug 4 mitigation)
  const path = props.path ?? store.selectedDiff?.path;
  const staged = props.staged ?? store.selectedDiff?.staged ?? false;
  const commitOid = props.commitOid ?? store.selectedDiff?.commitOid;
  
  const { activeRepoPath, refreshTimestamp } = store;

  const [oldContent, setOldContent] = useState<string | null>(null);
  const [newContent, setNewContent] = useState<string | null>(null);
  const [isBinary, setIsBinary] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSplitMode, setIsSplitMode] = useState<boolean>(true);
  const [isFullFile, setIsFullFile] = useState<boolean>(false);
  
  // Encoding metadata
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
        // Auto-reveal first hunk on load
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

  // Force update editor options when toggle changes to ensure collapse works
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

    // Reset force encoding on new file selection (Bug 4 mitigation)
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
        setError(typeof err === 'string' ? err : 'Unknown error');
        setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [path, staged, commitOid, activeRepoPath, forceEncoding, refreshTimestamp]);

  // Handle local override from EncodingBadge
  const handleEncodingOverride = (enc: string) => {
    setForceEncoding(enc === 'auto' ? null : enc);
  };

  // Cleanup effect

  useEffect(() => {
    return () => {
      if (diffEditorRef.current) {
        try {
          diffEditorRef.current.setModel(null);
        } catch (e) {
          console.warn("Monaco: Failed to detach models during cleanup", e);
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
    <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] relative z-10 border-r border-[#30363d] overflow-hidden animate-in fade-in duration-200">
      
      {/* Diff Toolbar */}
      <div className="h-[40px] px-4 shrink-0 flex items-center justify-between border-b border-[#30363d] bg-[#161b22]">
        <div className="flex items-center gap-3 overflow-hidden text-[#8b949e]">
          <span className="text-[13px] font-mono text-[#c9d1d9] truncate">
            {path}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#21262d] border border-[#30363d] uppercase">
            {commitOid ? `Commit ${commitOid.substring(0, 7)}` : staged ? 'Staged' : 'Unstaged'}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          
          <div className="flex items-center bg-[#21262d] rounded-md border border-[#30363d] p-0.5 mx-2 text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">
            <button
               onClick={() => setIsFullFile(false)}
               className={`px-2 py-1 rounded ${!isFullFile ? 'bg-[#30363d] text-white shadow-sm' : 'hover:text-[#c9d1d9] hover:bg-[#30363d] transition-colors'}`}
            >
               Hunks
            </button>
            <button
               onClick={() => setIsFullFile(true)}
               className={`px-2 py-1 rounded ${isFullFile ? 'bg-[#30363d] text-white shadow-sm' : 'hover:text-[#c9d1d9] hover:bg-[#30363d] transition-colors'}`}
            >
               Full
            </button>
          </div>

          <div className="flex items-center bg-[#21262d] rounded-md border border-[#30363d] p-0.5">
            <button
               onClick={previousChange}
               title="Previous Change"
               className="p-1 rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
            >
               <ArrowUp size={14} />
            </button>
            <span className="text-[10px] text-[#8b949e] min-w-[32px] text-center font-mono">
              {changes.length > 0 ? `${currentChangeIndex + 1}/${changes.length}` : '0/0'}
            </span>
            <button
               onClick={nextChange}
               title="Next Change"
               className="p-1 rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
            >
               <ArrowDown size={14} />
            </button>
          </div>

          <div className="flex items-center bg-[#21262d] rounded-md border border-[#30363d] p-0.5">
            <button
               onClick={() => setIsSplitMode(true)}
               title="Side-by-Side"
               className={`p-1 rounded ${isSplitMode ? 'bg-[#30363d] text-white shadow-sm' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
               <Columns size={14} />
            </button>
            <button
               onClick={() => setIsSplitMode(false)}
               title="Inline"
               className={`p-1 rounded ${!isSplitMode ? 'bg-[#30363d] text-white shadow-sm' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
               <AlignLeft size={14} />
            </button>
          </div>

          <EncodingBadge 
            encoding={detection.encoding}
            confidence={detection.confidence}
            hadBom={detection.hadBom}
            onOverride={handleEncodingOverride}
          />

          {!props.hideClose && (
            <>
              <div className="w-px h-4 bg-[#30363d] mx-1"></div>
              <button onClick={closeView} className="text-[#8b949e] hover:text-white transition-colors p-1 hover:bg-[#30363d] rounded">
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 relative overflow-hidden">
        
        {!isBinary && (
          <DiffEditor
            original={oldContent || ""}
            modified={newContent || ""}
            language={language}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{
              renderSideBySide: isSplitMode,
              readOnly: true,
              minimap: { enabled: false },
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: 12,
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
              // Add some extra stability options
              renderIndicators: true,
              originalEditable: false,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10
              }
            }}
          />
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#8b949e] gap-3 bg-[#0d1117] z-[50]">
             <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
             <span className="text-xs">Loading diff...</span>
          </div>
        )}

        {error && (
           <div className="absolute inset-0 flex items-center justify-center text-red-400 p-6 text-center text-sm font-mono bg-[#0d1117] z-[60]">
              Error: {error}
           </div>
        )}

        {isBinary && (
           <div className="absolute inset-0 flex items-center justify-center text-[#8b949e] italic text-sm bg-[#0d1117] z-[40]">
             Binary file cannot be displayed
           </div>
        )}
      </div>

    </div>
  );
}
