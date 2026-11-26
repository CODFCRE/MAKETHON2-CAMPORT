import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SavedGigs: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('SavedGigs page mounted - Simple Version');
  }, []);

  return (
    <div className="pt-32 px-10">
      <h1 className="text-4xl font-bold text-white mb-8">Saved Gigs (Rescue Mode)</h1>
      <p className="text-zinc-400 mb-10 text-lg">If you see this, the routing and basic rendering are working.</p>
      
      <div className="space-y-4">
        <button 
          onClick={() => navigate('/')}
          className="bg-primary px-8 py-3 rounded-xl font-bold text-white"
        >
          GO BACK HOME
        </button>
      </div>
    </div>
  );
};

export default SavedGigs;
