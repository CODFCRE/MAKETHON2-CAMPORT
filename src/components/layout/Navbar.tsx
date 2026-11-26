import React, { useState, useEffect } from 'react';
import { Search, User, Settings, LogOut, LogIn } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const Navbar: React.FC = () => {
  const { user, setUser } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      const { authService } = await import('../../features/auth/authService');
      await authService.signOut();
      setUser(null);
      setShowDropdown(false);
      navigate('/');
    } catch (error) {
      console.error('Unable to sign out:', error);
      toast.error('Unable to sign out. Please try again.');
    }
  };

  const isFeed = location.pathname === '/';

  return (
    <header className={cn(
      "fixed top-0 left-0 z-[100] w-full transition-all duration-300 lg:left-64 lg:w-[calc(100%-16rem)]",
      isScrolled ? "bg-black border-b border-white/10 h-14" : "h-16 bg-black border-b border-white/5"
    )}>
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
        
        {/* Left Section: Back or Menu */}
        <div className="flex items-center gap-4">
           {location.pathname !== '/' ? (
             <button onClick={() => navigate(-1)} className="text-primary font-semibold text-sm flex items-center gap-1 active:opacity-50 transition-opacity">
                <span className="material-symbols-outlined !text-[20px]">chevron_left</span> Back
             </button>
           ) : (
             <h1 className={cn("font-black tracking-tighter text-xl transition-all text-on-surface", isScrolled ? "" : "invisible opacity-0")}>
               camport
             </h1>
           )}
        </div>

        {/* Center Section: Contextual Title (Typically iOS style) */}
        {!isScrolled && isFeed && (
           <div className="absolute left-1/2 -translate-x-1/2">
             <span className="text-xs font-black tracking-[0.3em] uppercase opacity-50">Camport</span>
           </div>
        )}

        {/* Right Section: Actions */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/services?type=ride')} aria-label="Find a ride" className="p-2 text-on-surface-variant hover:text-white transition-colors">
            <Search size={20} />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-8 h-8 rounded-full overflow-hidden border border-white/10 active:scale-95 transition-transform"
            >
              <img src={user?.avatar_url || "https://picsum.photos/seed/elite/100/100"} alt="Profile" className="w-full h-full object-cover" />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-3 w-56 ios-glass rounded-2xl border border-white/10 shadow-2xl p-2 overflow-hidden"
                >
                  <button onClick={() => { navigate('/profile'); setShowDropdown(false); }} className="w-full ios-list-item px-4 border-white/5">
                    <span className="text-sm font-semibold">Profile</span>
                    <User size={16} />
                  </button>
                  <button onClick={() => { navigate('/settings'); setShowDropdown(false); }} className="w-full ios-list-item px-4 border-white/5">
                    <span className="text-sm font-semibold">Settings</span>
                    <Settings size={16} />
                  </button>
                  {user ? (
                    <button onClick={handleSignOut} className="w-full ios-list-item px-4 border-0 text-error">
                      <span className="text-sm font-semibold">Log Out</span>
                      <LogOut size={16} />
                    </button>
                  ) : (
                    <button onClick={() => { navigate('/login'); setShowDropdown(false); }} className="w-full ios-list-item px-4 border-0">
                      <span className="text-sm font-semibold">Sign In</span>
                      <LogIn size={16} />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
