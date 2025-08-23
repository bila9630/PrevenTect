import React, { useState, useRef } from 'react';
import MapView from '@/components/MapView';
import ChatInterface from '@/components/ChatInterface';

const Index = () => {
  const [mapboxToken, setMapboxToken] = useState('');
  const mapRef = useRef<any>(null);

  const handleLocationRequest = async (address: string) => {
    if (!mapboxToken || !mapRef.current) return;

    try {
      // Use Mapbox Geocoding API to convert address to coordinates
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`;

      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const placeName = data.features[0].place_name;

        // Zoom to the location
        mapRef.current.flyTo([lng, lat], 18);

        return { success: true, location: placeName, coordinates: [lng, lat] };
      } else {
        return { success: false, error: "Location not found" };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      return { success: false, error: "Failed to find location" };
    }
  };

  const handleRainToggle = async (enabled: boolean) => {
    if (!mapRef.current) return;

    try {
      mapRef.current.toggleRain(enabled);
      return { success: true, enabled };
    } catch (error) {
      console.error('Rain toggle error:', error);
      return { success: false, error: "Failed to toggle rain effect" };
    }
  };

  return (
    <div className="h-full flex">
      {/* Map Section */}
      <div className="flex-[3] p-4">
        <div className="h-full bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-2xl">
          <MapView ref={mapRef} onTokenSet={setMapboxToken} />
        </div>
      </div>

      {/* Chat Section */}
      <div className="flex-[2] p-4 pl-2">
        <div className="h-full bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-2xl overflow-hidden">
          <ChatInterface onLocationRequest={handleLocationRequest} onRainToggle={handleRainToggle} />
        </div>
      </div>
    </div>
  );
};

export default Index;
