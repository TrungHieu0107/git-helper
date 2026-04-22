import React from 'react';

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

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'currentColor',
  className = '',
  label,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div 
        className={`${sizeMap[size]} border-t-dracula-cyan border-r-transparent border-b-dracula-cyan border-l-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(139,233,253,0.3)]`}
        style={{ borderColor: `${color} transparent ${color} transparent` } as any}
      />
      {label && <span className="text-sm font-medium text-muted-foreground animate-pulse">{label}</span>}
    </div>
  );
};

export const LoadingOverlay: React.FC<{ label?: string }> = ({ label }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-secondary/40 border border-border/30 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-4 scale-in-center">
        <Spinner size="lg" label={label} />
      </div>
    </div>
  );
};
