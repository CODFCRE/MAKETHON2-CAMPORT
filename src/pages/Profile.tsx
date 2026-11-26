import React from 'react';
import { CarFront, ChevronRight, CircleHelp, Clock3, LogIn, LogOut, MessageCircle, Scale, Settings, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useUserStore } from '../store/useUserStore';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUserStore();

  const handleSignOut = async () => {
    try {
      const { authService } = await import('../features/auth/authService');
      await authService.signOut();
      setUser(null);
      toast.success('Signed out');
    } catch (error) {
      console.error('Unable to sign out:', error);
      toast.error('Unable to sign out. Please try again.');
    }
  };

  const showComingSoon = (feature: string) => toast(`${feature} is coming soon.`);

  const quickActions = [
    { label: 'Help', icon: CircleHelp, onClick: () => navigate('/settings/support') },
    { label: 'Wallet', icon: Wallet, onClick: () => showComingSoon('Wallet') },
    { label: 'Trips', icon: Clock3, onClick: () => navigate('/orders') },
  ];

  const menuItems = [
    { label: 'Messages', icon: MessageCircle, onClick: () => user ? navigate('/messages') : navigate('/login'), detail: 'Chat with your driver or store' },
    { label: 'Settings', icon: Settings, onClick: () => navigate('/settings'), detail: 'Profile and preferences' },
    { label: 'Earn by driving or delivering', icon: CarFront, onClick: () => showComingSoon('Partner sign-up'), detail: 'Join Camport as a local partner' },
    { label: 'Legal', icon: Scale, onClick: () => navigate('/settings/support'), detail: 'Terms, privacy and support' },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-28 text-on-surface lg:grid lg:max-w-7xl lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-8 lg:px-8 lg:pb-12 lg:pt-8">
      <header className="rounded-b-[30px] bg-[#f7ad7c] px-5 pb-5 pt-5 text-[#191715] lg:rounded-[30px] lg:px-8 lg:py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-black/60">Hi there 👋</p>
            <h1 className="mt-1 text-xl font-black tracking-tight">{user?.full_name || 'Camport rider'}</h1>
          </div>
          <button onClick={() => navigate('/settings/profile')} aria-label="Edit profile" className="h-12 w-12 overflow-hidden rounded-full border-2 border-white/60 bg-white/40">
            <img src={user?.avatar_url || 'https://picsum.photos/seed/camport-rider/120/120'} alt="" className="h-full w-full object-cover" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {quickActions.map(({ label, icon: Icon, onClick }) => (
            <button key={label} onClick={onClick} className="theme-card flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl text-white transition active:scale-95">
              <Icon size={19} />
              <span className="text-[11px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </header>

      <section className="px-5 pt-3 lg:px-0 lg:pt-0 lg:row-span-2">
        {menuItems.map(({ label, icon: Icon, onClick, detail }) => (
          <button key={label} onClick={onClick} className="flex w-full items-center gap-3 border-b border-white/10 py-4 text-left">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/65"><Icon size={16} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white/90">{label}</span>
              <span className="mt-0.5 block text-[10px] text-white/40">{detail}</span>
            </span>
            <ChevronRight size={17} className="text-white/35" />
          </button>
        ))}
      </section>

      <footer className="px-5 pt-8 lg:px-5 lg:pt-4">
        {user ? (
          <Button onClick={handleSignOut} variant="ghost" className="h-11 w-full gap-2 rounded-xl border border-white/10 text-white/60">
            <LogOut size={15} /> Sign out
          </Button>
        ) : (
          <Button onClick={() => navigate('/login')} variant="ghost" className="h-11 w-full gap-2 rounded-xl border border-white/10 text-white/60">
            <LogIn size={15} /> Sign in
          </Button>
        )}
        <p className="mt-6 text-center text-[9px] font-bold uppercase tracking-[0.3em] text-white/25">Camport · Move easy</p>
      </footer>
    </div>
  );
};

export default Profile;
