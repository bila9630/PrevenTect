import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface AnalyticsProps {
  currentAddress: string;
}

const Analytics: React.FC<AnalyticsProps> = ({ currentAddress }) => {
  const [address, setAddress] = useState(currentAddress);
  const [iframeKey, setIframeKey] = useState(0);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Force iframe refresh by changing key
    setIframeKey(prev => prev + 1);
  };

  // Update local address when prop changes
  React.useEffect(() => {
    setAddress(currentAddress);
  }, [currentAddress]);

  return (
    <div className="h-full flex flex-col bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-2xl overflow-hidden">
      {/* Address input section */}
      <div className="p-4 border-b border-border bg-background/50">
        <form onSubmit={handleAddressSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter address for analysis..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Iframe section */}
      <div className="flex-1 p-4">
        <div className="h-full rounded-lg overflow-hidden border border-border">
          <iframe
            key={iframeKey}
            src="https://www.bafu.admin.ch/bafu/de/home/themen/naturgefahren/gefahrengrundlagen/naturgefahren-karten/oberflaechenabfluss.html"
            title="Surface Runoff Map"
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

export default Analytics;