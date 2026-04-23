import { useState } from 'react';
import { 
  Settings, 
  Type, 
  Layout, 
  Terminal, 
  Plus, 
  Minus,
  ArrowLeft,
  Cpu,
  ShieldCheck,
  Palette,
  Globe,
  RotateCcw,
  Monitor,
  Zap,
  Info,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Separator } from './ui/Separator';
import { saveCurrentState, restoreAppState } from '../services/git/repoService';
import { safeInvoke } from '../services/git/utils';
import { toast } from '../lib/toast';

type SettingsTab = 'appearance' | 'git' | 'advanced' | 'about';

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

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(10, Math.min(20, fontSize + delta));
    setFontSize(newSize);
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

  const sidebarItems = [
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'text-primary' },
    { id: 'git', label: 'Git Engine', icon: Cpu, color: 'text-dracula-cyan' },
    { id: 'advanced', label: 'Advanced', icon: Zap, color: 'text-dracula-orange' },
    { id: 'about', label: 'About', icon: Info, color: 'text-dracula-purple' },
  ];

  return (
    <div className="flex-1 flex h-full overflow-hidden relative" style={{ backgroundColor }}>
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-dracula-purple/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 flex flex-col backdrop-blur-xl z-10" style={{ backgroundColor: panelBackgroundColor }}>
        <div className="p-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTabId('home')}
            className="mb-8 group text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Button>
          
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
              <Settings size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Settings</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold opacity-50">GitKit Pro-Max</p>
            </div>
          </div>

          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as SettingsTab)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group",
                  activeTab === item.id 
                    ? "text-primary bg-primary/5 border border-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                )}
              >
                <item.icon size={18} className={cn(activeTab === item.id ? item.color : "opacity-50")} />
                <span className="text-sm font-bold">{item.label}</span>
                
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="active-tab"
                    className="absolute right-3 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-dracula-green shadow-[0_0_8px_#50fa7b]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">System Online</span>
             </div>
             <p className="text-[9px] text-muted-foreground/40 leading-relaxed">
               Hardware acceleration enabled. SQLite database persistent.
             </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        <header className="h-20 flex items-center px-10 justify-between shrink-0 bg-transparent z-10">
           <div>
             <h2 className="text-2xl font-bold tracking-tighter">
               {sidebarItems.find(i => i.id === activeTab)?.label}
             </h2>
           </div>
           
           {activeTab === 'appearance' && (
             <Button 
               variant="ghost" 
               size="xs" 
               onClick={handleResetDefaults}
               className="text-[10px] h-8 gap-2 font-bold uppercase tracking-wider text-dracula-orange hover:bg-dracula-orange/10 border border-dracula-orange/20 rounded-xl transition-all"
             >
               <RotateCcw size={12} />
               Factory Reset
             </Button>
           )}
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="max-w-[800px]"
            >
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  {/* Appearance Grid */}
                  <div className="grid grid-cols-1 gap-6">
                    <Card className="border-white/5 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl" style={{ backgroundColor: panelBackgroundColor }}>
                      <CardContent className="p-8 space-y-8">
                        {/* Font Size Selector */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Type size={18} className="text-primary" />
                              </div>
                              <span className="text-base font-bold tracking-tight">Global Font Size</span>
                            </div>
                            <p className="text-xs text-muted-foreground/60 max-w-xs">Optimize the clarity of your code and interface elements.</p>
                          </div>
                          <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10"
                              onClick={() => handleFontSizeChange(-1)}
                            >
                              <Minus size={14} />
                            </Button>
                            <div className="w-16 flex flex-col items-center">
                              <span className="text-xl font-mono font-bold text-primary leading-none">{fontSize}</span>
                              <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">PX</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10"
                              onClick={() => handleFontSizeChange(1)}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                        </div>

                        <Separator className="bg-white/5" />

                        {/* Density Selection */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-dracula-cyan/10 rounded-lg">
                                <Layout size={18} className="text-dracula-cyan" />
                              </div>
                              <span className="text-base font-bold tracking-tight">Layout Density</span>
                            </div>
                            <p className="text-xs text-muted-foreground/60 max-w-xs">Choose between an info-dense 'Pro' view or a relaxed UI.</p>
                          </div>
                          <div className="flex p-1.5 bg-black/40 rounded-2xl border border-white/5 gap-1">
                            {['compact', 'normal'].map((d) => (
                              <button
                                key={d}
                                onClick={() => {
                                  setLayoutDensity(d as any);
                                  setTimeout(saveCurrentState, 500);
                                }}
                                className={cn(
                                  "px-6 py-2 rounded-xl text-xs font-bold transition-all capitalize",
                                  layoutDensity === d 
                                    ? "bg-primary text-[#0f0f0f] shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" 
                                    : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5"
                                )}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>

                        <Separator className="bg-white/5" />

                        {/* Color Matrix */}
                        <div className="space-y-6">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-dracula-purple/10 rounded-lg">
                                <Palette size={18} className="text-dracula-purple" />
                              </div>
                              <span className="text-base font-bold tracking-tight">Visual Context Palette</span>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4">
                              {[
                                { label: 'Base Background', value: backgroundColor, setter: setBackgroundColor, key: 'background' },
                                { label: 'Panel Surface', value: panelBackgroundColor, setter: setPanelBackgroundColor, key: 'panel' },
                                { label: 'Global Borders', value: borderColor, setter: setBorderColor, key: 'border' },
                                { label: 'Toolbar Accents', value: toolbarGroupBackground, setter: setToolbarGroupBackground, key: 'toolbar' },
                              ].map((color) => (
                                <div key={color.key} className="p-4 rounded-2xl bg-black/40 border border-white/5 group hover:border-white/10 transition-colors">
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-3">{color.label}</span>
                                   <div className="flex items-center gap-3">
                                      <div 
                                        className="w-10 h-10 rounded-xl shadow-lg border border-white/10 shrink-0"
                                        style={{ backgroundColor: color.value }}
                                      />
                                      <input 
                                        type="text" 
                                        value={color.value} 
                                        onChange={(e) => {
                                          color.setter(e.target.value);
                                          setTimeout(saveCurrentState, 500);
                                        }}
                                        className="flex-1 bg-transparent border-b border-white/5 py-1 text-sm font-mono focus:border-primary/40 outline-none transition-colors"
                                      />
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Preview Mockup */}
                    <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10 rounded-3xl overflow-hidden hidden md:block">
                      <CardContent className="p-8">
                         <div className="flex items-center gap-2 mb-6">
                            <Monitor size={16} className="text-primary" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/60">Live Preview Engine</span>
                         </div>
                         <div className="aspect-video bg-[#0c0c0c] rounded-2xl border border-white/5 shadow-2xl overflow-hidden flex scale-95 origin-top border-t-white/10">
                            <div className="w-1/4 h-full border-r border-white/5 p-3 space-y-2" style={{ backgroundColor: panelBackgroundColor }}>
                               <div className="w-full h-3 bg-white/5 rounded-md" />
                               <div className="w-3/4 h-3 bg-white/5 rounded-md" />
                               <div className="w-1/2 h-3 bg-white/5 rounded-md" />
                            </div>
                            <div className="flex-1 h-full p-4 space-y-4" style={{ backgroundColor: backgroundColor }}>
                               <div className="flex gap-2">
                                  <div className="w-8 h-8 rounded-full bg-white/5" />
                                  <div className="flex-1 space-y-2">
                                     <div className="w-full h-3 bg-white/10 rounded-md" />
                                     <div className="w-2/3 h-3 bg-white/5 rounded-md" />
                                  </div>
                               </div>
                               <div className="w-full h-32 rounded-xl border border-white/5" style={{ borderColor: borderColor }} />
                            </div>
                         </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'git' && (
                <div className="space-y-6">
                  <Card className="border-white/5 backdrop-blur-md rounded-3xl overflow-hidden" style={{ backgroundColor: panelBackgroundColor }}>
                    <CardContent className="p-8 space-y-8">
                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <span className="text-base font-bold">Auto-Fetch Engine</span>
                            <p className="text-xs text-muted-foreground/60">Background synchronization with all remotes.</p>
                         </div>
                         <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-dracula-green">Active (5m)</span>
                            <Button variant="outline" className="border-white/10 text-[10px] font-bold uppercase tracking-widest h-8 rounded-xl">Adjust Logic</Button>
                         </div>
                      </div>
                      <Separator className="bg-white/5" />
                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <span className="text-base font-bold">Conflict Resolution Priority</span>
                            <p className="text-xs text-muted-foreground/60">Default strategy for handling merge conflicts.</p>
                         </div>
                         <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                            <Button variant="ghost" size="xs" className="px-4 text-[10px] font-bold uppercase tracking-widest rounded-lg">Manual</Button>
                            <Button size="xs" className="px-4 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-primary text-[#0f0f0f]">Smart Resolve</Button>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Card className="border-white/5 hover:border-primary/20 transition-all cursor-pointer group rounded-3xl" style={{ backgroundColor: panelBackgroundColor }}>
                      <CardContent className="p-6 flex items-center gap-5">
                         <div className="p-3 bg-dracula-orange/10 rounded-2xl group-hover:scale-110 transition-transform">
                            <ShieldCheck size={24} className="text-dracula-orange" />
                         </div>
                         <div className="flex-1">
                            <div className="text-sm font-bold mb-0.5">Security Audit</div>
                            <div className="text-[10px] text-muted-foreground/60">Verify GPG signatures and SSH keys.</div>
                         </div>
                         <ChevronRight size={16} className="text-muted-foreground/20" />
                      </CardContent>
                   </Card>
                   <Card className="border-white/5 hover:border-primary/20 transition-all cursor-pointer group rounded-3xl" style={{ backgroundColor: panelBackgroundColor }}>
                      <CardContent className="p-6 flex items-center gap-5">
                         <div className="p-3 bg-dracula-cyan/10 rounded-2xl group-hover:scale-110 transition-transform">
                            <Terminal size={24} className="text-dracula-cyan" />
                         </div>
                         <div className="flex-1">
                            <div className="text-sm font-bold mb-0.5">Shell Integration</div>
                            <div className="text-[10px] text-muted-foreground/60">Custom alias and path injection.</div>
                         </div>
                         <ChevronRight size={16} className="text-muted-foreground/20" />
                      </CardContent>
                   </Card>
                </div>
              )}

              {activeTab === 'about' && (
                <div className="space-y-6">
                   <div className="flex flex-col items-center py-10 text-center">
                      <div className="w-24 h-24 bg-primary/10 rounded-[40px] flex items-center justify-center mb-6 border border-primary/20 relative">
                         <motion.div 
                           animate={{ rotate: 360 }}
                           transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                           className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-[40px]"
                         />
                         <Settings size={48} className="text-primary" />
                      </div>
                      <h3 className="text-3xl font-bold tracking-tighter mb-2">GitKit Pro-Max</h3>
                      <p className="text-sm text-muted-foreground mb-8">Ultimate Developer Experience for Git Repositories</p>
                      
                      <div className="flex gap-4">
                         <Button variant="outline" className="rounded-2xl border-white/10 gap-2 h-10 px-6">
                            <Globe size={16} /> Website
                         </Button>
                         <Button variant="outline" className="rounded-2xl border-white/10 gap-2 h-10 px-6">
                            <ExternalLink size={16} /> Release Notes
                         </Button>
                      </div>
                   </div>
                   
                   <Separator className="bg-white/5" />
                   
                   <div className="grid grid-cols-2 gap-8 py-6 text-center">
                      <div>
                         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Architecture</div>
                         <div className="text-sm font-bold">Rust (Tauri V2) + React 19</div>
                      </div>
                      <div>
                         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Rendering</div>
                         <div className="text-sm font-bold">GPU Accelerated WebGL</div>
                      </div>
                   </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
