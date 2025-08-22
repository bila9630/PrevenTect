import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MapViewProps {
  onTokenSet?: (token: string) => void;
}

interface MapViewRef {
  zoomToLocation: (lng: number, lat: number, placeName?: string) => void;
}

const MapView = forwardRef<MapViewRef, MapViewProps>(({ onTokenSet }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isTokenSet, setIsTokenSet] = useState(false);

  // Load cached token on component mount
  useEffect(() => {
    const cachedToken = localStorage.getItem('mapbox-token');
    if (cachedToken) {
      setMapboxToken(cachedToken);
      setIsTokenSet(true);
    }
  }, []);

  const [currentMarker, setCurrentMarker] = useState<mapboxgl.Marker | null>(null);

  // Expose map controls to parent component
  useImperativeHandle(ref, () => ({
    zoomToLocation: (lng: number, lat: number, placeName?: string) => {
      if (!map.current) return;

      // Remove previous marker if exists
      if (currentMarker) {
        currentMarker.remove();
      }

      // Add new marker
      const marker = new mapboxgl.Marker({
        color: 'hsl(195, 100%, 60%)',
        scale: 1.2
      })
        .setLngLat([lng, lat])
        .addTo(map.current);

      setCurrentMarker(marker);

      // Fly to location
      map.current.flyTo({
        center: [lng, lat],
        zoom: 12,
        duration: 2000,
        essential: true
      });

      // Optional popup with place name
      if (placeName) {
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setLngLat([lng, lat])
          .setHTML(`<div style="color: #000; font-weight: 500;">${placeName}</div>`)
          .addTo(map.current);

        // Auto-close popup after 5 seconds
        setTimeout(() => popup.remove(), 5000);
      }
    }
  }));

  // Initialize map when both token is set and container is ready
  useEffect(() => {
    if (!isTokenSet || !mapboxToken || !mapContainer.current) return;

    console.log('Initializing map with token:', mapboxToken);
    
    try {
      // Set the Mapbox access token
      mapboxgl.accessToken = mapboxToken;
      console.log('Mapbox token set successfully');
      
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

      console.log('Map instance created successfully');

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

      // Notify parent that token is set
      if (onTokenSet) {
        onTokenSet(mapboxToken);
      }
      spinGlobe();

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [isTokenSet, mapboxToken]);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with token:', mapboxToken);
    if (mapboxToken.trim()) {
      // Cache the token in localStorage
      localStorage.setItem('mapbox-token', mapboxToken.trim());
      setIsTokenSet(true);
    } else {
      console.error('Empty token provided');
    }
  };

  useEffect(() => {
    return () => {
      if (currentMarker) {
        currentMarker.remove();
      }
      map.current?.remove();
    };
  }, [currentMarker]);

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
});

MapView.displayName = 'MapView';

export default MapView;