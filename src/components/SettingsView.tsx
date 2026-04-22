import { 
  Settings, 
  Type, 
  Layout, 
  Terminal, 
  Plus, 
  Minus,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  Palette,
  Globe
} from 'lucide-react';
import { useAppStore } from '../store';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Separator } from './ui/Separator';
import { saveCurrentState } from '../services/git/repoService';

export function SettingsView() {
  const { fontSize, setFontSize, setActiveTabId } = useAppStore();

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(10, Math.min(20, fontSize + delta));
    setFontSize(newSize);
    // Debounce or just save after change
    setTimeout(saveCurrentState, 500);
  };

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border/40 flex items-center px-8 justify-between shrink-0 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setActiveTabId('home')}
            className="rounded-full hover:bg-secondary"
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-xl">
               <Settings size={20} className="text-primary" />
             </div>
             <h1 className="text-xl font-black tracking-tighter">Application Settings</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Version 1.2.0</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-[800px] mx-auto space-y-8">
          
          {/* Appearance Section */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 px-2">
                <Palette size={16} className="text-primary" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Appearance & Typography</h2>
             </div>
             
             <Card className="bg-secondary/10 border-border/30 overflow-hidden">
                <CardContent className="p-6 space-y-6">
                   {/* Font Size */}
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                         <div className="flex items-center gap-2">
                            <Type size={18} className="text-muted-foreground" />
                            <span className="text-sm font-bold">Global Font Size</span>
                         </div>
                         <p className="text-xs text-muted-foreground/60">Adjust the overall text scale of the application.</p>
                      </div>
                      <div className="flex items-center gap-3 bg-background/50 p-1.5 rounded-2xl border border-border/20 shadow-inner">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-background shadow-sm rounded-xl"
                          onClick={() => handleFontSizeChange(-1)}
                        >
                          <Minus size={14} />
                        </Button>
                        <span className="w-12 text-center font-mono font-black text-primary text-lg">{fontSize}px</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-background shadow-sm rounded-xl"
                          onClick={() => handleFontSizeChange(1)}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                   </div>

                   <Separator className="bg-border/20" />

                   {/* Layout Density */}
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                         <div className="flex items-center gap-2">
                            <Layout size={18} className="text-muted-foreground" />
                            <span className="text-sm font-bold">IDE Layout Density</span>
                         </div>
                         <p className="text-xs text-muted-foreground/60">Toggle between high-density and relaxed layouts.</p>
                      </div>
                      <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-xl">
                         <Button size="xs" className="px-4 font-bold bg-background text-primary shadow-sm">Compact</Button>
                         <Button size="xs" variant="ghost" className="px-4 font-bold text-muted-foreground/50">Normal</Button>
                      </div>
                   </div>
                </CardContent>
             </Card>
          </section>

          {/* Git Performance Section */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 px-2">
                <Cpu size={16} className="text-primary" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Git & Performance</h2>
             </div>
             <Card className="bg-secondary/10 border-border/30">
                <CardContent className="p-6 space-y-6">
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                         <span className="text-sm font-bold">Auto-Fetch Interval</span>
                         <p className="text-xs text-muted-foreground/60">Background fetch frequency for remote updates.</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-mono text-muted-foreground">Every 5 mins</span>
                         <Button variant="outline" size="xs" className="border-border/30 text-[10px] font-black uppercase">Change</Button>
                      </div>
                   </div>
                   <Separator className="bg-border/20" />
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                         <span className="text-sm font-bold">Default Pull Strategy</span>
                         <p className="text-xs text-muted-foreground/60">Preferred way to handle remote changes.</p>
                      </div>
                      <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-xl">
                         <Button size="xs" variant="ghost" className="px-3 text-[10px] font-bold">Merge</Button>
                         <Button size="xs" className="px-3 text-[10px] font-bold bg-background text-primary shadow-sm">Rebase</Button>
                         <Button size="xs" variant="ghost" className="px-3 text-[10px] font-bold">FF Only</Button>
                      </div>
                   </div>
                </CardContent>
             </Card>
          </section>

          {/* Integration & Security */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 px-2">
                <ShieldCheck size={16} className="text-primary" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Security & Integrations</h2>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <Card className="bg-secondary/10 border-border/30 hover:border-primary/30 transition-colors cursor-pointer group">
                   <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2 bg-[#24292e] rounded-lg group-hover:scale-110 transition-transform">
                         <Globe size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                         <div className="text-xs font-bold">GitHub Account</div>
                         <div className="text-[10px] text-dracula-green flex items-center gap-1">
                            <CheckCircle2 size={10} /> Connected
                         </div>
                      </div>
                   </CardContent>
                </Card>
                <Card className="bg-secondary/10 border-border/30 hover:border-primary/30 transition-colors cursor-pointer group">
                   <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2 bg-secondary rounded-lg group-hover:scale-110 transition-transform">
                         <Terminal size={20} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                         <div className="text-xs font-bold">External Terminal</div>
                         <div className="text-[10px] text-muted-foreground/60">PowerShell Core</div>
                      </div>
                   </CardContent>
                </Card>
             </div>
          </section>

          <footer className="pt-12 pb-8 flex flex-col items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-dracula-green animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Backend Engine: Rust v1.78.0-nightly</span>
             </div>
             <p className="text-[9px] text-muted-foreground/20 text-center max-w-[400px]">
                GitKit uses hardware-accelerated rendering and a low-latency Rust core for maximum productivity. Settings are synchronized with app_state.json.
             </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
