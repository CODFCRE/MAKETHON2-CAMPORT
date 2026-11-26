import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { Toaster } from 'react-hot-toast';
import { cn } from '../../utils/helpers';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const isImmersiveView = location.pathname.includes('/gig/view/');
  const isStoryView = location.pathname.includes('/story/');
  const isGigDetails = location.pathname.includes('/gig/') && !location.pathname.includes('/view/');
  const isMessageView = location.pathname.startsWith('/messages');
  const isPrimaryScreen = ['/', '/orders', '/profile', '/services', '/explore'].includes(location.pathname);

  const hideNavbar = isPrimaryScreen || isImmersiveView || isStoryView || isMessageView;
  const hideBottomNav = isImmersiveView || isStoryView || isGigDetails || isMessageView;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen bg-background text-on-surface font-body selection:bg-primary/30">
      <Toaster 
        position="top-center"
        toastOptions={{
          className: 'ios-glass border border-white/10 rounded-2xl text-white font-semibold text-sm shadow-2xl',
          duration: 3000,
        }}
      />
      
      {!hideNavbar && <Navbar />}
      
      <main className={cn(
        "relative z-10 min-h-screen w-full px-0 sm:px-4 lg:pl-64",
        !hideNavbar && "pt-16"
      )}>
        <Outlet />
      </main>

      {!hideBottomNav && <BottomNav />}
    </div>
  );
};

export default MainLayout;
