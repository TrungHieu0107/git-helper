import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch } from 'lucide-react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  className = '',
  circle = false,
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: circle ? '50%' : borderRadius,
  };

  return (
    <div 
      className={`skeleton-shimmer bg-secondary/40 relative overflow-hidden ${className}`}
      style={style}
    />
  );
};

export const GitLoader: React.FC<{ label?: string }> = ({ label = "Processing..." }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Background pulsing rings */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 border-2 border-primary/30 rounded-full"
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-4 border border-primary/20 rounded-full"
        />

        {/* Central Git Node Animation */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ 
              rotate: 360,
              borderRadius: ["20%", "50%", "20%"]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 bg-primary/10 border-2 border-primary/40 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]"
          />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <GitBranch size={28} className="text-primary" />
            </motion.div>
          </div>

          {/* Orbiting particles */}
          {[0, 120, 240].map((angle, i) => (
            <motion.div
              key={i}
              animate={{ 
                rotate: [angle, angle + 360],
              }}
              transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <motion.div 
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_#58a6ff]"
              />
            </motion.div>
          ))}
        </div>

        {/* Scanning Line */}
        <motion.div 
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 z-10 shadow-[0_0_8px_var(--primary)]"
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <motion.span 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm font-bold uppercase tracking-[0.3em] text-primary"
        >
          {label}
        </motion.span>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
              className="w-1 h-1 bg-primary/40 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const LoadingOverlay: React.FC<{ label?: string }> = ({ label }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[999] flex items-center justify-center bg-[#0f0f0f]/80 backdrop-blur-md"
    >
      <div className="relative overflow-hidden p-12 rounded-3xl border border-white/5 bg-white/[0.02] shadow-[0_24px_80px_rgba(0,0,0,0.5)] min-w-[320px] flex flex-col items-center">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/30 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/30 rounded-bl-2xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/30 rounded-br-2xl" />

        <GitLoader label={label} />
      </div>
    </motion.div>
  );
};

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className }) => {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={cn(sizeMap[size], "border-2 border-primary/20 border-t-primary rounded-full", className)}
    />
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
