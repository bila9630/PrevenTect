import React, { useRef, useState } from 'react';
import MapView from '@/components/MapView';
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

const Analytics = () => {
  const mapRef = useRef<any>(null);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const searchBuildings = async (address: string) => {
    if (!address.trim()) return;
    
    setIsLoading(true);
    try {
      const encodedAddress = encodeURIComponent(address);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchBuildings(searchValue);
    }
  };

  return (
    <div className="h-full w-full relative">
      <MapView ref={mapRef} />
      
      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10">
        <Input
          type="text"
          placeholder="Enter address to search for dangerous buildings..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-80 bg-background/90 backdrop-blur-sm border-border"
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;