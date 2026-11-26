import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, User, AtSign, Briefcase, Loader2, CheckCircle2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useUserStore } from '../../store/useUserStore';
import { profileService } from '../../features/profile/profileService';
import { cn } from '../../utils/helpers';

const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUserStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername]       = useState('');
  const [title, setTitle]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const isInitialSetup = Boolean(user && !user.username && !user.title);

  useEffect(() => {
    if (user) {
      setDisplayName(user.full_name ?? user.display_name ?? '');
      setUsername(user.username ?? '');
      setTitle(user.title ?? '');
    }
  }, [user]);

  const handleSave = async () => {
    setError(null);
    if (!user) {
      setError('You must be signed in to save your profile.');
      return;
    }

    setSaving(true);
    const shouldContinueToApp = !user.username && !user.title;
    try {
      const updated = await profileService.updateProfile(user.id, {
        full_name:    displayName.trim() || undefined,
        username:     username.trim()     || undefined,
        title:        title.trim()        || undefined,
      });
      setUser({ ...user, ...updated });
      if (shouldContinueToApp) {
        navigate('/', { replace: true });
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to save changes.');
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
        <h1 className="text-2xl font-black tracking-tighter">Personal Info</h1>
      </header>

      <div className="space-y-8 animate-ios">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/5 shadow-2xl">
              <img
                src={user?.avatar_url || 'https://picsum.photos/seed/user/200/200'}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full border-2 border-background shadow-lg">
              <Camera size={14} />
            </button>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
            Change Profile Photo
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Display Name */}
          <FieldGroup label="Display Name" hint="Shown instead of your real name across the app.">
            <User size={18} className="text-on-surface-variant shrink-0" />
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="bg-transparent border-none focus:ring-0 flex-1 text-sm font-bold text-white placeholder:text-zinc-600 outline-none"
            />
          </FieldGroup>

          {/* Username */}
          <FieldGroup label="Username" hint="Unique handle — no spaces allowed.">
            <AtSign size={18} className="text-on-surface-variant shrink-0" />
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
              placeholder="yourhandle"
              className="bg-transparent border-none focus:ring-0 flex-1 text-sm font-bold text-white placeholder:text-zinc-600 outline-none"
            />
          </FieldGroup>

          {/* Professional Title */}
          <FieldGroup label="Professional Title">
            <Briefcase size={18} className="text-on-surface-variant shrink-0" />
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Full Stack Developer"
              className="bg-transparent border-none focus:ring-0 flex-1 text-sm font-bold text-white placeholder:text-zinc-600 outline-none"
            />
          </FieldGroup>

          {/* Email — read-only, managed in Privacy */}
          <FieldGroup
            label="Email Address"
            hint={
              <span>
                Manage visibility in{' '}
                <button
                  onClick={() => navigate('/settings/privacy')}
                  className="text-primary hover:underline underline-offset-2"
                >
                  Privacy Settings
                </button>
                .
              </span>
            }
            disabled
          >
            <User size={18} className="text-on-surface-variant shrink-0" />
            <span className="text-sm font-bold text-white">{user?.email}</span>
          </FieldGroup>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm font-medium text-error px-4">{error}</p>
        )}

        {/* Save */}
        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all',
              saved ? 'shadow-green-500/20' : 'shadow-primary/20'
            )}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Saving…
              </span>
            ) : saved ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" /> Saved!
              </span>
            ) : (
              isInitialSetup ? 'Confirm & Continue' : 'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Shared sub-component                                                 */
/* ------------------------------------------------------------------ */
const FieldGroup: React.FC<{
  label: string;
  hint?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ label, hint, disabled, children }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">
      {label}
    </label>
    <div className={cn('ios-card flex items-center gap-4 p-4 px-6', disabled && 'opacity-50')}>
      {children}
    </div>
    {hint && (
      <p className="text-[10px] text-on-surface-variant px-4 opacity-60">{hint}</p>
    )}
  </div>
);

export default ProfileSettings;
