import { useEffect } from "react";
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from "./store";
import { loadRepo } from "./lib/repo";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { TopToolbar } from "./components/TopToolbar";
import { Sidebar } from "./components/Sidebar";
import { CommitGraph } from "./components/CommitGraph";
import { RightPanel } from "./components/RightPanel";
import { MainDiffView } from "./components/MainDiffView";
import { CheckoutAlert } from "./components/CheckoutAlert";
import { ToastContainer } from "./components/ToastContainer";

function App() {
  const activeRepoPath = useAppStore(state => state.activeRepoPath);
  const isLoadingRepo = useAppStore(state => state.isLoadingRepo);
  const selectedDiff = useAppStore(state => state.selectedDiff);

  useEffect(() => {
    const unlisten = listen('tauri://file-drop', async (event) => {
      const paths = event.payload as string[];
      if (paths.length > 0) await loadRepo(paths[0]);
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  if (!activeRepoPath) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#282c34] text-[#a0a6b1] font-sans relative">
      <TopToolbar />
      <div className="flex-1 flex overflow-hidden w-full">
         <Sidebar />
         {selectedDiff ? <MainDiffView /> : <CommitGraph />}
         <RightPanel />
      </div>
      
      {isLoadingRepo && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 pointer-events-auto">
           <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
        </div>
      )}

      <CheckoutAlert />
      <ToastContainer />
    </div>
  );
}

export default App;
