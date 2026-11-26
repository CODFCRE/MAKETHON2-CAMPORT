import React from 'react';

const TopAppBar: React.FC = () => {
  return (
    <header className="fixed top-0 w-full z-50 bg-zinc-900/70 backdrop-blur-lg flex flex-col pt-2 w-full">
      <div className="flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
            <img 
              className="w-full h-full object-cover" 
              alt="User"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi4AWXRxltV56CavqMX_XhkwUAPel9i2W_NKd8KY4DCrLEq__h37CvlHPUppn9uo9CcCXy8bjuoCZ0TO3xoEJkX6UjOcGUy94fI13Rdg4smjMYYhKLDfnHSROwidLxIZisKhQ4C2OxCPOO8fe_eOHqc_XINkStK5JzqIchi_juY-AetfZfiVNfxVbxi2EzrA3_tzsjEB1KoRWwjGIFfYJ5gckYd2CeQJX3H4mZKWSy92fBC1YSL4B-ND5NKIgtCVGIdptbRL2qwU8"
            />
          </div>
          <span className="text-xl font-bold text-zinc-100 tracking-tighter italic">camport</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-blue-200 text-2xl hover:opacity-80 transition-opacity active:scale-90 duration-200">
            notifications
          </button>
        </div>
      </div>
      
      {/* Seller Updates Story Bar - Only shown on Home Feed maybe? Or common? */}
      {/* For now, I'll keep it as a separate component or part of HomeFeed if it's only there. 
          The original HTML had it in the header. */}
    </header>
  );
};

export default TopAppBar;
