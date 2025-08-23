import React, { useRef, useState, useEffect, useCallback } from 'react';
import AnalyticsMapView from '@/components/AnalyticsMapView';
import LocationDropdown from '@/components/LocationDropdown';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface BuildingData {
  GWR_EGID: number;
  ADRESSE: string;
  STURM: number;
  STURM_TEXT: string;
  HOCHWASSER_FLIESSGEWAESSER: number | null;
  FLIESSGEWAESSER_TEXT_DE: string;
}

interface LocationResult {
  id: number;
  weight: number;
  attrs: {
    label: string;
    detail: string;
    lat: number;
    lon: number;
    x: number;
    y: number;
  };
}

interface AnalyticsMapViewRef {
  flyTo: (coordinates: [number, number], zoom?: number) => void;
  addMarkers: (coordinates: Array<{ lat: number; lng: number; address: string }>) => void;
  clearMarkers: () => void;
  focusOnLocation: (coordinates: [number, number]) => void;
}

const Analytics = () => {
  const mapRef = useRef<AnalyticsMapViewRef>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback((searchText: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      if (searchText.trim()) {
        // remove setIsLoading(true) here
        searchLocations(searchText);
      }
    }, 300);
  }, []);

  const searchLocations = useCallback(async (searchText: string) => {
    if (!searchText.trim()) {
      setLocationResults([]);
      setShowResults(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true); // moved here

    try {
      const encodedText = encodeURIComponent(searchText);
      const url = `https://api3.geo.admin.ch/rest/services/ech/SearchServer?sr=2056&searchText=${encodedText}&lang=de&type=locations`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        setLocationResults(prev => JSON.stringify(prev) !== JSON.stringify(data.results) ? data.results : prev);
        setShowResults(true);
      } else {
        setLocationResults([]);
        setShowResults(false);
        toast.info('No locations found');
      }
    } catch (error) {
      console.error('Location search error:', error);
      toast.error('Failed to search locations');
      setLocationResults([]);
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchBuildings = async (locationDetail: string) => {
    if (!locationDetail.trim()) return;

    setIsLoading(true);
    try {
      const encodedAddress = encodeURIComponent(locationDetail);
      const url = `/api/webgis/server/rest/services/natur/GEBAEUDE_NATURGEFAHREN_BE_DE_FR/MapServer/1/query?where=ORTSCHAFT=%27${encodedAddress}%27&outFields=GWR_EGID,ADRESSE,STURM,STURM_TEXT,HOCHWASSER_FLIESSGEWAESSER,FLIESSGEWAESSER_TEXT_DE&returnGeometry=false&f=json`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        // Filter dangerous buildings (flood risk)
        const dangerousBuildings = data.features.filter((feature: any) => {
          const attrs = feature.attributes;
          return attrs.HOCHWASSER_FLIESSGEWAESSER !== null &&
            attrs.FLIESSGEWAESSER_TEXT_DE !== 'keine Gefährdung';
        });

        if (dangerousBuildings.length > 0) {
          // Get coordinates for dangerous addresses using Mapbox Geocoding
          const coordinates = await Promise.all(
            dangerousBuildings.map(async (building: any) => {
              try {
                const address = building.attributes.ADRESSE;
                const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${localStorage.getItem('mapbox-token')}`;
                const geocodeResponse = await fetch(geocodeUrl);
                const geocodeData = await geocodeResponse.json();

                if (geocodeData.features && geocodeData.features.length > 0) {
                  const [lng, lat] = geocodeData.features[0].center;
                  return { lat, lng, address };
                }
                return null;
              } catch (error) {
                console.error('Geocoding error:', error);
                return null;
              }
            })
          );

          const validCoordinates = coordinates.filter(coord => coord !== null);

          if (validCoordinates.length > 0) {
            mapRef.current?.addMarkers(validCoordinates);
            toast.success(`Found ${dangerousBuildings.length} dangerous building(s), ${validCoordinates.length} mapped`);
          } else {
            toast.error('Could not geocode dangerous addresses');
          }
        } else {
          mapRef.current?.clearMarkers();
          toast.info('No dangerous buildings found for this search');
        }
      } else {
        toast.error('No buildings found for this address');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search buildings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = useCallback((location: LocationResult) => {
    setSelectedLocation(location);
    setSearchValue(location.attrs.label);
    setShowResults(false);
    // Use label (city name) instead of detail (full address with canton)
    searchBuildings(location.attrs.label);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    if (!value.trim()) {
      setLocationResults([]);
      setShowResults(false);
      setIsLoading(false);
      return;
    }

    // Use debounced search to avoid interfering with typing
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (showResults && locationResults.length > 0) {
        handleLocationSelect(locationResults[0]);
      } else {
        searchBuildings(searchValue);
      }
    }
  }, [showResults, locationResults, handleLocationSelect, searchValue]);

  return (
    <div className="h-full w-full relative">
      <AnalyticsMapView ref={mapRef} />

      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10 w-80">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Enter location to search for dangerous buildings..."
            value={searchValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-background/90 backdrop-blur-sm border-border"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        <LocationDropdown
          showResults={showResults}
          locationResults={locationResults}
          onLocationSelect={handleLocationSelect}
        />
      </div>
    </div>
  );
};

export default Analytics;