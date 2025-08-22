import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

const Analytics = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const executeScript = async () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      // Wait for iframe to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Find nested iframe within the main iframe
      const nestedIframe = iframeDoc.querySelector('iframe') as HTMLIFrameElement;
      if (!nestedIframe) return;

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const nestedDoc = nestedIframe.contentDocument || nestedIframe.contentWindow?.document;
      if (!nestedDoc) return;

      // Find input field with specific placeholder
      const inputField = nestedDoc.querySelector('input[placeholder*="Suche nach Adressen"]') as HTMLInputElement;
      if (!inputField) return;

      // Fill input field
      inputField.focus();
      inputField.value = "Brückenstrasse 73, 3005 Bern";
      inputField.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 1000));

      // First Enter
      const oldActive = nestedDoc.activeElement;
      inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      // Wait for focus change
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Second Enter on new active element
      const newActive = nestedDoc.activeElement as HTMLElement;
      if (newActive && newActive !== oldActive) {
        newActive.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }

      console.log("✅ Enter zweimal gesendet (zweites Mal an das neue aktive Element).");
      
    } catch (error) {
      console.error("Script execution failed:", error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-background border-b">
        <h2 className="text-2xl font-bold text-foreground mb-2">Analytics - BAFU Surface Runoff</h2>
        <Button onClick={executeScript} className="mb-4">
          Execute Automation Script
        </Button>
      </div>
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src="https://www.bafu.admin.ch/bafu/de/home/themen/naturgefahren/gefahrengrundlagen/naturgefahren-karten/oberflaechenabfluss.html"
          className="w-full h-full border-0"
          title="BAFU Surface Runoff Map"
        />
      </div>
    </div>
  );
};

export default Analytics;