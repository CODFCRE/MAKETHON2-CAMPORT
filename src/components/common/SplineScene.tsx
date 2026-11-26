/**
 * SplineScene — Production-ready lazy-loaded Spline wrapper
 * 
 * Optimized to prevent browser jank during heavy asset initialization.
 */

'use client';

import { Suspense, lazy, useState, useEffect, memo } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineSceneProps {
    /** URL to the Spline scene (.splinecode file) */
    scene: string;
    /** CSS class to apply to the Spline canvas */
    className?: string;
    /** Callback fired when the scene finishes loading */
    onLoad?: (app: any) => void;
}

/**
 * A lazy-loaded Spline scene component with performance optimizations.
 */
export const SplineScene = memo(function SplineScene({ scene, className, onLoad }: SplineSceneProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Delay mounting the Spline component slightly to allow initial page animations
    // and layout to settle, reducing the "stuck" feeling.
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true);
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div 
            className="w-full h-full relative overflow-hidden" 
            style={{ 
                contain: 'content', 
                background: 'transparent',
                // Ensure a new stacking context and hardware acceleration hint
                transform: 'translateZ(0)',
                willChange: 'opacity',
                // Prevent interactions while loading to avoid jank
                pointerEvents: isLoaded ? 'auto' : 'none'
            }}
        >
            {!isLoaded && (
                <div
                    className="absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300"
                    style={{ 
                        background: 'transparent',
                        opacity: isMounted ? 1 : 0 
                    }}
                >
                    <LoadingSpinner />
                </div>
            )}

            {isMounted && (
                <Suspense fallback={null}>
                    <div 
                        style={{ 
                            width: '100%', 
                            height: '100%',
                            opacity: isLoaded ? 1 : 0,
                            transition: 'opacity 0.5s ease-in-out'
                        }}
                    >
                        <Spline 
                            scene={scene} 
                            className={className} 
                            onLoad={(app) => {
                                if (app.canvas) {
                                    app.canvas.style.backgroundColor = 'transparent';
                                }
                                setIsLoaded(true);
                                onLoad?.(app);
                            }} 
                            style={{ background: 'transparent' }}
                        />
                    </div>
                </Suspense>
            )}
        </div>
    );
});

/** Simple CSS spinner — no dependencies */
function LoadingSpinner() {
    return (
        <span
            style={{
                width: 40,
                height: 40,
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: 'var(--primary, #0070f3)',
                borderRadius: '50%',
                animation: 'spline-spin 0.8s linear infinite',
            }}
        />
    );
}

/**
 * Inject the spinner keyframes into the document.
 */
if (typeof document !== 'undefined') {
    const styleId = 'spline-scene-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
      @keyframes spline-spin {
        to { transform: rotate(360deg); }
      }
    `;
        document.head.appendChild(style);
    }
}
