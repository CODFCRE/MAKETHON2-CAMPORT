import React from 'react';
import { Bell, CheckCircle2, MessageCircle, ShieldAlert, Wallet } from 'lucide-react';
import { cn } from '../utils/helpers';

type NotificationType = 'payment' | 'message' | 'system' | 'security';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  unread?: boolean;
}

const notifications: NotificationItem[] = [
  {
    id: '1',
    title: 'Payment received',
    description: 'A client released payment for your "Visual Identity Build" gig.',
    time: '2 mins ago',
    type: 'payment',
    unread: true,
  },
  {
    id: '2',
    title: 'New message',
    description: 'You received a new message in your active order chat.',
    time: '12 mins ago',
    type: 'message',
    unread: true,
  },
  {
    id: '3',
    title: 'Security notice',
    description: 'New sign-in detected. If this was not you, change your password.',
    time: '1 hour ago',
    type: 'security',
  },
  {
    id: '4',
    title: 'System update',
    description: 'Uploads now support larger files with improved reliability.',
    time: 'Today, 9:20 AM',
    type: 'system',
  },
];

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
  if (type === 'payment') return <Wallet size={18} />;
  if (type === 'message') return <MessageCircle size={18} />;
  if (type === 'security') return <ShieldAlert size={18} />;
  return <Bell size={18} />;
};

const Notifications: React.FC = () => {
  return (
    <div className="pt-4 pb-28 px-6 max-w-3xl mx-auto min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Notifications</h1>
          <p className="text-on-surface-variant text-xs uppercase tracking-[0.2em] font-bold opacity-60 mt-2">
            All alerts in one place
          </p>
        </div>
        <button className="text-xs font-black uppercase tracking-[0.15em] text-primary hover:opacity-80 transition-opacity">
          Mark all read
        </button>
      </div>

      <div className="space-y-4">
        {notifications.map((item) => (
          <article
            key={item.id}
            className={cn(
              'rounded-3xl border p-5 bg-surface-container-low transition-all',
              item.unread ? 'border-primary/25' : 'border-white/5'
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center',
                  item.unread ? 'bg-primary/15 text-primary' : 'bg-white/5 text-on-surface-variant'
                )}
              >
                <NotificationIcon type={item.type} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-black tracking-tight text-base">{item.title}</h2>
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60 font-bold">
                    {item.time}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant mt-1">{item.description}</p>
              </div>
              {item.unread && <CheckCircle2 size={16} className="text-primary mt-1" />}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
