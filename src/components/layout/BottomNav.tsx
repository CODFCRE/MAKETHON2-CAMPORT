import React from 'react';
import { Clock3, Home, LayoutGrid, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../utils/helpers';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Activity', icon: Clock3, path: '/orders' },
    { label: 'Services', icon: LayoutGrid, path: '/services' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <nav className="app-nav-surface fixed bottom-0 left-0 z-[100] w-full border-t border-white/5 pb-safe backdrop-blur-xl lg:bottom-auto lg:right-auto lg:top-0 lg:h-screen lg:w-64 lg:border-r lg:border-t-0 lg:px-5 lg:py-7 lg:pb-0">
      <div className="mx-auto flex h-[68px] max-w-md items-center justify-between px-5 lg:h-full lg:max-w-none lg:flex-col lg:items-stretch lg:justify-start lg:px-0">
        <div className="mb-9 hidden px-4 lg:block">
          <p className="text-xl font-black tracking-tight text-white">camport</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Rides · food · rentals</p>
        </div>
        <div className="flex w-full items-center justify-between lg:flex-col lg:items-stretch lg:gap-2">
        {tabs.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : tab.path === '/services'
              ? location.pathname === '/services' || location.pathname === '/explore'
            : location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/`);
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className={cn(
                "relative flex min-w-16 flex-col items-center justify-center gap-1.5 transition-all duration-300 lg:w-full lg:min-w-0 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-3",
                isActive ? "text-primary lg:bg-primary/10" : "text-on-surface-variant hover:text-white lg:hover:bg-white/5"
              )}
            >
              <tab.icon size={21} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn(
                "text-[10px] font-semibold transition-all lg:text-sm",
                isActive ? "opacity-100" : "opacity-75"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
        </div>
        <p className="mt-auto hidden px-4 pb-2 text-[11px] leading-5 text-white/35 lg:block">
          Local rides and neighborhood favorites, all in one place.
        </p>
      </div>
    </nav>
  );
};

export default BottomNav;
