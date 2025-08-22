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
        mapRef.current.flyTo([lng, lat], 12);
        
        return { success: true, location: placeName, coordinates: [lng, lat] };
      } else {
        return { success: false, error: "Location not found" };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      return { success: false, error: "Failed to find location" };
    }
  };

  return (
    <div className="h-screen bg-gradient-space overflow-hidden">
      {/* Header with branding */}
      <header className="h-16 flex items-center px-6 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary shadow-lg shadow-primary/30"></div>
          <h1 className="text-xl font-bold text-foreground tracking-wide">
            mapalytics
          </h1>
        </div>
      </header>

      {/* Main split layout */}
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Map Section */}
        <div className="flex-1 p-4">
          <div className="h-full bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-2xl">
            <MapView ref={mapRef} onTokenSet={setMapboxToken} />
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-96 p-4 pl-2">
          <div className="h-full bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-2xl overflow-hidden">
            <ChatInterface onLocationRequest={handleLocationRequest} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
