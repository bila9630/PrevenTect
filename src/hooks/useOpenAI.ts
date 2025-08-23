import { useEffect, useRef } from 'react';
import OpenAI from 'openai';

export type ZoomArgs = { address: string };
export type RainArgs = { enabled: boolean };
export type AIResult =
  | { type: 'text'; content: string }
  | { type: 'function_call'; name: 'zoom_to_location'; args: ZoomArgs }
  | { type: 'function_call'; name: 'toggle_rain_effect'; args: RainArgs };

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

    // Function definitions for OpenAI to call
    const zoomToLocationFunction: OpenAI.ChatCompletionCreateParams.Function = {
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

    const toggleRainFunction: OpenAI.ChatCompletionCreateParams.Function = {
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
      functions: [zoomToLocationFunction, toggleRainFunction],
      function_call: 'auto',
      temperature: 0.3,
    });

    const message = response.choices[0].message;

    if (message.function_call) {
      const args = JSON.parse(message.function_call.arguments ?? '{}');
      if (message.function_call.name === 'zoom_to_location') {
        return { type: 'function_call', name: 'zoom_to_location', args: args as ZoomArgs };
      }
      if (message.function_call.name === 'toggle_rain_effect') {
        return { type: 'function_call', name: 'toggle_rain_effect', args: args as RainArgs };
      }
    }

    const content: string = message.content?.trim() || "I'm not sure how to answer that.";
    return { type: 'text', content };
  };

  type EstimateCtx = {
    location?: string;
    damageType: string;
    description: string;
    dateISO?: string;
    imagesCount?: number;
  };

  const estimateCoverage = async (ctx: EstimateCtx): Promise<string> => {
    if (!clientRef.current) throw new Error('OpenAI client not initialized');

    const sys = `Du bist ein Assistent der Gebäudeversicherung Bern (GVB). Du gibst nur eine VORLÄUFIGE, unverbindliche Schätzung der Reparaturkosten und einen groben, vorläufigen Deckungsrahmen in CHF an. Du kennzeichnest das Ergebnis klar als vorläufig und erwähnst, dass die tatsächliche Leistung von Police, Selbstbehalt, Ausschlüssen und der Schadenprüfung abhängt.`;

    const user = [
      `Kontext:`,
      `- Ort: ${ctx.location || 'unbekannt'}`,
      `- Schadenart: ${ctx.damageType}`,
      `- Beschreibung: ${ctx.description}`,
      `- Datum: ${ctx.dateISO || 'unbekannt'}`,
      `- Anzahl Bilder: ${ctx.imagesCount ?? 0}`,
      '',
      'Bitte: Gib eine kurze, gut lesbare vorläufige Schätzung mit einer Bandbreite (Min–Max) in CHF, nenne separat einen groben voraussichtlichen GVB-Deckungsbereich (mit dem Hinweis auf Selbstbehalt) und schliesse mit einem klaren Haftungsausschluss ab. Verwende kurze Sätze auf Deutsch.',
    ].join('\n');

    const response = await clientRef.current.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content?.trim() || 'Vorläufige Schätzung derzeit nicht verfügbar.';
  };

  type RecommendCtx = {
    location?: string;
    damageType?: string;
    description?: string;
    dateISO?: string;
    imagesCount?: number;
  };

  type RecItem = { title: string; detail: string; tags?: string[] };

  const generateRecommendations = async (ctx: RecommendCtx): Promise<RecItem[]> => {
    if (!clientRef.current) throw new Error('OpenAI client not initialized');

    const sys = `Du bist ein Assistent der Gebäudeversicherung Bern (GVB). Formuliere präzise, praxisnahe Empfehlungen für Reparatur & Prävention nach einem Schaden. Antworte auf Deutsch.`;

    const user = [
      `Kontext:`,
      `- Ort: ${ctx.location || 'unbekannt'}`,
      `- Schadenart: ${ctx.damageType || 'unbekannt'}`,
      `- Beschreibung: ${ctx.description || 'unbekannt'}`,
      `- Datum: ${ctx.dateISO || 'unbekannt'}`,
      `- Anzahl Bilder: ${ctx.imagesCount ?? 0}`,
      '',
      'Aufgabe: Gib 3–6 konkrete Empfehlungen als JSON-Array zurück. Jedes Element hat: {"title": string, "detail": string, "tags": string[]}.',
      'Richte die Empfehlungen klar auf den Kontext aus (z. B. Fenster, Holzrahmen, Dach, Fassade, Wasser).',
      'Gib NUR valides JSON zurück – ohne Fließtext, ohne Markdown.'
    ].join('\n');

    const response = await clientRef.current.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
    });

    const raw = response.choices[0].message.content?.trim() || '[]';
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((x) => x && typeof x.title === 'string' && typeof x.detail === 'string')
          .map((x) => ({ title: x.title, detail: x.detail, tags: Array.isArray(x.tags) ? x.tags.slice(0, 5) : [] }));
      }
      return [];
    } catch {
      return [];
    }
  };

  return { sendWithFunctions, estimateCoverage, generateRecommendations };
};

export default useOpenAI;
