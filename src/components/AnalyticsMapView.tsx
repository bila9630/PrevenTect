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
    addMarkers: (coordinates: Array<{ lat: number; lng: number; address: string }>) => void;
    clearMarkers: () => void;
    focusOnLocation: (coordinates: [number, number]) => void;
}

const AnalyticsMapView = forwardRef<AnalyticsMapViewRef, AnalyticsMapViewProps>(({ onTokenSet }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [mapboxToken, setMapboxToken] = useState('');
    const [isTokenSet, setIsTokenSet] = useState(false);
    const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);

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
        addMarkers: (coordinates: Array<{ lat: number; lng: number; address: string }>) => {
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
                // Create custom marker element shaped like a geo pin
                const el = document.createElement('div');
                el.className = 'dangerous-building-marker';
                el.style.width = '20px';
                el.style.height = '20px';
                el.style.cursor = 'pointer';
                el.style.position = 'relative';
                
                // Create the pin shape using CSS
                el.innerHTML = `
                    <div style="
                        width: 16px;
                        height: 16px;
                        background: #dc2626;
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 2px solid white;
                        box-shadow: 0 2px 8px rgba(220, 38, 38, 0.6);
                        position: absolute;
                        top: 0;
                        left: 2px;
                        animation: bounce 2s infinite;
                    "></div>
                    <div style="
                        width: 6px;
                        height: 6px;
                        background: white;
                        border-radius: 50%;
                        position: absolute;
                        top: 3px;
                        left: 7px;
                        transform: rotate(45deg);
                        z-index: 1;
                    "></div>
                `;

                // Add bouncing animation for geo pin markers
                if (!document.getElementById('danger-marker-styles')) {
                    const style = document.createElement('style');
                    style.id = 'danger-marker-styles';
                    style.textContent = `
            @keyframes bounce {
              0%, 20%, 50%, 80%, 100% { transform: rotate(-45deg) translateY(0); }
              40% { transform: rotate(-45deg) translateY(-3px); }
              60% { transform: rotate(-45deg) translateY(-2px); }
            }
          `;
                    document.head.appendChild(style);
                }

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([coord.lng, coord.lat])
                    .setPopup(
                        new mapboxgl.Popup({ offset: 25 }).setHTML(
                            `<div style="font-size: 14px; font-weight: 500; color: #dc2626;">
                <strong>⚠️ Dangerous Building</strong><br/>
                ${coord.address}
              </div>`
                        )
                    )
                    .addTo(map.current!);

                return marker;
            });

            // Add danger zone circles around buildings
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

                map.current.addSource('dangerous-building-circles', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: circleFeatures
                    }
                });

                map.current.addLayer({
                    id: 'dangerous-building-circles',
                    type: 'circle',
                    source: 'dangerous-building-circles',
                    paint: {
                        'circle-radius': {
                            base: 1.75,
                            stops: [
                                [12, 15],
                                [22, 40]
                            ]
                        },
                        'circle-color': '#dc2626',
                        'circle-opacity': 0.15,
                        'circle-stroke-width': 3,
                        'circle-stroke-color': '#dc2626',
                        'circle-stroke-opacity': 0.8
                    }
                });

                // Add animated ripple effect
                map.current.addLayer({
                    id: 'dangerous-building-ripple',
                    type: 'circle',
                    source: 'dangerous-building-circles',
                    paint: {
                        'circle-radius': {
                            base: 1.75,
                            stops: [
                                [12, 20],
                                [22, 50]
                            ]
                        },
                        'circle-color': '#dc2626',
                        'circle-opacity': 0.05,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#dc2626',
                        'circle-stroke-opacity': 0.3
                    }
                });

                // Add click handlers to circles for address display
                map.current.on('click', 'dangerous-building-circles', (e) => {
                    if (e.features && e.features.length > 0) {
                        const address = e.features[0].properties?.address;
                        if (address) {
                            new mapboxgl.Popup()
                                .setLngLat(e.lngLat)
                                .setHTML(`
                                    <div style="font-size: 14px; font-weight: 500; color: #dc2626;">
                                        <strong>⚠️ Dangerous Building</strong><br/>
                                        ${address}
                                    </div>
                                `)
                                .addTo(map.current!);
                        }
                    }
                });

                // Add click handlers to ripple circles too
                map.current.on('click', 'dangerous-building-ripple', (e) => {
                    if (e.features && e.features.length > 0) {
                        const address = e.features[0].properties?.address;
                        if (address) {
                            new mapboxgl.Popup()
                                .setLngLat(e.lngLat)
                                .setHTML(`
                                    <div style="font-size: 14px; font-weight: 500; color: #dc2626;">
                                        <strong>⚠️ Dangerous Building</strong><br/>
                                        ${address}
                                    </div>
                                `)
                                .addTo(map.current!);
                        }
                    }
                });

                // Change cursor on hover
                map.current.on('mouseenter', 'dangerous-building-circles', () => {
                    if (map.current) map.current.getCanvas().style.cursor = 'pointer';
                });
                map.current.on('mouseleave', 'dangerous-building-circles', () => {
                    if (map.current) map.current.getCanvas().style.cursor = '';
                });
                map.current.on('mouseenter', 'dangerous-building-ripple', () => {
                    if (map.current) map.current.getCanvas().style.cursor = 'pointer';
                });
                map.current.on('mouseleave', 'dangerous-building-ripple', () => {
                    if (map.current) map.current.getCanvas().style.cursor = '';
                });

                // Fly to show all markers
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

            {/* Legend for dangerous buildings */}
            <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs">
                <div className="flex items-center space-x-2 mb-1">
                    <div className="w-3 h-3 bg-red-600 rounded-full border border-white"></div>
                    <span>Dangerous Buildings</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 border-2 border-red-600 rounded-full bg-red-600/20"></div>
                    <span>Risk Zone</span>
                </div>
            </div>
        </div>
    );
});

AnalyticsMapView.displayName = 'AnalyticsMapView';

export default AnalyticsMapView;
