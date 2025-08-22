import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MapView = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isTokenSet, setIsTokenSet] = useState(false);

  const initializeMap = (token: string) => {
    if (!mapContainer.current || !token) return;

    // Set the Mapbox access token
    mapboxgl.accessToken = token;
    
    // Initialize map with globe projection and deep space theme
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      projection: 'globe' as any,
      zoom: 1.5,
      center: [30, 15],
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Disable scroll zoom for smoother globe experience
    map.current.scrollZoom.disable();

    // Add atmosphere and fog effects for the globe
    map.current.on('style.load', () => {
      if (!map.current) return;
      
      // Set fog and atmosphere for space-like appearance
      map.current.setFog({
        color: 'hsl(195, 100%, 70%)',
        'high-color': 'hsl(220, 25%, 8%)', 
        'horizon-blend': 0.1,
        'space-color': 'hsl(220, 30%, 5%)',
        'star-intensity': 0.8
      });

      // Add globe glow effect
      map.current.setPaintProperty('background', 'background-color', 'hsl(220, 30%, 5%)');
    });

    // Globe rotation animation
    const secondsPerRevolution = 240;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;
    let spinEnabled = true;

    function spinGlobe() {
      if (!map.current) return;
      
      const zoom = map.current.getZoom();
      if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = map.current.getCenter();
        center.lng -= distancePerSecond;
        map.current.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    }

    // Interaction event listeners
    const onInteractionStart = () => {
      userInteracting = true;
    };
    
    const onInteractionEnd = () => {
      userInteracting = false;
      spinGlobe();
    };

    map.current.on('mousedown', onInteractionStart);
    map.current.on('dragstart', onInteractionStart);
    map.current.on('mouseup', onInteractionEnd);
    map.current.on('touchend', onInteractionEnd);
    map.current.on('moveend', () => {
      spinGlobe();
    });

    // Start the globe spinning
    spinGlobe();

    setIsTokenSet(true);
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapboxToken.trim()) {
      initializeMap(mapboxToken.trim());
    }
  };

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

  if (!isTokenSet) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="p-6 max-w-md w-full bg-card border-border">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Setup Mapbox
              </h3>
              <p className="text-sm text-muted-foreground">
                Enter your Mapbox public token to initialize the map
              </p>
            </div>
            
            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIi..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className="bg-input border-border"
              />
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!mapboxToken.trim()}
              >
                Initialize Map
              </Button>
            </form>
            
            <p className="text-xs text-muted-foreground text-center">
              Get your token at{' '}
              <a 
                href="https://mapbox.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 rounded-lg"
        style={{
          filter: 'drop-shadow(0 0 20px hsl(var(--map-glow) / 0.3))'
        }}
      />
      
      {/* Subtle overlay for enhanced space theme */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/5 rounded-lg" />
      
      {/* Brand label */}
      <div className="absolute top-4 left-4 text-foreground/80 font-medium text-sm tracking-wide">
        Map
      </div>
    </div>
  );
};

export default MapView;