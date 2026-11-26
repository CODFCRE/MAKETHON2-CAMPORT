import React from 'react';
import { cn } from './Button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="block text-[0.75rem] uppercase tracking-widest font-bold text-on-surface-variant px-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        <input
          className={cn(
            'w-full h-14 bg-surface-container-lowest border border-white/10 rounded-xl text-on-surface outline-none transition-all placeholder:text-outline focus:ring-1 focus:ring-primary/40',
            icon && 'pl-12',
            !icon && 'px-4',
            error && 'border-error ring-1 ring-error/40',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] font-bold text-error px-1">{error}</p>}
    </div>
  );
};

export default Input;
