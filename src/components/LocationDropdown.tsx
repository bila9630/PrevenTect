import React from 'react';
import { Button } from '@/components/ui/button';

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

interface LocationDropdownProps {
  showResults: boolean;
  locationResults: LocationResult[];
  onLocationSelect: (location: LocationResult) => void;
}

const LocationDropdown: React.FC<LocationDropdownProps> = ({
  showResults,
  locationResults,
  onLocationSelect
}) => {
  if (!showResults || locationResults.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto overflow-x-hidden z-20">
      {locationResults.map((location) => (
        <Button
          key={location.id}
          variant="ghost"
          className="w-full justify-start p-3 h-auto text-left hover:bg-accent/50 text-wrap break-words"
          onClick={() => onLocationSelect(location)}
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
  );
};

export default LocationDropdown;