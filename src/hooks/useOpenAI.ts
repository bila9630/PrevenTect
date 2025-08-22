import { useEffect, useRef } from 'react';
import OpenAI from 'openai';

export type AIResult =
  | { type: 'text'; content: string }
  | { type: 'function_call'; name: string; args: any };

export const useOpenAI = (apiKey?: string) => {
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

    // Function definition for OpenAI to call when user wants to zoom to a location
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

    const response = await clientRef.current.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content:
            'You are Mapalytics, a helpful map and geospatial assistant. Be precise and concise. When users mention locations, addresses, or want to see places on a map, use the zoom_to_location function.',
        },
        { role: 'user', content: messageText },
      ],
      functions: [zoomToLocationFunction as any],
      function_call: 'auto',
      temperature: 0.3,
    });

    const message = response.choices[0].message as any;

    if (message.function_call && message.function_call.name === 'zoom_to_location') {
      const args = JSON.parse(message.function_call.arguments);
      return { type: 'function_call', name: 'zoom_to_location', args };
    }

    const content: string = message.content?.trim() || "I'm not sure how to answer that.";
    return { type: 'text', content };
  };

  return { sendWithFunctions };
};

export default useOpenAI;
