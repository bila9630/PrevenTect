import React, { useState, useRef } from 'react';
import MapView from '@/components/MapView';
import ChatInterface from '@/components/ChatInterface';

const Index = () => {
  const [mapboxToken, setMapboxToken] = useState('');
  const mapRef = useRef<{
    flyTo: (coordinates: [number, number], zoom?: number) => void;
    toggleRain: (enabled: boolean) => void;
    stopRotation: () => void;
    getCenter: () => [number, number] | null;
    showRoute: (routeCoords: number[][], start: [number, number], end: [number, number]) => void;
    clearRoute: () => void;
  } | null>(null);

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

        // Zoom to the location and start rotation after a delay
        mapRef.current.flyTo([lng, lat], 18);

        // MapView will start gentle rotation after flyTo automatically

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

  // Helper: generate a random destination within 3km radius from center
  const randomDestinationWithinRadius = (center: [number, number], radiusMeters = 3000): [number, number] => {
    const [lng, lat] = center;
    const r = radiusMeters / 111320; // ~ meters per degree latitude
    const u = Math.random();
    const v = Math.random();
    const w = r * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const dx = w * Math.cos(t);
    const dy = w * Math.sin(t);
    const newLat = lat + dy;
    const newLng = lng + dx / Math.cos((lat * Math.PI) / 180);
    return [newLng, newLat];
  };

  const handleRequestPartners = async () => {
    const token = mapboxToken;
    const ref = mapRef.current;
    if (!token || !ref) return;

    // Get current center as start
    const center: [number, number] | null = ref.getCenter?.() || null;
    if (!center) return;

    // Pick random destination within 3km
    const dest = randomDestinationWithinRadius(center, 3000);

    try {
      // Use Mapbox Directions API (driving profile)
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${center[0]},${center[1]};${dest[0]},${dest[1]}?geometries=geojson&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      const route = data?.routes?.[0]?.geometry?.coordinates as number[][] | undefined;
      if (!route || route.length === 0) return;

      // Draw route, show markers, fit bounds, and stop rotation
      ref.stopRotation?.();
      ref.showRoute?.(route, [center[0], center[1]], [dest[0], dest[1]]);
    } catch (e) {
      console.error('Failed to fetch directions', e);
    }
  };

  return (
    <div className="h-full flex">
      {/* Map Section */}
      <div className="flex-1 p-4">
        <div className="h-full bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-2xl">
          <MapView ref={mapRef} onTokenSet={setMapboxToken} />
        </div>
      </div>

      {/* Chat Section */}
      <div className="flex-1 p-4">
        <div className="h-full bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-2xl overflow-hidden">
          <ChatInterface onLocationRequest={handleLocationRequest} onRainToggle={handleRainToggle} onRequestPartners={handleRequestPartners} />
        </div>
      </div>
    </div>
  );
};

export default Index;
