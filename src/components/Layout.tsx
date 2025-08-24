import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NavigationLinks = () => (
    <>
      <Link
        to="/"
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-colors block",
          location.pathname === "/"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        onClick={() => setSidebarOpen(false)}
      >
        Startseite
      </Link>
      <Link
        to="/analytics"
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-colors block",
          location.pathname === "/analytics"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        onClick={() => setSidebarOpen(false)}
      >
        Analyse
      </Link>
    </>
  );

  return (
    <div className="h-screen bg-gradient-space overflow-hidden">
      {/* Header with branding and navigation */}
      <header className="h-16 flex items-center px-4 md:px-6 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col gap-4 mt-6">
                  <h2 className="text-lg font-semibold">Navigation</h2>
                  <nav className="flex flex-col gap-2">
                    <NavigationLinks />
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <h1 className="text-lg md:text-xl font-bold text-foreground tracking-wide">
            PrevenTect
          </h1>

          {/* Desktop Navigation - positioned next to title */}
          <nav className="hidden md:flex items-center gap-4">
            <NavigationLinks />
          </nav>
        </div>
      </header>

      {/* Page content */}
      <div className="h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
  );
};

export default Layout;