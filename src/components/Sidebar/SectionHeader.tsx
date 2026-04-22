import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface SectionHeaderProps {
  title: string;
  count?: number | string;
  open: boolean;
  setOpen: (open: boolean) => void;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  count, 
  open, 
  setOpen,
  className
}) => {
  return (
    <button 
      onClick={() => setOpen(!open)} 
      className={cn(
        "w-full flex items-center group h-8 px-2 hover:bg-secondary/50 rounded-md transition-all",
        className
      )}
    >
      <motion.div
        animate={{ rotate: open ? 0 : -90 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <ChevronDown size={12} className="text-muted-foreground mr-2 group-hover:text-foreground transition-colors" />
      </motion.div>
      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground group-hover:text-foreground transition-colors">
        {title}
      </span>
      <div className="flex-1 mx-3 h-[1px] bg-border opacity-30" />
      {count !== undefined && count !== "" && (
        <Badge variant="glass" className="font-mono text-[9px] h-4 min-w-[20px] px-1 shadow-none border-none opacity-60 group-hover:opacity-100">
          {count}
        </Badge>
      )}
    </button>
  );
};
