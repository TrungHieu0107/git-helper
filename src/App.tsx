import { useEffect, useRef, useState } from "react";
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from "./store";
import { loadRepo, restoreAppState, refreshActiveRepoStatus } from "./lib/repo";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { TopTabBar } from "./components/TopTabBar";
import { TopToolbar } from "./components/TopToolbar";
import { Sidebar } from "./components/Sidebar";
import { CommitGraph } from "./components/CommitGraph";
import { RightPanel } from "./components/RightPanel";
import { MainDiffView } from "./components/MainDiffView";
import { ConflictEditorView } from "./components/ConflictEditorView";
import { MergeBanner } from "./components/MergeBanner";
import { MergeDialog } from "./components/MergeDialog";
import { CheckoutAlert } from "./components/CheckoutAlert";
import { StashAlerts } from "./components/StashAlerts";
import { ForceCheckoutAlert } from "./components/ForceCheckoutAlert";
import { SetUpstreamDialog } from "./components/SetUpstreamDialog";
import { ToastContainer } from "./components/ToastContainer";
import { FileHistoryModal } from "./components/FileHistoryModal";
import { ResetCommitDialog } from "./components/ResetCommitDialog";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { setupGlobalErrorHandlers } from "./lib/error";
import { LoadingOverlay } from "./components/ui/Loading";

// App component
export function App() {
  const activeTabId = useAppStore(state => state.activeTabId);
  const isLoadingRepo = useAppStore(state => state.isLoadingRepo);
  const isProcessing = useAppStore(state => state.isProcessing);
  const processingLabel = useAppStore(state => state.processingLabel);
  const selectedDiff = useAppStore(state => state.selectedDiff);
  const activeConflictFile = useAppStore(state => state.activeConflictFile);
  const conflictVersions = useAppStore(state => state.conflictVersions);
  const showSetUpstreamDialog = useAppStore(state => state.showSetUpstreamDialog);
  const setShowSetUpstreamDialog = useAppStore(state => state.setShowSetUpstreamDialog);
  const resetToCommitTarget = useAppStore(state => state.resetToCommitTarget);
  const mergeTarget = useAppStore(state => state.mergeTarget);
  const focusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      setupGlobalErrorHandlers();
      try {
        await restoreAppState();
      } catch (err) {
        handleError(err, 'App Initialization');
      } finally {
        setIsInitializing(false);
      }
    };
    init();

    const unlistenDrop = listen('tauri://file-drop', async (event) => {
      const paths = event.payload as string[];
      if (paths.length > 0) await loadRepo(paths[0]);
    });

    const unlistenFocus = listen('focus-changed', () => {
      if (focusDebounceRef.current) clearTimeout(focusDebounceRef.current);
      focusDebounceRef.current = setTimeout(() => {
        refreshActiveRepoStatus();
      }, 300);
    });

    return () => {
      unlistenDrop.then(f => f()).catch(() => {});
      unlistenFocus.then(f => f()).catch(() => {});
      if (focusDebounceRef.current) clearTimeout(focusDebounceRef.current);
    };
  }, []);

  // Main rendering logic separated for clarity and to avoid syntax ambiguity
  const renderMainContent = () => {
    if (isInitializing) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#282c34] h-full">
           <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-[#6e7681] animate-pulse">Initializing GitKit...</span>
           </div>
        </div>
      );
    }

    if (activeTabId === 'home') {
      return <WelcomeScreen />;
    }

    return (
      <>
        <TopToolbar />
        <MergeBanner />
        <div className="flex-1 flex overflow-hidden w-full">
           <Sidebar />
           <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
              {activeConflictFile && conflictVersions ? (
                <ConflictEditorView />
              ) : selectedDiff ? (
                <MainDiffView />
              ) : (
                <CommitGraph />
              )}
           </div>
           <RightPanel />
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#282c34] text-[#a0a6b1] font-sans relative">
      <TopTabBar />
      {renderMainContent()}
      
      {isLoadingRepo && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 pointer-events-auto">
           <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
        </div>
      )}

      {isProcessing && <LoadingOverlay label={processingLabel || undefined} />}

      <CheckoutAlert />
      <StashAlerts />
      <ForceCheckoutAlert />
      {showSetUpstreamDialog && (
        <SetUpstreamDialog 
          onClose={() => setShowSetUpstreamDialog(false)} 
          onSuccess={() => {
            setShowSetUpstreamDialog(false);
            refreshActiveRepoStatus();
          }} 
        />
      )}
      <ToastContainer />
      <ConfirmDialog />
      <FileHistoryModal />
      {resetToCommitTarget && <ResetCommitDialog />}
      {mergeTarget && <MergeDialog />}
    </div>
  );
}

export default App;
