import React from 'react';
import MapView from '@/components/MapView';
import ChatInterface from '@/components/ChatInterface';

const Index = () => {
  return (
    <div className="h-screen bg-gradient-space overflow-hidden">
      {/* Header with branding */}
      <header className="h-16 flex items-center px-6 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary shadow-lg shadow-primary/30"></div>
          <h1 className="text-xl font-bold text-foreground tracking-wide">
            mapalytics
          </h1>
        </div>
      </header>

      {/* Main split layout */}
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Map Section */}
        <div className="flex-1 p-4">
          <div className="h-full bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-2xl">
            <MapView />
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-96 p-4 pl-2">
          <div className="h-full bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-2xl overflow-hidden">
            <ChatInterface />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
