import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface SectionHeaderProps {
  title: string;
  count?: number | string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  count, 
  open, 
  setOpen 
}) => {
  return (
    <div 
      onClick={() => setOpen(!open)} 
      className="flex items-center group cursor-pointer h-7 px-2 hover:bg-white/5 rounded-md transition-colors mx-1"
    >
      <ChevronDown 
        size={14} 
        className={`text-[#6e7681] transition-transform duration-200 mr-2 ${open ? '' : '-rotate-90'}`} 
      />
      <span className="section-header-text whitespace-nowrap mr-3 font-bold tracking-widest text-[9px]">
        {title}
      </span>
      <hr className="flex-1 border-[#30363d] opacity-50" />
      {count !== undefined && count !== "" && (
        <Badge variant="outline" size="xs" className="ml-3 min-w-[20px]">
          {count}
        </Badge>
      )}
    </div>
  );
};
