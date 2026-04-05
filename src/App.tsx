import { TopToolbar } from "./components/TopToolbar";
import { Sidebar } from "./components/Sidebar";
import { CommitGraph } from "./components/CommitGraph";
import { RightPanel } from "./components/RightPanel";

function App() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#282c34] text-[#a0a6b1] font-sans">
      <TopToolbar />
      <div className="flex-1 flex overflow-hidden w-full">
         <Sidebar />
         <CommitGraph />
         <RightPanel />
      </div>
    </div>
  );
}

export default App;
