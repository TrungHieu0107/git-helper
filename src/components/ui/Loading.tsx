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
      className={`skeleton-shimmer bg-[#30363d] relative overflow-hidden ${className}`}
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
        className={`${sizeMap[size]} border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]`}
        style={{ borderColor: `${color} transparent ${color} transparent` } as any}
      />
      {label && <span className="text-sm font-medium text-[#8b949e] animate-pulse">{label}</span>}
    </div>
  );
};

export const LoadingOverlay: React.FC<{ label?: string }> = ({ label }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0d1117]/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-2xl flex flex-col items-center gap-4 scale-in-center">
        <Spinner size="lg" label={label} />
      </div>
    </div>
  );
};
