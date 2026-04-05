import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "./store";

function App() {
  const { repos, activeRepoPath, stagedFiles, unstagedFiles } = useAppStore();

  const handleOpenRepo = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected && !Array.isArray(selected)) {
      try {
        const validPath = await invoke<string>("open_repo_action", { path: selected });
        // Extract folder name
        const nameMatch = validPath.match(/[^\\/]+$/);
        const name = nameMatch ? nameMatch[0] : validPath;
        useAppStore.setState(state => ({
          repos: [...state.repos.filter(r => r.path !== validPath), { path: validPath, name }],
          activeRepoPath: validPath
        }));
        await loadStatus(validPath);
      } catch (err) {
        alert(err);
      }
    }
  };

  const loadStatus = async (path: string) => {
    try {
      const statuses = await invoke<any[]>("get_status", { repoPath: path });
      const staged = statuses.filter(s => s.status === 'staged');
      const unstaged = statuses.filter(s => s.status !== 'staged');
      useAppStore.setState({ stagedFiles: staged, unstagedFiles: unstaged, selectedFilePath: null, diffContent: null });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectFile = async (path: string, isStaged: boolean) => {
    if (!activeRepoPath) return;
    try {
      const diff = await invoke<string>("get_diff", { repoPath: activeRepoPath, path, staged: isStaged });
      useAppStore.setState({ selectedFilePath: path, diffContent: diff });
    } catch (e) {
      console.error(e);
    }
  };

  const activeRepo = repos.find(r => r.path === activeRepoPath);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-200">
      {/* Left Sidebar */}
      <aside className="w-[250px] border-r border-slate-700 bg-slate-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-700 font-bold text-sm tracking-widest text-slate-400 flex justify-between items-center">
          <span>GITKIT</span>
          <button onClick={handleOpenRepo} className="bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-xs">
            + Open
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeRepoPath ? (
            <>
              <div className="px-4 py-3 bg-slate-700/30 border-b border-slate-700">
                <div className="font-medium text-sm truncate">{activeRepo?.name}</div>
                <div className="text-xs text-slate-500 truncate" title={activeRepoPath}>{activeRepoPath}</div>
              </div>
              <div className="px-4 py-2">
                <h2 className="text-xs font-semibold uppercase text-slate-500 mt-2 mb-2">Staged Changes ({stagedFiles.length})</h2>
                {stagedFiles.map((f, i) => (
                  <div key={i} onClick={() => handleSelectFile(f.path, true)} className="text-sm py-1 cursor-pointer hover:text-blue-400 truncate text-green-400">
                    + {f.path}
                  </div>
                ))}
                
                <h2 className="text-xs font-semibold uppercase text-slate-500 mt-6 mb-2">Unstaged Changes ({unstagedFiles.length})</h2>
                {unstagedFiles.map((f, i) => (
                  <div key={i} onClick={() => handleSelectFile(f.path, false)} className="text-sm py-1 cursor-pointer hover:text-blue-400 truncate text-orange-400">
                    M {f.path}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-4 flex-1">
              <h2 className="text-xs uppercase text-slate-500 mb-2">Repositories</h2>
              <div className="text-sm text-slate-400 italic">No repos open. Click + Open above.</div>
            </div>
          )}
        </div>
      </aside>

      {/* Center Main Panel (Diff Viewer) */}
      <main className="flex-1 flex flex-col bg-slate-900 border-r border-slate-700 min-w-0">
        <DiffViewerWrapper />
      </main>

      {/* Right Detail Panel (Commit Panel) */}
      <aside className="w-[300px] border-l border-slate-700 bg-slate-800 flex flex-col flex-shrink-0">
         <CommitPanelWrapper loadStatus={loadStatus} />
      </aside>
    </div>
  );
}

function DiffViewerWrapper() {
  const { selectedFilePath, diffContent } = useAppStore();
  if (!selectedFilePath) return (
    <div className="flex-1 p-4 flex items-center justify-center text-slate-500">
      Select a file to view diff
    </div>
  );
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-10 border-b border-slate-700 flex items-center px-4 bg-slate-800/50 shrink-0">
        <div className="text-sm font-medium font-mono">{selectedFilePath}</div>
      </header>
      <div className="flex-1 overflow-auto bg-[#1e1e1e] p-4 text-sm font-mono whitespace-pre-wrap">
        {diffContent ? diffContent.split('\n').map((line, idx) => {
          let style = { color: '#d4d4d4', backgroundColor: 'transparent' };
          if (line.startsWith('+') && !line.startsWith('+++')) style = { color: '#4ade80', backgroundColor: '#14532d55' };
          else if (line.startsWith('-') && !line.startsWith('---')) style = { color: '#f87171', backgroundColor: '#7f1d1d55' };
          else if (line.startsWith('@@ ')) style = { color: '#60a5fa' };
          
          return <div key={idx} style={style}>{line || ' '}</div>;
        }) : <div className="text-slate-500">No diff contents or binary file</div>}
      </div>
    </div>
  );
}

function CommitPanelWrapper({ loadStatus }: { loadStatus: (path: string) => void }) {
  const { activeRepoPath, stagedFiles, selectedFilePath } = useAppStore();
  const [message, setMessage] = useState('');
  
  if (!activeRepoPath) return (
    <div className="flex-1 p-4 flex items-center justify-center text-slate-500">
      Open a repository
    </div>
  );

  const handleStageAll = async () => {
    try {
      await invoke("stage_all", { repoPath: activeRepoPath });
      loadStatus(activeRepoPath);
    } catch (e) { alert(e); }
  };

  const handleStageFile = async (path: string) => {
    try {
      await invoke("stage_file", { repoPath: activeRepoPath, path });
      loadStatus(activeRepoPath);
    } catch (e) { alert(e); }
  };

  const handleUnstageFile = async (path: string) => {
    try {
      await invoke("unstage_file", { repoPath: activeRepoPath, path });
      loadStatus(activeRepoPath);
    } catch (e) { alert(e); }
  };

  const handleCommit = async () => {
    if (!message.trim() || stagedFiles.length === 0) return;
    try {
      const parentOid = await invoke<string>("create_commit", { 
        repoPath: activeRepoPath, 
        message, 
        amend: false 
      });
      setMessage('');
      loadStatus(activeRepoPath);
      // alert("Committed: " + parentOid.substring(0, 7)); // Optionally show toast
    } catch(e) {
      alert("Error committing: " + e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="h-10 border-b border-slate-700 flex items-center px-4 shrink-0 bg-slate-800">
        <div className="text-sm font-medium">Commit Panel</div>
      </header>
      
      {selectedFilePath && (
        <div className="p-4 border-b border-slate-700">
          <div className="text-sm mb-2 text-slate-400">Focus: <span className="text-slate-300 font-mono text-xs">{selectedFilePath}</span></div>
          <div className="flex gap-2">
             <button onClick={() => handleStageFile(selectedFilePath)} className="flex-1 py-1 px-2 border border-blue-500/50 hover:bg-blue-500/20 text-blue-400 text-xs rounded transition-colors">Stage File</button>
             <button onClick={() => handleUnstageFile(selectedFilePath)} className="flex-1 py-1 px-2 border border-orange-500/50 hover:bg-orange-500/20 text-orange-400 text-xs rounded transition-colors">Unstage File</button>
          </div>
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col gap-3">
        <button 
          onClick={handleStageAll}
          className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-sm font-medium rounded transition-colors"
        >
          Stage All Untracked / Modified
        </button>

        <textarea 
          placeholder="Commit message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="w-full flex-1 min-h-[150px] bg-slate-900 border border-slate-600 rounded p-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
        ></textarea>
        
        {/* Amend checkbox placeholder for UI */}
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input type="checkbox" className="rounded border-slate-600 bg-slate-900 filter accent-blue-500" disabled />
          Amend previous commit
        </label>

        <button 
          onClick={handleCommit}
          disabled={stagedFiles.length === 0 || !message.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold rounded transition-colors"
        >
          Commit to HEAD
        </button>
      </div>
    </div>
  );
}

export default App;
