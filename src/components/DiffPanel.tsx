import { useAppStore } from "../store";
import { X, FileCode } from "lucide-react";

export function DiffPanel() {
  const { selectedFilePath, diffContent } = useAppStore();

  if (!selectedFilePath) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 top-[36px] bg-[#282c34] z-20 flex flex-col border-t border-[#181a1f] shadow-2xl animate-in slide-in-from-bottom duration-200">
      
      <header className="h-[36px] border-b border-[#181a1f] bg-[#21252b] flex items-center justify-between px-4 shrink-0">
         <div className="flex items-center gap-2 text-[#d7dae0]">
            <FileCode size={14} className="text-blue-400" />
            <span className="text-xs font-mono truncate max-w-[300px]">{selectedFilePath}</span>
         </div>
         <button 
           onClick={() => useAppStore.setState({ selectedFilePath: null, diffContent: null })}
           className="text-[#5c6370] hover:text-white p-1 hover:bg-white/5 rounded"
         >
            <X size={16} />
         </button>
      </header>

      <div className="flex-1 overflow-auto custom-scrollbar bg-[#1e2227]">
         {diffContent ? (
           <pre className="p-4 text-[13px] font-mono leading-relaxed whitespace-pre select-text">
             {diffContent.split('\n').map((line: string, i: number) => {
               let color = "text-[#a0a6b1]";
               let bg = "";
               if (line.startsWith('+')) {
                 color = "text-[#98c379]";
                 bg = "bg-[#98c379]/10";
               } else if (line.startsWith('-')) {
                 color = "text-[#e06c75]";
                 bg = "bg-[#e06c75]/10";
               } else if (line.startsWith('@@')) {
                 color = "text-[#61afef] opacity-80";
               } else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
                 color = "text-[#c678dd]";
               }
               
               return (
                 <div key={i} className={`px-2 ${bg} ${color} hover:bg-white/5`}>
                    <span className="opacity-50 inline-block w-8 select-none text-right mr-4">{i + 1}</span>
                    {line}
                 </div>
               );
             })}
           </pre>
         ) : (
           <div className="h-full flex flex-col items-center justify-center text-[#5c6370] gap-2">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-xs">Loading diff...</span>
           </div>
         )}
      </div>

    </div>
  );
}
