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
  flyTo: (coordinates: [number, number], zoom?: number) => void;
  toggleRain: (enabled: boolean) => void;
  addMarkers: (coordinates: Array<{ lat: number; lng: number; address: string }>) => void;
  clearMarkers: () => void;
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
  const [isRainEnabled, setIsRainEnabled] = useState(false);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);

  // Rain effect helper function
  const toggleRainEffect = (enabled: boolean) => {
    if (!map.current) return;

    if (enabled) {
      const zoomBasedReveal = (value: number) => {
        return [
          'interpolate',
          ['linear'],
          ['zoom'],
          11,
          0.0,
          13,
          value
        ];
      };

      (map.current as any).setRain({
        density: zoomBasedReveal(0.5),
        intensity: 1.0,
        color: '#a8adbc',
        opacity: 0.7,
        vignette: zoomBasedReveal(1.0),
        'vignette-color': '#464646',
        direction: [0, 80],
        'droplet-size': [2.6, 18.2],
        'distortion-strength': 0.7,
        'center-thinning': 0
      });
    } else {
      (map.current as any).setRain(null);
    }
  };

  // Expose map controls to parent component
  useImperativeHandle(ref, () => ({
    flyTo: (coordinates: [number, number], zoom = 12) => {
      if (map.current) {
        map.current.flyTo({
          center: coordinates,
          zoom: zoom,
          duration: 2000
        });
      }
    },
    toggleRain: (enabled: boolean) => {
      setIsRainEnabled(enabled);
      toggleRainEffect(enabled);
    },
    addMarkers: (coordinates: Array<{ lat: number; lng: number; address: string }>) => {
      if (!map.current) return;

      // Clear existing markers first
      markers.forEach(marker => marker.remove());

      // Remove existing circle layers and sources
      if (map.current.getLayer('building-circles')) {
        map.current.removeLayer('building-circles');
      }
      if (map.current.getSource('building-circles')) {
        map.current.removeSource('building-circles');
      }

      // Add new markers
      const newMarkers = coordinates.map(coord => {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundColor = '#ef4444';
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([coord.lng, coord.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<div style="font-size: 14px; font-weight: 500;">${coord.address}</div>`))
          .addTo(map.current!);

        return marker;
      });

      // Add circles around buildings
      if (coordinates.length > 0) {
        const circleFeatures = coordinates.map(coord => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [coord.lng, coord.lat]
          },
          properties: {
            address: coord.address
          }
        }));

        map.current.addSource('building-circles', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: circleFeatures
          }
        });

        map.current.addLayer({
          id: 'building-circles',
          type: 'circle',
          source: 'building-circles',
          paint: {
            'circle-radius': {
              base: 1.75,
              stops: [
                [12, 50],
                [22, 180]
              ]
            },
            'circle-color': '#ef4444',
            'circle-opacity': 0.2,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ef4444',
            'circle-stroke-opacity': 0.6
          }
        });
      }

      setMarkers(newMarkers);
    },
    clearMarkers: () => {
      markers.forEach(marker => marker.remove());
      setMarkers([]);

      // Remove circle layers and sources
      if (map.current?.getLayer('building-circles')) {
        map.current.removeLayer('building-circles');
      }
      if (map.current?.getSource('building-circles')) {
        map.current.removeSource('building-circles');
      }
    }
  }), [markers]);

  // Initialize map when both token is set and container is ready
  useEffect(() => {
    if (!isTokenSet || !mapboxToken || !mapContainer.current) return;

    console.log('Initializing map with token:', mapboxToken);

    try {
      // Set the Mapbox access token
      mapboxgl.accessToken = mapboxToken;
      console.log('Mapbox token set successfully');

      // Initialize map with globe projection
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        projection: 'globe' as any,
        zoom: 2,
        center: [0, 20],
        pitch: 45,
      });

      console.log('Map instance created successfully');

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Enable scroll zoom for better user interaction

      // Add atmosphere and fog effects
      map.current.on('style.load', () => {
        map.current?.setFog({
          color: 'rgb(255, 255, 255)',
          'high-color': 'rgb(245, 245, 255)',
          'horizon-blend': 0.3,
        });

        // Add 3D buildings layer
        const layers = map.current?.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
        )?.id;

        // Add 3D building extrusion layer
        map.current?.addLayer(
          {
            id: 'add-3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'height'],
                0, '#4a5568',
                50, '#718096',
                100, '#a0aec0',
                200, '#cbd5e0'
              ],
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.8,
              'fill-extrusion-ambient-occlusion-intensity': 0.3,
              'fill-extrusion-ambient-occlusion-radius': 3.0
            }
          },
          labelLayerId
        );
      });

      // Globe rotation animation
      const secondsPerRevolution = 300;
      const maxSpinZoom = 5;
      const slowSpinZoom = 3;
      let userInteracting = false;
      const spinEnabled = true;

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
  }, [isTokenSet, mapboxToken, onTokenSet]);

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