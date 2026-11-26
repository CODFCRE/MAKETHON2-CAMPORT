import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/20',
    secondary: 'bg-secondary text-white hover:brightness-110',
    outline: 'border border-white/10 bg-surface-container-low hover:bg-surface-container text-on-surface',
    ghost: 'bg-transparent hover:bg-white/5 text-on-surface',
    danger: 'bg-error text-white hover:brightness-110',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base font-bold',
    xl: 'px-10 py-4 text-lg font-bold',
  };

  return (
    <button
      className={cn(
        'relative flex items-center justify-center gap-2 rounded-full font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : children}
    </button>
  );
};

export default Button;
export { cn };
