import React, { useRef, useState } from 'react';
import MapView from '@/components/MapView';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

const Analytics = () => {
  const mapRef = useRef<any>(null);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);

  const searchLocations = async (searchText: string) => {
    if (!searchText.trim()) {
      setLocationResults([]);
      setShowResults(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const encodedText = encodeURIComponent(searchText);
      const url = `https://api3.geo.admin.ch/rest/services/ech/SearchServer?sr=2056&searchText=${encodedText}&lang=de&type=locations`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setLocationResults(data.results);
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
  };

  const searchBuildings = async (locationDetail: string) => {
    if (!locationDetail.trim()) return;
    
    setIsLoading(true);
    try {
      const encodedAddress = encodeURIComponent(locationDetail);
      const url = `https://webgis.gvb.ch/server/rest/services/natur/GEBAEUDE_NATURGEFAHREN_BE_DE_FR/MapServer/1/query?where=ORTSCHAFT='Bern'&ADDRESSE=${encodedAddress}&outFields=GWR_EGID,ADRESSE,STURM,STURM_TEXT,HOCHWASSER_FLIESSGEWAESSER,FLIESSGEWAESSER_TEXT_DE&returnGeometry=false&f=json`;
      
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

  const handleLocationSelect = (location: LocationResult) => {
    setSelectedLocation(location);
    setSearchValue(location.attrs.detail);
    setShowResults(false);
    // Proceed with building search using the selected location
    searchBuildings(location.attrs.detail);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    // Search for locations as user types
    searchLocations(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showResults && locationResults.length > 0) {
        // Select first result on Enter
        handleLocationSelect(locationResults[0]);
      } else {
        searchBuildings(searchValue);
      }
    }
  };

  return (
    <div className="h-full w-full relative">
      <MapView ref={mapRef} />
      
      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10 w-80">
        <div className="relative">
          <Input
            type="text"
            placeholder="Enter location to search for dangerous buildings..."
            value={searchValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="w-full bg-background/90 backdrop-blur-sm border-border"
            disabled={isLoading}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
        
        {/* Location Results Dropdown */}
        {showResults && locationResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background/95 backdrop-blur-sm border border-border rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
            {locationResults.map((location) => (
              <Button
                key={location.id}
                variant="ghost"
                className="w-full justify-start p-3 h-auto text-left hover:bg-accent/50"
                onClick={() => handleLocationSelect(location)}
              >
                <div className="flex flex-col items-start">
                  <div 
                    className="text-sm font-medium text-foreground"
                    dangerouslySetInnerHTML={{ __html: location.attrs.label }}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {location.attrs.detail}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;