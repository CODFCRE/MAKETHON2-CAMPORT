import React from 'react';
import { Outlet } from 'react-router-dom';
import TopAppBar from './TopAppBar';
import BottomNavBar from './BottomNavBar';

const Layout: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-background text-on-surface font-body overflow-hidden">
      <TopAppBar />
      <main className="h-screen w-full">
        <Outlet />
      </main>
      <BottomNavBar />
      
      {/* Floating AI Assistant */}
      <button className="fixed right-6 bottom-44 z-[60] w-12 h-12 rounded-full bg-surface-container-highest border border-primary/30 flex items-center justify-center ai-assistant-glow active:scale-90 transition-transform">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          auto_awesome
        </span>
      </button>

      {/* Subtle Grain Overlay */}
      <div className="grain-overlay"></div>
    </div>
  );
};

export default Layout;
