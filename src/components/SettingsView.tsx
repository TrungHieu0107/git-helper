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
  Globe,
  RotateCcw
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Separator } from './ui/Separator';
import { saveCurrentState, restoreAppState } from '../services/git/repoService';
import { safeInvoke } from '../services/git/utils';
import { toast } from '../lib/toast';

export function SettingsView() {
  const { 
    fontSize, setFontSize, 
    backgroundColor, setBackgroundColor,
    borderColor, setBorderColor,
    panelBackgroundColor, setPanelBackgroundColor,
    toolbarGroupBackground, setToolbarGroupBackground,
    layoutDensity, setLayoutDensity,
    setActiveTabId 
  } = useAppStore();

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(10, Math.min(20, fontSize + delta));
    setFontSize(newSize);
    // Debounce or just save after change
    setTimeout(saveCurrentState, 500);
  };

  const handleResetDefaults = async () => {
    try {
      await safeInvoke('reset_config', { key: null });
      await restoreAppState();
      toast.success('Settings reset to default');
    } catch (err) {
      toast.error('Failed to reset settings');
    }
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
             <h1 className="text-xl font-bold tracking-tighter">Application Settings</h1>
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
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                    <Palette size={16} className="text-primary" />
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Appearance & Typography</h2>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="xs" 
                   onClick={handleResetDefaults}
                   className="text-[10px] h-7 gap-1.5 font-bold uppercase tracking-wider text-dracula-orange hover:bg-dracula-orange/10 border border-dracula-orange/20 rounded-lg transition-all"
                 >
                   <RotateCcw size={12} />
                   Reset to Defaults
                 </Button>
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
                        <span className="w-12 text-center font-mono font-bold text-primary text-lg">{fontSize}px</span>
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
                         <Button 
                           size="xs" 
                           onClick={() => {
                             setLayoutDensity('compact');
                             setTimeout(saveCurrentState, 500);
                           }}
                           className={cn(
                             "px-4 font-bold transition-all",
                             layoutDensity === 'compact' ? "bg-background text-primary shadow-sm" : "bg-transparent text-muted-foreground/50 hover:text-muted-foreground"
                           )}
                         >
                           Compact
                         </Button>
                         <Button 
                           size="xs" 
                           onClick={() => {
                             setLayoutDensity('normal');
                             setTimeout(saveCurrentState, 500);
                           }}
                           className={cn(
                             "px-4 font-bold transition-all",
                             layoutDensity === 'normal' ? "bg-background text-primary shadow-sm" : "bg-transparent text-muted-foreground/50 hover:text-muted-foreground"
                           )}
                         >
                           Normal
                         </Button>
                      </div>
                   </div>

                   <Separator className="bg-border/20" />

                   {/* Custom Colors */}
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                         <div className="flex items-center gap-2">
                            <Palette size={18} className="text-muted-foreground" />
                            <span className="text-sm font-bold">Custom Theme Colors</span>
                         </div>
                         <p className="text-xs text-muted-foreground/60">Set custom hex codes for background and borders.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground/40 ml-1">Background</span>
                          <div className="flex items-center bg-background/50 border border-border/20 rounded-lg overflow-hidden focus-within:border-primary/40 transition-colors">
                            <div 
                              className="w-4 h-4 rounded-sm ml-1.5 shrink-0" 
                              style={{ backgroundColor: backgroundColor }}
                            />
                            <input 
                              type="text" 
                              value={backgroundColor} 
                              onChange={(e) => {
                                setBackgroundColor(e.target.value);
                                setTimeout(saveCurrentState, 500);
                              }}
                              className="bg-transparent px-2 py-1.5 text-[11px] font-mono w-24 outline-none border-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground/40 ml-1">Panels</span>
                          <div className="flex items-center bg-background/50 border border-border/20 rounded-lg overflow-hidden focus-within:border-primary/40 transition-colors">
                            <div 
                              className="w-4 h-4 rounded-sm ml-1.5 shrink-0" 
                              style={{ backgroundColor: panelBackgroundColor }}
                            />
                            <input 
                              type="text" 
                              value={panelBackgroundColor} 
                              onChange={(e) => {
                                setPanelBackgroundColor(e.target.value);
                                setTimeout(saveCurrentState, 500);
                              }}
                              className="bg-transparent px-2 py-1.5 text-[11px] font-mono w-24 outline-none border-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground/40 ml-1">Border</span>
                          <div className="flex items-center bg-background/50 border border-border/20 rounded-lg overflow-hidden focus-within:border-primary/40 transition-colors">
                            <div 
                              className="w-4 h-4 rounded-sm ml-1.5 shrink-0" 
                              style={{ backgroundColor: borderColor }}
                            />
                            <input 
                              type="text" 
                              value={borderColor} 
                              onChange={(e) => {
                                setBorderColor(e.target.value);
                                setTimeout(saveCurrentState, 500);
                              }}
                              className="bg-transparent px-2 py-1.5 text-[11px] font-mono w-32 outline-none border-none"
                            />
                          </div>
                        </div>
                         <div className="flex flex-col gap-1">
                           <span className="text-[9px] uppercase font-bold text-muted-foreground/40 ml-1">Toolbar Group</span>
                           <div className="flex items-center bg-background/50 border border-border/20 rounded-lg overflow-hidden focus-within:border-primary/40 transition-colors">
                             <div 
                               className="w-4 h-4 rounded-sm ml-1.5 shrink-0" 
                               style={{ backgroundColor: toolbarGroupBackground }}
                             />
                             <input 
                               type="text" 
                               value={toolbarGroupBackground} 
                               onChange={(e) => {
                                 setToolbarGroupBackground(e.target.value);
                                 setTimeout(saveCurrentState, 500);
                               }}
                               className="bg-transparent px-2 py-1.5 text-[11px] font-mono w-24 outline-none border-none"
                             />
                           </div>
                         </div>
                      </div>
                   </div>
                </CardContent>
             </Card>
          </section>

          {/* Git Performance Section */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 px-2">
                <Cpu size={16} className="text-primary" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Git & Performance</h2>
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
                         <Button variant="outline" size="xs" className="border-border/30 text-[10px] font-bold uppercase">Change</Button>
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
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Security & Integrations</h2>
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
