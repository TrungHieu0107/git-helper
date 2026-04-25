import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from "./store";
import { loadRepo, restoreAppState, refreshActiveRepoStatus } from "./services/git/repoService";
import { autoFetch } from "./services/git/repoService"; // Assuming autoFetch was in repoService or I should add it
import { WelcomeScreen } from "./components/WelcomeScreen";
import { SettingsView } from "./components/SettingsView";
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
import { setupGlobalErrorHandlers, handleError } from "./lib/error";
import { LoadingOverlay, GitLoader } from "./components/ui/Loading";
import { CreateBranchDialog } from "./components/CreateBranchDialog";
import { CreateStashDialog } from "./components/CreateStashDialog";

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
  const showCreateBranch = useAppStore(state => state.showCreateBranch);
  const setShowCreateBranch = useAppStore(state => state.setShowCreateBranch);
  const showCreateStash = useAppStore(state => state.showCreateStash);
  const setShowCreateStash = useAppStore(state => state.setShowCreateStash);
  const focusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const fontSize = useAppStore(state => state.fontSize);
  const backgroundColor = useAppStore(state => state.backgroundColor);
  const borderColor = useAppStore(state => state.borderColor);
  const panelBackgroundColor = useAppStore(state => state.panelBackgroundColor);
  const layoutDensity = useAppStore(state => state.layoutDensity);
  const toolbarGroupBackground = useAppStore(state => state.toolbarGroupBackground);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--app-background', backgroundColor);
    document.documentElement.style.setProperty('--app-panel-background', panelBackgroundColor);
    document.documentElement.style.setProperty('--app-border', borderColor);
    document.documentElement.style.setProperty('--toolbar-group-background', toolbarGroupBackground);
    
    // Layout Density logic
    const rowHeight = layoutDensity === 'compact' ? 24 : 32;
    const gapMultiplier = layoutDensity === 'compact' ? 1 : 1.5;
    
    document.documentElement.style.setProperty('--row-height', `${rowHeight}px`);
    document.documentElement.style.setProperty('--app-gap-sm', layoutDensity === 'compact' ? '5px' : '12px');
    document.documentElement.style.setProperty('--app-gap-md', layoutDensity === 'compact' ? '10px' : '16px');
  }, [fontSize, backgroundColor, panelBackgroundColor, borderColor, layoutDensity, toolbarGroupBackground]);

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
      if (paths.length > 0) {
        await loadRepo(paths[0]);
        autoFetch(paths[0]);
      }
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
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0f0f0f] h-full relative overflow-hidden">
           {/* Subtle background glow */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
           
           <GitLoader label="Initializing GitKit Pro-Max..." />
        </div>
      );
    }

    if (activeTabId === 'home') {
      return <WelcomeScreen />;
    }

    if (activeTabId === 'settings') {
      return <SettingsView />;
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground font-sans relative">
      <TopTabBar />
      {renderMainContent()}
      
      <AnimatePresence>
        {isLoadingRepo && <LoadingOverlay label="Syncing Repository..." />}
        {isProcessing && <LoadingOverlay label={processingLabel || undefined} />}
      </AnimatePresence>

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
      {showCreateBranch && <CreateBranchDialog onClose={() => setShowCreateBranch(false)} />}
      {showCreateStash && <CreateStashDialog onClose={() => setShowCreateStash(false)} />}
    </div>
  );
}

export default App;
