import React from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { GOOGLE_MAPS_API_KEY, isGoogleMapsConfigured } from '../../lib/googleMaps';

interface MapsProviderProps {
  children: React.ReactNode;
}

export const MapsProvider: React.FC<MapsProviderProps> = ({ children }) => {
  if (!isGoogleMapsConfigured) {
    return <>{children}</>;
  }

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places', 'routes', 'marker']}
      language="en"
    >
      {children}
    </APIProvider>
  );
};
