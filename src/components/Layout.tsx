import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  return (
    <div className="h-screen bg-gradient-space overflow-hidden">
      {/* Header with branding and navigation */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary shadow-lg shadow-primary/30"></div>
          <h1 className="text-xl font-bold text-foreground tracking-wide">
            mapalytics
          </h1>
        </div>
        
        <nav className="flex items-center gap-4">
          <Link
            to="/"
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              location.pathname === "/" 
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Home
          </Link>
          <Link
            to="/analytics"
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              location.pathname === "/analytics"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Analytics
          </Link>
        </nav>
      </header>

      {/* Page content */}
      <div className="h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
  );
};

export default Layout;