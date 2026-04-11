import { useRef, useEffect, useState } from "react";
import { useAppStore } from "../store";
import { resolveConflictFile } from "../lib/repo";
import { Editor, useMonaco } from "@monaco-editor/react";
import { X, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { parseConflictMarkers, ParsedConflict } from "../lib/conflictParser";
import { buildOursDecorations, buildTheirsDecorations, buildResultDecorations } from "../lib/monacoDecorations";

export function ConflictEditorView() {
  const { activeRepoPath, selectedConflictFile, conflictVersions, isLoadingConflict, cherryPickConflictedOid } = useAppStore();
  
  const oursEditorRef = useRef<any>(null);
  const theirsEditorRef = useRef<any>(null);
  const resultEditorRef = useRef<any>(null);
  
  const [parsed, setParsed] = useState<ParsedConflict | null>(null);
  const monaco = useMonaco();
  const oursDecsRef = useRef<any>(null);
  const theirsDecsRef = useRef<any>(null);
  const resultDecsRef = useRef<any>(null);
  const [mountedEditors, setMountedEditors] = useState(0);

  // Unmount models properly when closing
  useEffect(() => {
    return () => {
    };
  }, [selectedConflictFile]);

  useEffect(() => {
    if (conflictVersions?.raw) {
      setParsed(parseConflictMarkers(conflictVersions.raw));
    } else {
      setParsed(null);
    }
  }, [conflictVersions?.raw]);

  // Set the initial result content natively so we can keep it uncontrolled but reset on file change
  useEffect(() => {
    if (parsed && resultEditorRef.current) {
      resultEditorRef.current.setValue(parsed.resultContent);
    }
  }, [parsed]);

  useEffect(() => {
    if (!parsed || !monaco) return;
    
    if (oursEditorRef.current) {
      const decs = buildOursDecorations(parsed.hunks, monaco.Range);
      if (oursEditorRef.current.createDecorationsCollection) {
        oursDecsRef.current = oursEditorRef.current.createDecorationsCollection(decs);
      } else {
        oursEditorRef.current.deltaDecorations([], decs);
      }
    }
    
    if (theirsEditorRef.current) {
      const decs = buildTheirsDecorations(parsed.hunks, monaco.Range);
      if (theirsEditorRef.current.createDecorationsCollection) {
        theirsDecsRef.current = theirsEditorRef.current.createDecorationsCollection(decs);
      } else {
        theirsEditorRef.current.deltaDecorations([], decs);
      }
    }
    
    if (resultEditorRef.current) {
      const decs = buildResultDecorations(parsed.hunks, monaco.Range);
      if (resultEditorRef.current.createDecorationsCollection) {
        resultDecsRef.current = resultEditorRef.current.createDecorationsCollection(decs);
      } else {
        resultEditorRef.current.deltaDecorations([], decs);
      }
    }
  }, [parsed, monaco, mountedEditors]);

  useEffect(() => {
    if (mountedEditors === 3) {
      let isSyncing = false;
      const syncScroll = (source: string, e: any) => {
        if (isSyncing) return;
        isSyncing = true;
        if (source !== 'ours') oursEditorRef.current?.setScrollTop(e.scrollTop);
        if (source !== 'result') resultEditorRef.current?.setScrollTop(e.scrollTop);
        if (source !== 'theirs') theirsEditorRef.current?.setScrollTop(e.scrollTop);
        
        if (source !== 'ours') oursEditorRef.current?.setScrollLeft(e.scrollLeft);
        if (source !== 'result') resultEditorRef.current?.setScrollLeft(e.scrollLeft);
        if (source !== 'theirs') theirsEditorRef.current?.setScrollLeft(e.scrollLeft);
        
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

  if (!selectedConflictFile || !conflictVersions || !activeRepoPath) return null;

  const closeView = () => {
    useAppStore.setState({ selectedConflictFile: null, conflictVersions: null });
  };

  const handleResolve = () => {
    if (!resultEditorRef.current) return;
    const resolvedContent = resultEditorRef.current.getValue();
    resolveConflictFile(activeRepoPath, selectedConflictFile, resolvedContent);
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
    setMountedEditors(prev => prev + 1);
  };

  // Determine Monaco language heuristically from extension
  const extension = selectedConflictFile.split('.').pop()?.toLowerCase();
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

  const sharedOptions = {
    minimap: { enabled: false },
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: 12,
    scrollBeyondLastLine: false,
    renderOverviewRuler: false,
    wordWrap: "off" as const,
  };



  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] relative z-10 border-r border-[#30363d] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      
      {/* Premium Glassmorphic Toolbar */}
      <div className="h-[48px] px-4 shrink-0 flex items-center justify-between border-b border-[#30363d]/50 bg-[#161b22]/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex flex-col">
             <span className="text-[13px] font-mono text-[#e6edf3] font-semibold truncate drop-shadow-sm">
               {selectedConflictFile}
             </span>
             <span className="text-[10px] text-[#8b949e]">merging conflict</span>
          </div>
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#d29922]/20 to-[#f85149]/20 text-[#d29922] border border-[#d29922]/30 uppercase tracking-widest shadow-[0_0_8px_rgba(210,153,34,0.15)] flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#d29922] rounded-full animate-pulse"></div>
            3-Way Conflict
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 ml-4">
          <button 
            onClick={useOurs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636]/10 text-[#3fb950] border border-[#238636]/30 hover:bg-[#238636]/20 hover:border-[#3fb950]/50 transition-all duration-200 rounded-md text-[11px] font-bold uppercase hover:-translate-y-[0.5px] active:translate-y-[0.5px]"
          >
            <ArrowRight size={13} className="opacity-80" /> Use Ours
          </button>
          
          <button 
            onClick={useTheirs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/30 hover:bg-[#d29922]/20 hover:border-[#d29922]/50 transition-all duration-200 rounded-md text-[11px] font-bold uppercase hover:-translate-y-[0.5px] active:translate-y-[0.5px]"
          >
            <ArrowLeft size={13} className="opacity-80" /> Use Theirs
          </button>

          <div className="w-px h-5 bg-[#30363d] mx-2"></div>

          <button 
            onClick={handleResolve}
            className="group flex items-center gap-2 px-4 py-1.5 bg-gradient-to-b from-[#2ea043] to-[#238636] text-white hover:from-[#3fb950] hover:to-[#2ea043] transition-all duration-300 rounded-md text-[11px] font-bold uppercase tracking-wide shadow-[0_2px_10px_rgba(35,134,54,0.4)] hover:shadow-[0_4px_15px_rgba(35,134,54,0.6)] hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300"></div>
            <CheckCircle size={14} className="relative z-10 drop-shadow-md" /> 
            <span className="relative z-10 drop-shadow-md">Mark as Resolved</span>
          </button>

          <button 
            onClick={closeView} 
            className="ml-2 text-[#8b949e] hover:text-white hover:bg-[#30363d]/80 transition-all duration-200 p-1.5 rounded-md active:scale-95"
            title="Close editor without saving"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 3-Pane Layout with Premium Borders */}
      <div className="flex-1 flex flex-row min-h-0 bg-[#0d1117] p-1 gap-1">
        
        {/* Left Pane: Ours */}
        <div className="flex-1 flex flex-col border border-[#30363d] rounded-lg overflow-hidden bg-[#161b22]/50 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]">
           <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#21262d] to-transparent border-b border-[#30363d]">
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-[#3fb950] rounded-full shadow-[0_0_5px_rgba(63,185,80,0.8)]"></div>
               <span className="text-[#3fb950] text-[11px] font-sans font-bold uppercase tracking-widest drop-shadow-sm">OURS</span>
             </div>
             <span className="text-[#8b949e] text-[10px] font-mono bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">HEAD</span>
           </div>
           <div className="flex-1 relative pt-1">
             <Editor
               value={parsed?.oursContent || ""}
               language={language}
               theme="vs-dark"
               onMount={(editor) => handleMount(editor, oursEditorRef)}
               options={{ ...sharedOptions, readOnly: true }}
             />
           </div>
        </div>

        {/* Center Pane: Result (Elevated) */}
        <div className="flex-1 flex flex-col border border-[#58a6ff]/40 rounded-lg overflow-hidden bg-[#0d1117] shadow-[0_0_20px_rgba(88,166,255,0.05),0_0_40px_rgba(0,0,0,0.5)] transform scale-[1.01] z-20">
           <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#1f6feb]/20 to-[#161b22] border-b border-[#58a6ff]/30">
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-[#58a6ff] rounded-full shadow-[0_0_5px_rgba(88,166,255,0.8)]"></div>
               <span className="text-[#e6edf3] text-[11px] font-sans font-extrabold uppercase tracking-widest drop-shadow-sm">RESULT</span>
             </div>
             <span className="text-[#8b949e] text-[10px] italic pr-1 opacity-70">Edit directly to resolve</span>
           </div>
           <div className="flex-1 relative pt-1">
             {isLoadingConflict && (
                <div className="absolute inset-0 z-50 bg-[#0d1117]/60 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                   <div className="flex flex-col items-center gap-3">
                     <div className="w-8 h-8 rounded-full border-t-2 border-b-2 border-[#58a6ff] animate-spin"></div>
                     <span className="text-[11px] text-[#58a6ff] uppercase tracking-widest font-semibold animate-pulse">Loading Conflict Data...</span>
                   </div>
                </div>
             )}
             <Editor
               defaultValue={parsed?.resultContent || ""}
               language={language}
               theme="vs-dark"
               onMount={(editor) => handleMount(editor, resultEditorRef)}
               options={sharedOptions}
             />
           </div>
        </div>

        {/* Right Pane: Theirs */}
        <div className="flex-1 flex flex-col border border-[#30363d] rounded-lg overflow-hidden bg-[#161b22]/50 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]">
           <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#21262d] to-transparent border-b border-[#30363d]">
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-[#d29922] rounded-full shadow-[0_0_5px_rgba(210,153,34,0.8)]"></div>
               <span className="text-[#d29922] text-[11px] font-sans font-bold uppercase tracking-widest drop-shadow-sm">THEIRS</span>
             </div>
             <span className="text-[#8b949e] text-[10px] font-mono bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d] truncate max-w-[80px]">
               {cherryPickConflictedOid ? cherryPickConflictedOid.substring(0, 7) : 'Incoming'}
             </span>
           </div>
           <div className="flex-1 relative pt-1">
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
    </div>
  );
}
