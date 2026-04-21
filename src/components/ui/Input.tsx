import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[11px] font-bold text-[#6e7681] uppercase tracking-wider px-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7681] group-focus-within:text-blue-500 transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 
              text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none 
              transition-all focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10
              shadow-inner
              ${icon ? 'pl-9' : ''}
              ${error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <span className="text-[11px] text-red-500 px-1">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
