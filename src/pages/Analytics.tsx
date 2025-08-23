import React, { useRef, useState, useEffect, useCallback } from 'react';
import AnalyticsMapView from '@/components/AnalyticsMapView';
import LocationDropdown from '@/components/LocationDropdown';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { stripHtmlTags } from '@/lib/utils';

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
      // Hardcoded address for now - can be optimized later with intelligent parser
      const targetAddress = "Felshaldenweg 18, 3004 Bern";
      const targetNumber = 73;
      
      // Search for buildings in nearby areas around Felshaldenweg, including surrounding streets
      const nearbyStreets = ['Felshaldenweg', 'Kirchenfeldbrücke', 'Thunstrasse', 'Kornhausbrücke', 'Effingerstrasse'];
      const streetConditions = nearbyStreets.map(street => `ADRESSE LIKE '%${street}%'`).join(' OR ');
      const where = `(${streetConditions}) AND ADRESSE LIKE '% Bern%'`;
      const url = `/api/webgis/server/rest/services/natur/GEBAEUDE_NATURGEFAHREN_BE_DE_FR/MapServer/1/query?where=${encodeURIComponent(where)}&outFields=GWR_EGID,ADRESSE,STURM,STURM_TEXT,HOCHWASSER_FLIESSGEWAESSER,FLIESSGEWAESSER_TEXT_DE&returnGeometry=false&f=json`;
      console.log("API::::::", url)

      const response = await fetch(url);
      const data = await response.json();
      console.log("DATA::::::", data)

      if (data.features && data.features.length > 0) {
        // Extract house numbers and sort by proximity to target number
        const buildingsWithNumbers = data.features.map((feature: any) => {
          const address = feature.attributes.ADRESSE;
          const numberMatch = address.match(/\b(\d+)\b/);
          const houseNumber = numberMatch ? parseInt(numberMatch[1]) : null;
          return {
            ...feature,
            houseNumber,
            distance: houseNumber ? Math.abs(houseNumber - targetNumber) : Infinity
          };
        }).filter(building => building.houseNumber !== null);

        // Sort by distance from target number and limit to 30
        const sortedBuildings = buildingsWithNumbers
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 30);

        // Filter dangerous buildings (flood risk)
        const dangerousBuildings = sortedBuildings.filter((building: any) => {
          const attrs = building.attributes;
          return attrs.HOCHWASSER_FLIESSGEWAESSER !== null &&
            attrs.FLIESSGEWAESSER_TEXT_DE !== 'keine Gefährdung';
        });

        if (dangerousBuildings.length > 0) {
          // Get coordinates for dangerous addresses using Mapbox Geocoding
          const coordinates = await Promise.all(
            dangerousBuildings.map(async (building: any) => {
              try {
                const address = building.attributes.ADRESSE;
                // Add "Bern" to ensure we get Bern addresses and use proximity to Bern center
                const searchQuery = `${address}, Bern`;
                const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${localStorage.getItem('mapbox-token')}&proximity=7.4474,46.9480&bbox=7.3000,46.8000,7.6000,47.1000`;
                const geocodeResponse = await fetch(geocodeUrl);
                const geocodeData = await geocodeResponse.json();

                if (geocodeData.features && geocodeData.features.length > 0) {
                  const [lng, lat] = geocodeData.features[0].center;
                  // Validate within Bern bbox to avoid stray results (e.g., Hasle b. Burgdorf)
                  const inBernBbox = lng >= 7.3000 && lng <= 7.6000 && lat >= 46.8000 && lat <= 47.1000;
                  const isBernAddress = /\bBern\b/i.test(address) && !/Hasle/i.test(address);
                  if (!inBernBbox || !isBernAddress) return null;
                  return {
                    lat,
                    lng,
                    address,
                    riskData: building.attributes
                  };
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
            toast.success(`Found ${dangerousBuildings.length} dangerous building(s) near ${targetAddress}, ${validCoordinates.length} mapped`);
          } else {
            toast.error('Could not geocode dangerous addresses');
          }
        } else {
          mapRef.current?.clearMarkers();
          toast.info(`No dangerous buildings found near ${targetAddress}`);
        }
      } else {
        toast.error('No buildings found in nearby areas');
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
    setSearchValue(stripHtmlTags(location.attrs.label));
    setShowResults(false);
    
    // Center map on Brückenstrasse 73, 3005 Bern (coordinates: 7.4333, 46.9548)
    mapRef.current?.flyTo([7.4333, 46.9548], 14);
    
    // Always use the hardcoded address for building search
    searchBuildings("Felshaldenweg 18, 3004 Bern");
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