import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Eye, EyeOff, Shield, UserX, Mail, Loader2, CheckCircle2,
} from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import { profileService } from '../../features/profile/profileService';
import { cn } from '../../utils/helpers';

const PrivacySettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUserStore();

  const [publicProfile, setPublicProfile] = useState(true);
  const [showStatus,    setShowStatus]    = useState(true);
  const [hideEmail,     setHideEmail]     = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);

  // Seed toggles from the store on mount
  useEffect(() => {
    if (user) setHideEmail(user.hide_email ?? false);
  }, [user]);

  // Saves hide_email to Supabase immediately on toggle
  const handleToggleHideEmail = async (showEmail: boolean) => {
    if (!user) return;
    const next = !showEmail;           // showEmail=true  → hideEmail=false
    setHideEmail(next);
    setSaving(true);
    try {
      const updated = await profileService.updateProfile(user.id, { hide_email: next });
      setUser({ ...user, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setHideEmail(!next);             // revert on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-4 pb-32 max-w-screen-md mx-auto px-6 min-h-screen">
      <header className="flex items-center gap-4 mb-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-2xl font-black tracking-tighter">Privacy</h1>
          <span className="flex items-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin text-primary" />}
            {saved && !saving && <CheckCircle2 size={15} className="text-green-400" />}
          </span>
        </div>
      </header>

      <div className="space-y-10 animate-ios">

        {/* Visibility */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">
            Visibility
          </h2>
          <div className="ios-card divide-y divide-white/5 overflow-hidden">
            <ToggleItem
              icon={Eye}
              label="Public Profile"
              desc="Allow anyone to view your profile"
              color="bg-indigo-500"
              checked={publicProfile}
              onChange={setPublicProfile}
            />
            <ToggleItem
              icon={Shield}
              label="Active Status"
              desc="Show when you were last active"
              color="bg-green-500"
              checked={showStatus}
              onChange={setShowStatus}
            />
          </div>
        </section>

        {/* Email Privacy — wired to Supabase */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">
            Email Address
          </h2>
          <div className="ios-card divide-y divide-white/5 overflow-hidden">
            <ToggleItem
              icon={hideEmail ? EyeOff : Mail}
              label="Show Email Address"
              desc={
                hideEmail
                  ? 'Your email is hidden from other users'
                  : 'Your email is visible to other users'
              }
              color={hideEmail ? 'bg-zinc-600' : 'bg-primary'}
              checked={!hideEmail}
              onChange={handleToggleHideEmail}
            />
          </div>
          <p className="text-[10px] text-on-surface-variant px-4 opacity-60">
            Current email: {user?.email}
          </p>
        </section>

        {/* Interactions */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">
            Interactions
          </h2>
          <div className="ios-card divide-y divide-white/5 overflow-hidden">
            <LinkItem
              icon={UserX}
              label="Blocked Accounts"
              desc="Manage users you've blocked"
              color="bg-error"
            />
            <ToggleItem
              icon={EyeOff}
              label="Private Gigs"
              desc="Hide active projects from others"
              color="bg-zinc-600"
              checked={false}
              onChange={() => {}}
            />
          </div>
        </section>

      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */
const LinkItem: React.FC<{
  icon: React.ElementType; label: string; desc: string; color: string;
}> = ({ icon: Icon, label, desc, color }) => (
  <button className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all text-left">
    <div className="flex items-center gap-4">
      <div className={cn(color, 'w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg')}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-white tracking-tight">{label}</p>
        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{desc}</p>
      </div>
    </div>
    <ChevronLeft className="rotate-180 text-zinc-600" size={16} />
  </button>
);

const ToggleItem: React.FC<{
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}> = ({ icon: Icon, label, desc, color, checked, onChange }) => (
  <div className="flex items-center justify-between p-5">
    <div className="flex items-center gap-4">
      <div className={cn(color, 'w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-colors duration-300')}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-white tracking-tight">{label}</p>
        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{desc}</p>
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
    </label>
  </div>
);

export default PrivacySettings;
