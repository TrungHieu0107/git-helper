import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'default', 
  padding = 'md',
  className = '',
  ...props 
}) => {
  const baseStyles = "rounded-lg border transition-all duration-200";
  
  const variants = {
    default: "bg-[#161b22] border-[#30363d]",
    elevated: "bg-[#1c2128] border-[#30363d] shadow-xl",
    glass: "bg-[#161b22]/70 backdrop-blur-xl border-white/5 shadow-2xl"
  };
  
  const paddings = {
    none: "p-0",
    sm: "p-2",
    md: "p-4",
    lg: "p-6"
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};
