import { useEffect, useRef } from 'react';
import OpenAI from 'openai';

export type AIResult =
  | { type: 'text'; content: string }
  | { type: 'function_call'; name: string; args: any };

interface UseOpenAIProps {
  onLocationRequest?: (address: string) => Promise<any>;
  onRainToggle?: (enabled: boolean) => Promise<any>;
}

export const useOpenAI = (apiKey?: string, props?: UseOpenAIProps) => {
  const clientRef = useRef<OpenAI | null>(null);

  useEffect(() => {
    if (apiKey) {
      clientRef.current = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    } else {
      clientRef.current = null;
    }
  }, [apiKey]);

  const sendWithFunctions = async (messageText: string): Promise<AIResult> => {
    if (!clientRef.current) throw new Error('OpenAI client not initialized');

    // Function definitions for OpenAI to call
    const zoomToLocationFunction = {
      name: 'zoom_to_location',
      description: 'Zoom the map to a specific location or address',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description:
              "The address or location to zoom to (e.g., 'Paris, France', '123 Main St, New York')",
          },
        },
        required: ['address'],
      },
    } as const;

    const toggleRainFunction = {
      name: 'toggle_rain_effect',
      description: 'Enable or disable rain effect on the map',
      parameters: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'Whether to enable (true) or disable (false) the rain effect',
          },
        },
        required: ['enabled'],
      },
    } as const;

    const response = await clientRef.current.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content:
            'Du bist ein hilfreicher Chatbot der Gebäudeversicherung Bern (GVB). Du hilfst Kunden bei Schadensmeldungen und Schadensimulationen. Antworte präzise und höflich auf Deutsch. Wenn Benutzer Orte, Adressen erwähnen oder einen Ort auf der Karte sehen möchten, verwende die zoom_to_location Funktion. Bei Wetterfragen oder Regeneffekten verwende die toggle_rain_effect Funktion.',
        },
        { role: 'user', content: messageText },
      ],
      functions: [zoomToLocationFunction as any, toggleRainFunction as any],
      function_call: 'auto',
      temperature: 0.3,
    });

    const message = response.choices[0].message as any;

    if (message.function_call) {
      const args = JSON.parse(message.function_call.arguments);
      
      if (message.function_call.name === 'zoom_to_location') {
        return { type: 'function_call', name: 'zoom_to_location', args };
      }
      
      if (message.function_call.name === 'toggle_rain_effect') {
        return { type: 'function_call', name: 'toggle_rain_effect', args };
      }
    }

    const content: string = message.content?.trim() || "I'm not sure how to answer that.";
    return { type: 'text', content };
  };

  return { sendWithFunctions };
};

export default useOpenAI;
