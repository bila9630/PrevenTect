import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Slider } from '@/components/ui/slider';

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
    const [riskMode, setRiskMode] = useState<'water' | 'wind'>('water');
    const [markersData, setMarkersData] = useState<Array<{ lat: number; lng: number; address: string; riskData?: any }>>([]);
    const [waterThreshold, setWaterThreshold] = useState([1]);
    const [windThreshold, setWindThreshold] = useState([25]);

    // Load cached token on component mount
    useEffect(() => {
        const cachedToken = localStorage.getItem('mapbox-token');
        if (cachedToken) {
            setMapboxToken(cachedToken);
            setIsTokenSet(true);
        }
    }, []);

    // Helper function to create markers based on current risk mode
    const createMarkers = (coordinates: Array<{ lat: number; lng: number; address: string; riskData?: any }>) => {
        if (!map.current) return;

        // Add new markers
        const newMarkers = coordinates.map(coord => {
            // Create simple marker element - root stays untouched for Mapbox positioning
            const el = document.createElement('div');
            el.className = 'building-marker';
            el.style.cursor = 'pointer';
            el.style.width = '20px';
            el.style.height = '24px';
            el.setAttribute('data-id', coord.address);

            // Inner wrapper for scaling - this won't interfere with Mapbox positioning
            const inner = document.createElement('div');
            inner.style.width = '100%';
            inner.style.height = '100%';
            inner.style.transition = 'transform 0.2s ease';
            inner.style.transformOrigin = '50% 100%';

            const updateMarkerSize = (isSelected: boolean) => {
                if (isSelected) {
                    inner.style.transform = 'scale(1.5)';
                    el.style.zIndex = '1000';
                    el.setAttribute('data-selected', 'true');
                } else {
                    inner.style.transform = 'scale(1)';
                    el.style.zIndex = '1';
                    el.setAttribute('data-selected', 'false');
                }
            };

            let riskValue, minVal, maxVal, fillColor, shadowColor;

            if (riskMode === 'water') {
                // Water damage risk (1-6 => green->red)
                riskValue = coord.riskData?.HOCHWASSER_FLIESSGEWAESSER;
                minVal = 1;
                maxVal = 6;
            } else {
                // Wind risk (25-38 => green->red)  
                riskValue = coord.riskData?.STURM;
                minVal = 25;
                maxVal = 38;
            }

            const normalizedRisk = Math.max(minVal, Math.min(maxVal, Number(riskValue)));
            const t = Number.isNaN(normalizedRisk) ? 0 : (normalizedRisk - minVal) / (maxVal - minVal);
            const hue = 120 * (1 - t); // 120deg (green) to 0deg (red)
            fillColor = `hsl(${hue}, 80%, 50%)`;
            shadowColor = `hsla(${hue}, 80%, 50%, 0.6)`;

            // SVG pin in inner wrapper - not root element
            inner.innerHTML = `
              <svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block; filter: drop-shadow(0 2px 6px ${shadowColor});">
                <path d="M12 2C8.14 2 5 5.08 5 8.86c0 5.19 7 12.28 7 12.28s7-7.09 7-12.28C19 5.08 15.86 2 12 2zm0 9.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4z" fill="${fillColor}" stroke="white" stroke-width="1.5" />
              </svg>
            `;
            el.appendChild(inner);

            // Initial size
            updateMarkerSize(false);

            // Add click handler to marker
            el.addEventListener('click', () => {
                const container = mapContainer.current;
                const wasSelected = el.getAttribute('data-selected') === 'true';
                if (container) {
                    container.querySelectorAll('.building-marker').forEach((node) => {
                        const n = node as HTMLDivElement;
                        const innerEl = n.querySelector('div') as HTMLDivElement | null;
                        if (innerEl) innerEl.style.transform = 'scale(1)';
                        n.style.zIndex = '1';
                        n.setAttribute('data-selected', 'false');
                    });
                }

                if (wasSelected) {
                    updateMarkerSize(false);
                    setSelectedBuilding(null);
                    return;
                }

                updateMarkerSize(true);
                setSelectedBuilding({
                    address: coord.address,
                    riskData: coord.riskData,
                    markerId: coord.address
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
                // Single marker: zoom to it with 3D effect
                map.current.flyTo({
                    center: [coordinates[0].lng, coordinates[0].lat],
                    zoom: 14,
                    duration: 1200,
                    pitch: 60,
                    bearing: Math.random() * 40 - 20
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
                    maxZoom: 18,
                    pitch: 60  // Keep 3D view when fitting bounds
                });
            }
        }

        setMarkers(newMarkers);
    };

    // Effect to update markers when risk mode changes
    useEffect(() => {
        if (markersData.length > 0) {
            // Store current selection state and map state
            const currentSelection = selectedBuilding;
            const currentCenter = map.current?.getCenter();
            const currentZoom = map.current?.getZoom();
            const currentPitch = map.current?.getPitch();
            const currentBearing = map.current?.getBearing();

            // Clear existing markers but preserve state
            markers.forEach(marker => marker.remove());

            // Recreate markers without automatic flying
            const newMarkers = markersData.map(coord => {
                // Create simple marker element - root stays untouched for Mapbox positioning
                const el = document.createElement('div');
                el.className = 'building-marker';
                el.style.cursor = 'pointer';
                el.style.width = '20px';
                el.style.height = '24px';
                el.setAttribute('data-id', coord.address);

                // Inner wrapper for scaling - this won't interfere with Mapbox positioning
                const inner = document.createElement('div');
                inner.style.width = '100%';
                inner.style.height = '100%';
                inner.style.transition = 'transform 0.2s ease';
                inner.style.transformOrigin = '50% 100%';

                const updateMarkerSize = (isSelected: boolean) => {
                    if (isSelected) {
                        inner.style.transform = 'scale(1.5)';
                        el.style.zIndex = '1000';
                        el.setAttribute('data-selected', 'true');
                    } else {
                        inner.style.transform = 'scale(1)';
                        el.style.zIndex = '1';
                        el.setAttribute('data-selected', 'false');
                    }
                };

                let riskValue, minVal, maxVal, fillColor, shadowColor;
                let isFiltered = false;

                if (riskMode === 'water') {
                    // Water damage risk (1-6 => green->red)
                    riskValue = coord.riskData?.HOCHWASSER_FLIESSGEWAESSER;
                    minVal = 1;
                    maxVal = 6;
                    isFiltered = Number(riskValue) < waterThreshold[0];
                } else {
                    // Wind risk (25-38 => green->red)  
                    riskValue = coord.riskData?.STURM;
                    minVal = 25;
                    maxVal = 38;
                    isFiltered = Number(riskValue) < windThreshold[0];
                }

                if (isFiltered) {
                    // Gray out filtered markers
                    fillColor = `hsl(0, 0%, 60%)`;
                    shadowColor = `hsla(0, 0%, 60%, 0.6)`;
                } else {
                    const normalizedRisk = Math.max(minVal, Math.min(maxVal, Number(riskValue)));
                    const t = Number.isNaN(normalizedRisk) ? 0 : (normalizedRisk - minVal) / (maxVal - minVal);
                    const hue = 120 * (1 - t); // 120deg (green) to 0deg (red)
                    fillColor = `hsl(${hue}, 80%, 50%)`;
                    shadowColor = `hsla(${hue}, 80%, 50%, 0.6)`;
                }

                // SVG pin in inner wrapper - not root element
                inner.innerHTML = `
                  <svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block; filter: drop-shadow(0 2px 6px ${shadowColor});">
                    <path d="M12 2C8.14 2 5 5.08 5 8.86c0 5.19 7 12.28 7 12.28s7-7.09 7-12.28C19 5.08 15.86 2 12 2zm0 9.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4z" fill="${fillColor}" stroke="white" stroke-width="1.5" />
                  </svg>
                `;
                el.appendChild(inner);

                // Initial size
                updateMarkerSize(false);

                // Add click handler to marker
                el.addEventListener('click', () => {
                    const container = mapContainer.current;
                    const wasSelected = el.getAttribute('data-selected') === 'true';
                    if (container) {
                        container.querySelectorAll('.building-marker').forEach((node) => {
                            const n = node as HTMLDivElement;
                            const innerEl = n.querySelector('div') as HTMLDivElement | null;
                            if (innerEl) innerEl.style.transform = 'scale(1)';
                            n.style.zIndex = '1';
                            n.setAttribute('data-selected', 'false');
                        });
                    }

                    if (wasSelected) {
                        updateMarkerSize(false);
                        setSelectedBuilding(null);
                        return;
                    }

                    updateMarkerSize(true);
                    setSelectedBuilding({
                        address: coord.address,
                        riskData: coord.riskData,
                        markerId: coord.address
                    });
                });

                const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                    .setLngLat([coord.lng, coord.lat])
                    .addTo(map.current!);

                return marker;
            });

            setMarkers(newMarkers);

            // Restore map state after markers are recreated
            if (currentCenter && currentZoom !== undefined && currentPitch !== undefined && currentBearing !== undefined) {
                map.current?.jumpTo({
                    center: currentCenter,
                    zoom: currentZoom,
                    pitch: currentPitch,
                    bearing: currentBearing
                });
            }

            // Restore selection after markers are recreated
            if (currentSelection) {
                // Small delay to ensure markers are created
                setTimeout(() => {
                    const markerEl = mapContainer.current?.querySelector(`[data-id="${currentSelection.markerId}"]`) as HTMLDivElement;
                    if (markerEl) {
                        const innerEl = markerEl.querySelector('div') as HTMLDivElement | null;
                        if (innerEl) innerEl.style.transform = 'scale(1.5)';
                        markerEl.style.zIndex = '1000';
                        markerEl.setAttribute('data-selected', 'true');
                    }
                }, 50);
            }
        }
    }, [riskMode, waterThreshold, windThreshold]);

    // Shrink all markers when selection is cleared
    useEffect(() => {
        if (!selectedBuilding && mapContainer.current) {
            mapContainer.current.querySelectorAll('.building-marker').forEach((node) => {
                const n = node as HTMLDivElement;
                const innerEl = n.querySelector('div') as HTMLDivElement | null;
                if (innerEl) innerEl.style.transform = 'scale(1)';
                n.style.zIndex = '1';
                n.setAttribute('data-selected', 'false');
            });
        }
    }, [selectedBuilding]);

    // Expose map controls to parent component
    useImperativeHandle(ref, () => ({
        flyTo: (coordinates: [number, number], zoom = 12) => {
            if (map.current) {
                map.current.flyTo({
                    center: coordinates,
                    zoom: zoom,
                    pitch: 60,
                    bearing: Math.random() * 60 - 30, // Random rotation between -30 and 30 degrees
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

            // Store markers data for mode switching
            setMarkersData(coordinates);

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

            createMarkers(coordinates);
        },
        clearMarkers: () => {
            markers.forEach(marker => marker.remove());
            setMarkers([]);
            setSelectedBuilding(null);
            setMarkersData([]);

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
    }), [markers, markersData, riskMode]);

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

            // Add scale control for analytics (keep minimal UI)
            map.current.addControl(new mapboxgl.ScaleControl({
                maxWidth: 100,
                unit: 'metric'
            }));


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
                <div className="absolute top-4 right-4 w-96 bg-background/95 backdrop-blur-sm rounded-lg border border-border p-4 shadow-lg z-10">
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
                            <div className="space-y-3">
                                {/* Water Risk */}
                                <div className={`${riskMode === 'water' ? 'opacity-100' : 'opacity-50'}`}>
                                    <h4 className={`font-medium mb-1 ${riskMode === 'water' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        Risiko Wasserschaden
                                    </h4>
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

                                {/* Wind Risk */}
                                <div className={`${riskMode === 'wind' ? 'opacity-100' : 'opacity-50'}`}>
                                    <h4 className={`font-medium mb-1 ${riskMode === 'wind' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        Risiko Sturm
                                    </h4>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-muted-foreground">
                                            {selectedBuilding.riskData.STURM_TEXT || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Combined Risk Filter Controls */}
            <div className="absolute bottom-4 right-4 z-10 w-96">
                <Card className="w-full bg-background/90 backdrop-blur-sm border-border shadow-lg">
                    <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-base font-semibold text-gray-600">
                            Risiko Filter
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        {/* Risk Mode Toggle */}
                        <div className="grid grid-cols-2 gap-2 mb-10">
                            <button
                                onClick={() => setRiskMode('water')}
                                className={`flex items-center justify-center px-3 py-2 rounded-md transition-colors ${riskMode === 'water'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <span className="text-xs font-medium">Wasser</span>
                            </button>

                            <button
                                onClick={() => setRiskMode('wind')}
                                className={`flex items-center justify-center px-3 py-2 rounded-md transition-colors ${riskMode === 'wind'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <span className="text-xs font-medium">Wind</span>
                            </button>
                        </div>

                        {/* Slider with value above and min/max below */}
                        {riskMode === 'water' ? (
                            <div className="space-y-1 relative w-full">
                                <div className="relative h-6 w-full">
                                    <Slider
                                        value={waterThreshold}
                                        onValueChange={setWaterThreshold}
                                        min={1}
                                        max={6}
                                        step={1}
                                        className="w-full"
                                    />
                                    <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 pointer-events-none">
                                        <span className="text-white font-bold text-sm drop-shadow-[0_0_8px_hsl(var(--primary))]">
                                            ~{Math.round((waterThreshold[0] - 1) * 40)}cm
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>0cm</span>
                                    <span>200cm+</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1 relative w-full">
                                <div className="relative h-6 w-full">
                                    <Slider
                                        value={windThreshold}
                                        onValueChange={setWindThreshold}
                                        min={25}
                                        max={38}
                                        step={1}
                                        className="w-full"
                                    />
                                    <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 pointer-events-none">
                                        <span className="text-white font-bold text-sm drop-shadow-[0_0_8px_hsl(var(--primary))]">
                                            {windThreshold[0] * 4} km/h
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>100 km/h</span>
                                    <span>152+ km/h</span>
                                </div>
                            </div>
                        )}

                        {/* Send Info Button */}
                        <div className="mt-8 pt-6">
                            {(() => {
                                if (selectedBuilding) {
                                    // Show selected building address
                                    return (
                                        <ConfirmDialog
                                            trigger={
                                                <Button className="w-full py-3 px-4 font-medium bg-red-600 hover:bg-red-700 text-white">
                                                    Info an {selectedBuilding.address} senden!
                                                </Button>
                                            }
                                            title="Sind Sie sicher?"
                                            description={`Möchten Sie die Informationen an ${selectedBuilding.address} senden? Diese Aktion kann nicht rückgängig gemacht werden.`}
                                            confirmText="Ja, senden"
                                            cancelText="Abbrechen"
                                            onConfirm={() => {
                                                console.log(`Sending info to ${selectedBuilding.address}`);
                                            }}
                                        />
                                    );
                                } else {
                                    // No selection - show count of visible markers
                                    const visibleMarkersCount = markersData.filter(coord => {
                                        let riskValue;
                                        if (riskMode === 'water') {
                                            riskValue = coord.riskData?.HOCHWASSER_FLIESSGEWAESSER;
                                            return Number(riskValue) >= waterThreshold[0];
                                        } else {
                                            riskValue = coord.riskData?.STURM;
                                            return Number(riskValue) >= windThreshold[0];
                                        }
                                    }).length;

                                    const hasEnoughMarkers = visibleMarkersCount > 0;

                                    return (
                                        <ConfirmDialog
                                            trigger={
                                                <Button
                                                    className={`w-full py-3 px-4 font-medium ${hasEnoughMarkers
                                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                                        }`}
                                                    disabled={!hasEnoughMarkers}
                                                >
                                                    {hasEnoughMarkers
                                                        ? `Info an ${visibleMarkersCount} Liegenschaften senden!`
                                                        : 'Info an Liegenschaften senden'
                                                    }
                                                </Button>
                                            }
                                            title="Sind Sie sicher?"
                                            description={`Möchten Sie die Informationen an ${visibleMarkersCount} Liegenschaften senden? Diese Aktion kann nicht rückgängig gemacht werden.`}
                                            confirmText="Ja, senden"
                                            cancelText="Abbrechen"
                                            onConfirm={() => {
                                                console.log(`Sending info to ${visibleMarkersCount} properties`);
                                            }}
                                        />
                                    );
                                }
                            })()}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
});

AnalyticsMapView.displayName = 'AnalyticsMapView';

export default AnalyticsMapView;
