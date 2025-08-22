import React, { useState, useRef } from 'react';
import MapView from '@/components/MapView';
import ChatInterface from '@/components/ChatInterface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Analytics from '@/components/Analytics';

const Index = () => {
  const [mapboxToken, setMapboxToken] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
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
        
        // Update current address for analytics tab
        setCurrentAddress(address);
        
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
      {/* Header with branding and tabs */}
      <header className="h-20 flex flex-col px-6 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 py-3">
          <div className="w-6 h-6 rounded-full bg-primary shadow-lg shadow-primary/30"></div>
          <h1 className="text-xl font-bold text-foreground tracking-wide">
            mapalytics
          </h1>
        </div>
        
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-48 grid-cols-2">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Main content area */}
          <div className="h-[calc(100vh-5rem)]">
            <TabsContent value="home" className="h-full mt-4">
              <div className="h-full flex">
                {/* Map Section */}
                <div className="flex-1 pr-4">
                  <div className="h-full bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-2xl">
                    <MapView ref={mapRef} onTokenSet={setMapboxToken} />
                  </div>
                </div>

                {/* Chat Section */}
                <div className="w-96">
                  <div className="h-full bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-2xl overflow-hidden">
                    <ChatInterface onLocationRequest={handleLocationRequest} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="h-full mt-4">
              <Analytics currentAddress={currentAddress} />
            </TabsContent>
          </div>
        </Tabs>
      </header>
    </div>
  );
};

export default Index;
