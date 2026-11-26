import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNavBar: React.FC = () => {
  const navItems = [
    { label: 'Home', icon: 'home', path: '/' },
    { label: 'Services', icon: 'search', path: '/services' },
    { label: 'Upload', icon: 'add_circle', path: '/post-gig', special: true },
    { label: 'Messages', icon: 'chat_bubble', path: '/messages' },
    { label: 'Profile', icon: 'person', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg rounded-[2rem] border border-white/10 bg-zinc-800/60 backdrop-blur-xl shadow-[0_12px_32px_rgba(173,198,255,0.08)] flex justify-around items-center h-20 px-4 z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center transition-all duration-300 active:scale-90 ${
              isActive
                ? 'text-blue-300 scale-110'
                : 'text-zinc-400 opacity-60 hover:text-blue-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`material-symbols-outlined ${item.special ? 'text-3xl text-primary' : 'text-2xl'}`}
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="font-inter text-[10px] uppercase tracking-[0.05em] font-bold">
                {item.label}
              </span>
              {isActive && !item.special && (
                <div className="absolute -bottom-1 w-1 h-1 bg-blue-300 rounded-full"></div>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNavBar;
