import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import Button from '../ui/Button';

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected error occurred';

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center text-error mb-8 animate-pulse">
        <AlertCircle size={40} />
      </div>
      <h1 className="text-3xl font-black text-on-surface mb-2 tracking-tighter">System Error</h1>
      <p className="text-on-surface-variant font-medium mb-10 max-w-md leading-relaxed">
        Something went wrong in the matrix. Our team has been notified. 
        <br />
        <span className="text-[10px] uppercase font-bold text-error/60 mt-2 block">{errorMessage}</span>
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={resetErrorBoundary} className="px-10 gap-2">
          <RefreshCcw size={18} />
          Restart Interface
        </Button>
        <Button variant="ghost" onClick={() => window.location.href = '/'} className="px-10 font-bold opacity-60">
          GO HOME
        </Button>
      </div>
    </div>
  );
};

export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ReactErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Optional: clear stores or cache
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};
