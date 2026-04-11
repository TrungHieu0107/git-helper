import { Check, ChevronDown, Globe, Info, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface EncodingBadgeProps {
  encoding: string;
  confidence: number;
  hadBom: boolean;
  onOverride: (encoding: string) => void;
}

const COMMON_ENCODINGS = [
  { label: 'Auto (Detected)', value: 'auto' },
  { label: 'Unicode (UTF-8)', value: 'utf-8' },
  { label: 'Unicode (UTF-16 LE)', value: 'utf-16le' },
  { label: 'Unicode (UTF-16 BE)', value: 'utf-16be' },
  { label: 'Japanese (Shift_JIS)', value: 'shift_jis' },
  { label: 'Japanese (EUC-JP)', value: 'euc-jp' },
  { label: 'Simplified Chinese (GBK)', value: 'gbk' },
  { label: 'Simplified Chinese (GB18030)', value: 'gb18030' },
  { label: 'Traditional Chinese (Big5)', value: 'big5' },
  { label: 'Vietnamese (Win-1258)', value: 'windows-1258' },
  { label: 'Western (ISO-8859-1)', value: 'iso-8859-1' },
  { label: 'Central European (Win-1250)', value: 'windows-1250' },
  { label: 'Cyrillic (Win-1251)', value: 'windows-1251' },
];

export function EncodingBadge({ encoding, confidence, hadBom, onOverride }: EncodingBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isLowConfidence = confidence < 0.9 && !hadBom;
  
  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all group
          ${isLowConfidence 
            ? 'bg-[#d29922]/10 border-[#d29922]/40 text-[#d29922] hover:bg-[#d29922]/20' 
            : 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:border-[#8b949e]'}`}
      >
        <div className="flex items-center gap-1.5 min-w-[80px]">
          {isLowConfidence ? (
            <AlertCircle size={12} className="shrink-0" />
          ) : hadBom ? (
            <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] shrink-0 shadow-[0_0_5px_rgba(63,185,80,0.5)]" title="BOM Detected" />
          ) : (
            <Globe size={12} className="text-[#8b949e] group-hover:text-[#c9d1d9] shrink-0" />
          )}
          <span className="truncate uppercase">{encoding}</span>
        </div>
        <ChevronDown size={10} className={`text-[#8b949e] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#161b22]/95 backdrop-blur-xl border border-[#30363d] rounded-lg shadow-2xl z-[100] py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 border-b border-[#30363d] mb-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-[#6e7681] uppercase tracking-wider">
                Detection Info
              </span>
              <div 
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1
                  ${isLowConfidence ? 'bg-[#d29922]/20 text-[#d29922]' : 'bg-[#238636]/20 text-[#3fb950]'}`}
              >
                {Math.round(confidence * 100)}% Confidence
              </div>
            </div>
            <div className="mt-1.5 flex flex-col gap-1">
               <div className="flex items-center gap-2 text-[10px] text-[#8b949e]">
                 <Info size={10} />
                 <span>Mechanism: {hadBom ? 'BOM Match' : 'Statistical'}</span>
               </div>
               {isLowConfidence && (
                 <div className="bg-[#d29922]/10 text-[#d29922] px-2 py-1 rounded text-[10px] leading-tight">
                   Encoding might be incorrect. Try a manual override if characters are garbled.
                 </div>
               )}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {COMMON_ENCODINGS.map((enc) => (
              <button
                key={enc.value}
                onClick={() => {
                  onOverride(enc.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors group ${encoding.toLowerCase() === enc.value.toLowerCase() ? 'bg-[#388bfd]/10 text-[#388bfd]' : 'text-[#c9d1d9] hover:bg-[#21262d]'}`}
              >
                <div className="flex flex-col items-start translate-x-0 group-hover:translate-x-1 transition-transform">
                  <span className="font-semibold">{enc.label}</span>
                  <span className="text-[10px] opacity-60 uppercase">{enc.value}</span>
                </div>
                {encoding.toLowerCase() === enc.value.toLowerCase() && <Check size={14} className="text-[#388bfd] drop-shadow-[0_0_3px_rgba(56,139,253,0.5)]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
