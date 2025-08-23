import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AnalyticsMapViewProps {
    onTokenSet?: (token: string) => void;
}

interface AnalyticsMapViewRef {
    flyTo: (coordinates: [number, number], zoom?: number) => void;
    addMarkers: (coordinates: Array<{ lat: number; lng: number; address: string; riskData?: any }>) => void;
    clearMarkers: () => void;
    focusOnLocation: (coordinates: [number, number]) => void;
}

const AnalyticsMapView = forwardRef<AnalyticsMapViewRef, AnalyticsMapViewProps>(({ onTokenSet }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [mapboxToken, setMapboxToken] = useState('');
    const [isTokenSet, setIsTokenSet] = useState(false);
    const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<any>(null);

    // Load cached token on component mount
    useEffect(() => {
        const cachedToken = localStorage.getItem('mapbox-token');
        if (cachedToken) {
            setMapboxToken(cachedToken);
            setIsTokenSet(true);
        }
    }, []);

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
        focusOnLocation: (coordinates: [number, number]) => {
            if (map.current) {
                map.current.flyTo({
                    center: coordinates,
                    zoom: 14,
                    duration: 1500,
                    pitch: 60
                });
            }
        },
        addMarkers: (coordinates: Array<{ lat: number; lng: number; address: string; riskData?: any }>) => {
            if (!map.current) return;

            // Clear existing markers first
            markers.forEach(marker => marker.remove());

            // Remove existing circle layers and sources
            if (map.current.getLayer('dangerous-building-ripple')) {
                map.current.removeLayer('dangerous-building-ripple');
            }
            if (map.current.getLayer('dangerous-building-circles')) {
                map.current.removeLayer('dangerous-building-circles');
            }
            if (map.current.getSource('dangerous-building-circles')) {
                map.current.removeSource('dangerous-building-circles');
            }

            // Add new markers for dangerous buildings
            const newMarkers = coordinates.map(coord => {
                // Create custom marker element using SVG pin with bottom anchor
                const el = document.createElement('div');
                el.className = 'dangerous-building-marker';
                el.style.width = '20px';
                el.style.height = '24px';
                el.style.cursor = 'pointer';
                el.style.display = 'block';
                
                // Determine marker color by water damage risk
                const water = Number(coord.riskData?.HOCHWASSER_FLIESSGEWAESSER);
                let fillColor = '#dc2626'; // red for 200cm+
                if (!Number.isNaN(water)) {
                    if (water >= 200) {
                        fillColor = '#dc2626';
                    } else if (water >= 100) {
                        fillColor = '#eab308'; // yellow for 100-199cm
                    }
                }
                
                // SVG pin (small, crisp) - tip at bottom center
                el.innerHTML = `
                  <svg width="20" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block; filter: drop-shadow(0 2px 6px rgba(220,38,38,0.6));">
                    <path d="M12 2C8.14 2 5 5.08 5 8.86c0 5.19 7 12.28 7 12.28s7-7.09 7-12.28C19 5.08 15.86 2 12 2zm0 9.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4z" fill="${fillColor}" stroke="white" stroke-width="1.5" />
                  </svg>
                `;

                // Add click handler to marker
                el.addEventListener('click', () => {
                    setSelectedBuilding({
                        address: coord.address,
                        riskData: coord.riskData
                    });
                });

                const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                    .setLngLat([coord.lng, coord.lat])
                    .addTo(map.current!);

                return marker;
            });

            // Fly to show all markers
            if (coordinates.length > 0) {
                if (coordinates.length === 1) {
                    // Single marker: zoom to it (gentler zoom for better interaction)
                    map.current.flyTo({
                        center: [coordinates[0].lng, coordinates[0].lat],
                        zoom: 14,
                        duration: 1200,
                        pitch: 30
                    });
                } else {
                    // Multiple markers: fit bounds but cap maximum zoom
                    const bounds = new mapboxgl.LngLatBounds();
                    coordinates.forEach(coord => {
                        bounds.extend([coord.lng, coord.lat]);
                    });
                    map.current.fitBounds(bounds, {
                        padding: 120,
                        duration: 1200,
                        maxZoom: 14
                    });
                }
            }

            setMarkers(newMarkers);
        },
        clearMarkers: () => {
            markers.forEach(marker => marker.remove());
            setMarkers([]);
            setSelectedBuilding(null);

            // Remove circle layers and sources
            if (map.current?.getLayer('dangerous-building-ripple')) {
                map.current.removeLayer('dangerous-building-ripple');
            }
            if (map.current?.getLayer('dangerous-building-circles')) {
                map.current.removeLayer('dangerous-building-circles');
            }
            if (map.current?.getSource('dangerous-building-circles')) {
                map.current.removeSource('dangerous-building-circles');
            }
        }
    }), [markers]);

    // Initialize map when both token is set and container is ready
    useEffect(() => {
        if (!isTokenSet || !mapboxToken || !mapContainer.current) return;

        console.log('Initializing analytics map with token:', mapboxToken);

        try {
            // Set the Mapbox access token
            mapboxgl.accessToken = mapboxToken;

            // Initialize map optimized for analytics view with globe
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/dark-v11', // Better for analytics
                projection: 'globe' as any,
                zoom: 2,
                center: [0, 20],
                pitch: 45,
                bearing: 0
            });

            console.log('Analytics map instance created successfully');

            // Add navigation controls
            map.current.addControl(
                new mapboxgl.NavigationControl({
                    visualizePitch: true,
                }),
                'top-right'
            );

            // Add scale control for analytics
            map.current.addControl(new mapboxgl.ScaleControl({
                maxWidth: 100,
                unit: 'metric'
            }));

            // Add fullscreen control
            map.current.addControl(new mapboxgl.FullscreenControl());

            // Add geolocate control
            map.current.addControl(
                new mapboxgl.GeolocateControl({
                    positionOptions: {
                        enableHighAccuracy: true
                    },
                    trackUserLocation: true,
                    showUserHeading: true
                })
            );

            // Add atmosphere, fog effects, and 3D buildings
            map.current.on('style.load', () => {
                // Add atmosphere and fog effects
                map.current?.setFog({
                    color: 'rgb(255, 255, 255)',
                    'high-color': 'rgb(245, 245, 255)',
                    'horizon-blend': 0.3,
                });

                // Add 3D building extrusion layer
                const layers = map.current?.getStyle().layers;
                const labelLayerId = layers?.find(
                    (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
                )?.id;

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
                                0, '#718096',
                                50, '#a0aec0',
                                100, '#cbd5e0',
                                200, '#e2e8f0'
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
                            'fill-extrusion-opacity': 0.9,
                            'fill-extrusion-ambient-occlusion-intensity': 0.5,
                            'fill-extrusion-ambient-occlusion-radius': 3.0
                        }
                    },
                    labelLayerId
                );
            });

            // Globe rotation animation for analytics
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
            spinGlobe();

            // Notify parent that token is set
            if (onTokenSet) {
                onTokenSet(mapboxToken);
            }

        } catch (error) {
            console.error('Error initializing analytics map:', error);
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
            try {
                map.current?.remove();
                // ensure reference is cleared to avoid double-destroy
                // @ts-ignore
                map.current = null;
            } catch (e) {
                console.error('Error removing map on unmount:', e);
            }
        };
    }, []);

    if (!isTokenSet) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <Card className="p-6 max-w-md w-full bg-card border-border">
                    <div className="space-y-4">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                Setup Mapbox for Analytics
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Enter your Mapbox public token to initialize the analytics map
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
                                Initialize Analytics Map
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

            {/* Subtle overlay for enhanced analytics theme */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/5 rounded-lg" />

            {/* Brand label */}
            <div className="absolute top-4 left-4 text-foreground/80 font-medium text-sm tracking-wide">
                Analytics Map
            </div>

            {/* Risk Information Panel */}
            {selectedBuilding && (
                <div className="absolute top-4 right-4 w-80 bg-background/95 backdrop-blur-sm rounded-lg border border-border p-4 shadow-lg z-10">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-foreground">Risks</h3>
                        <button 
                            onClick={() => setSelectedBuilding(null)}
                            className="text-muted-foreground hover:text-foreground text-sm p-1"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-medium text-foreground mb-1">Address</h4>
                            <p className="text-sm text-muted-foreground">{selectedBuilding.address}</p>
                        </div>
                        
                        {selectedBuilding.riskData && (
                            <>
                                <div>
                                    <h4 className="font-medium text-foreground mb-1">Wind Speed Risk</h4>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                            {selectedBuilding.riskData.STURM}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {selectedBuilding.riskData.STURM_TEXT}
                                        </span>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium text-foreground mb-1">Water Damage Risk</h4>
                                    <div className="flex items-center space-x-2">
                                        {(() => {
                                            const value = selectedBuilding.riskData.HOCHWASSER_FLIESSGEWAESSER;
                                            const text = selectedBuilding.riskData.FLIESSGEWAESSER_TEXT_DE;
                                            let colorClass = "text-muted-foreground";
                                            
                                            if (value >= 200) {
                                                colorClass = "text-red-500";
                                            } else if (value >= 100) {
                                                colorClass = "text-yellow-500";
                                            }
                                            
                                            return (
                                                <span className={`text-sm ${colorClass}`}>
                                                    {text || 'N/A'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Legend for dangerous buildings */}
            <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs">
                <div className="flex items-center space-x-2 mb-1">
                    <div className="w-3 h-3 bg-red-600 rounded-full border border-white"></div>
                    <span>Dangerous Buildings</span>
                </div>
            </div>
        </div>
    );
});

AnalyticsMapView.displayName = 'AnalyticsMapView';

export default AnalyticsMapView;
