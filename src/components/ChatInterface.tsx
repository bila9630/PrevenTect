import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, MapPin, CalendarIcon } from 'lucide-react';
import LoadingMessage from './LoadingMessage';
import ApiKeySetupCard from './ApiKeySetupCard';
import EstimateResult from './EstimateResult';
import DamageSummary from './DamageSummary';
import RepairRecommendations from './RepairRecommendations';
import ImageUpload from './ImageUpload';
import { useToast } from '@/components/ui/use-toast';
import { useOpenAI } from '@/hooks/useOpenAI';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  isLoadingMessage?: boolean;
  loadingSteps?: string[];
  currentStep?: number;
  isEstimate?: boolean;
}

interface ChatInterfaceProps {
  onLocationRequest?: (address: string) => Promise<{ success: boolean; location?: string; coordinates?: number[]; error?: string }>;
  onRainToggle?: (enabled: boolean) => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
  onRequestPartners?: () => void;
}

const ChatInterface = ({ onLocationRequest, onRainToggle, onRequestPartners }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hallo! Ich bin der GVB Chatbot. Wie kann ich dir behilflich sein?',
      timestamp: new Date(),
      isUser: false,
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showQuickOptions, setShowQuickOptions] = useState<boolean>(true);
  const [showDamageOptions, setShowDamageOptions] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showImageUpload, setShowImageUpload] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [conversationState, setConversationState] = useState<'initial' | 'damage_selected' | 'description_given' | 'date_needed' | 'date_selected'>('initial');
  const [lastBotMessageId, setLastBotMessageId] = useState<string>('');
  const [showRepairOptions, setShowRepairOptions] = useState<boolean>(false);
  // Show a contextual "Danke" button after partner route is displayed
  const [showThanksOption, setShowThanksOption] = useState<boolean>(false);
  const [thanksMessageId, setThanksMessageId] = useState<string>('');
  // Show simulation options after the follow-up question
  const [showSimulationOptions, setShowSimulationOptions] = useState<boolean>(false);
  const { toast } = useToast();
  const { sendWithFunctions, estimateCoverage, generateRecommendations } = useOpenAI(apiKey);

  // Claim context we gather across the flow
  const [selectedDamageType, setSelectedDamageType] = useState<string | null>(null);
  const [damageDescription, setDamageDescription] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [aiRecItems, setAIRecItems] = useState<Array<{ title: string; detail: string; tags?: string[] }>>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load saved API key from localStorage
    const k = localStorage.getItem('openai_api_key');
    if (k) setApiKey(k);
  }, []);

  const saveApiKey = () => {
    if (!apiKeyInput.trim()) {
      toast({ description: 'Bitte gib einen API-Schlüssel ein.' });
      return;
    }
    localStorage.setItem('openai_api_key', apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setApiKeyInput('');
    toast({ description: 'OpenAI API-Schlüssel lokal gespeichert.' });
  };

  // Show a 3-step loader when requesting partner companies and then trigger the route
  const handleRequestPartnersClick = async () => {
    if (!onRequestPartners) return;
    const loaderId = (Date.now() + 100).toString();
    const loadingMsg: Message = {
      id: loaderId,
      text: '',
      timestamp: new Date(),
      isUser: false,
      isLoadingMessage: true,
      loadingSteps: ['Standort prüfen', 'Partnerbetriebe in der Nähe finden', 'Route berechnen'],
      currentStep: 0,
    };
    setMessages(prev => [...prev, loadingMsg]);

    const timers: number[] = [];
    const advanceStep = (step: number) => {
      setMessages(prev => prev.map(m => (m.id === loaderId ? { ...m, currentStep: step } : m)));
    };
    timers.push(window.setTimeout(() => advanceStep(1), 1500));
    timers.push(window.setTimeout(() => advanceStep(2), 3000));
    // Wait for steps to complete (~4.5s) before drawing the route
    await new Promise((res) => setTimeout(res, 4500));

    timers.forEach((t) => clearTimeout(t));
    setMessages(prev => prev.filter(m => m.id !== loaderId));

    try {
      await onRequestPartners();
      const doneMessage: Message = {
        id: (Date.now() + 102).toString(),
        text: 'Ich habe eine Route zu einem Partnerbetrieb auf der Karte angezeigt.',
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, doneMessage]);
      // Enable contextual Danke button under this message
      setThanksMessageId(doneMessage.id);
      setShowThanksOption(true);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 101).toString(),
        text: '❌ Route konnte nicht berechnet werden. Bitte später erneut versuchen.',
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle click on the contextual "Danke" button shown after partner route is displayed
  const handleThanksClick = () => {
    setShowThanksOption(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: 'Danke',
      timestamp: new Date(),
      isUser: true,
    };

    const botFollowUp: Message = {
      id: (Date.now() + 1).toString(),
      text: 'Gern geschehen! Möchten Sie eine kurze Simulation spielen, um Maßnahmen gegen zukünftige Schäden kennenzulernen?',
      timestamp: new Date(),
      isUser: false,
    };

    setMessages(prev => [...prev, userMessage, botFollowUp]);
    setLastBotMessageId(botFollowUp.id);
    setShowSimulationOptions(true);
  };

  const handleSimulationOption = (choice: 'yes' | 'no') => {
    setShowSimulationOptions(false);

    const userSelection: Message = {
      id: Date.now().toString(),
      text: choice === 'yes' ? 'Ja, sehr gerne! 😊' : 'Nee, kein Bock',
      timestamp: new Date(),
      isUser: true,
    };

    if (choice === 'yes') {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Ich kann dir bei der Schadensimulation helfen. Welche Art von Schaden möchtest du simulieren?',
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, userSelection, botMsg]);
      setLastBotMessageId(botMsg.id);
    } else {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Alles klar! Wenn Sie später Lust haben, können wir jederzeit eine Simulation starten.',
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, userSelection, botMsg]);
    }
  };

  // Produce a preliminary insurance estimate and finalize the flow
  const produceEstimateAndFinalize = async () => {
    // Show loader with 3 steps (1.5s each)
    const loaderId = (Date.now() + 1).toString();
    const loadingMsg: Message = {
      id: loaderId,
      text: '',
      timestamp: new Date(),
      isUser: false,
      isLoadingMessage: true,
      loadingSteps: ['Daten analysieren', 'Angaben prüfen', 'Schätzung berechnen'],
      currentStep: 0,
    };
    setMessages(prev => [...prev, loadingMsg]);

    const timers: number[] = [];
    const advanceStep = (step: number) => {
      setMessages(prev => prev.map(m => (m.id === loaderId ? { ...m, currentStep: step } : m)));
    };
    timers.push(window.setTimeout(() => advanceStep(1), 1500));
    timers.push(window.setTimeout(() => advanceStep(2), 3000));
    const start = performance.now();

    // Build context for estimation
    const ctx: {
      location?: string;
      damageType: string;
      description: string;
      dateISO?: string;
      imagesCount?: number;
    } = {
      location: selectedLocation || undefined,
      damageType: selectedDamageType || 'Unbekannt',
      description: damageDescription || 'Keine Beschreibung',
      dateISO: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
      imagesCount: uploadedImages.length,
    };

    // Helper to format CHF amounts
    const fmtCHF = (n: number) => `CHF ${n.toLocaleString('de-CH')}`;

    // Local heuristic fallback
    const localHeuristic = () => {
      let baseMin = 800, baseMax = 5000;
      const t = (selectedDamageType || '').toLowerCase();
      if (t.includes('wasserschaden')) { baseMin = 1500; baseMax = 12000; }
      else if (t.includes('sturm')) { baseMin = 1000; baseMax = 10000; }
      else { baseMin = 500; baseMax = 6000; }

      const desc = (damageDescription || '').toLowerCase();
      const boosts: Array<[RegExp, number]> = [
        [/dach|ziegel|unterdach|trapez/i, 0.4],
        [/fenster|glas|scheibe/i, 0.3],
        [/fassade|putz/i, 0.25],
        [/wasser|nässe|keller|leitung/i, 0.5],
        [/solaranlage|pv|photovoltaik/i, 0.35],
      ];
      let factor = 1;
      for (const [re, inc] of boosts) {
        if (re.test(desc)) factor += inc;
      }
      if (uploadedImages.length >= 4) factor += 0.2; else if (uploadedImages.length >= 1) factor += 0.1;
      const min = Math.round(baseMin * factor);
      const max = Math.round(baseMax * factor);
      const assumedDeductible = 500;
      const coveredMin = Math.max(0, min - assumedDeductible);
      const coveredMax = Math.max(0, max - assumedDeductible);
      return {
        min, max, coveredMin, coveredMax, assumedDeductible
      };
    };

    let estimateText: string | null = null;
    try {
      if (apiKey && estimateCoverage) {
        estimateText = await estimateCoverage(ctx);
      }
    } catch {
      estimateText = null;
    }

    if (!estimateText) {
      const est = localHeuristic();
      estimateText = [
        `Vorläufige Schätzung der Reparaturkosten: ${fmtCHF(est.min)} – ${fmtCHF(est.max)}.`,
        `Voraussichtlich durch die GVB gedeckt (vereinfachte Annahme: Selbstbehalt ${fmtCHF(est.assumedDeductible)}): ${fmtCHF(est.coveredMin)} – ${fmtCHF(est.coveredMax)}.`,
        `Hinweis: Diese Schätzung ist unverbindlich und vorläufig. Die tatsächliche Leistung hängt von Ihrer Police (Deckung/Selbstbehalt), Zustand der Bauteile und der Schadenprüfung vor Ort ab.`,
      ].join(' ');
    }

    // Ensure the loader completes its 3 steps (4.5s total)
    const elapsed = performance.now() - start;
    const remaining = Math.max(0, 4500 - Math.round(elapsed));
    if (remaining > 0) {
      await new Promise((res) => setTimeout(res, remaining));
    }

    // Cleanup loader
    timers.forEach((t) => clearTimeout(t));
    setMessages(prev => prev.filter(m => m.id !== loaderId));

    // Insert a separate bot message that will render the DamageSummary card
    const summaryMessage: Message = {
      id: (Date.now() + 2).toString(),
      text: '__SUMMARY__',
      timestamp: new Date(),
      isUser: false,
      isEstimate: false,
    };

    const estimateMessage: Message = {
      id: (Date.now() + 3).toString(),
      text: estimateText,
      timestamp: new Date(),
      isUser: false,
      isEstimate: true,
    };

    const repairAskMessage: Message = {
      id: (Date.now() + 4).toString(),
      text: 'Benötigen Sie Unterstützung bei der Reparatur?',
      timestamp: new Date(),
      isUser: false,
    };

    setMessages(prev => [...prev, summaryMessage, estimateMessage, repairAskMessage]);
    setLastBotMessageId(repairAskMessage.id);
    setShowRepairOptions(true);
    setConversationState('initial');
  };


  const handleQuickOption = (optionText: string) => {
    setShowQuickOptions(false);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: optionText,
      timestamp: new Date(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);

    // Handle specific responses for quick options
    let botResponse = '';
    if (optionText === 'Schaden melden') {
      botResponse = 'Wo wohnst du?';
    } else if (optionText === 'Schadensimulation') {
      botResponse = 'Ich kann dir bei der Schadensimulation helfen. Welche Art von Schaden möchtest du simulieren?';
    }

    // Add bot response
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botResponse,
      timestamp: new Date(),
      isUser: false,
    };

    setMessages(prev => [...prev, botMessage]);
    setLastBotMessageId(botMessage.id);
  };

  const handleDamageOption = async (damageType: string) => {
    setShowDamageOptions(false);
    setSelectedDamageType(damageType);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: damageType,
      timestamp: new Date(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);

    // Activate rain effect for Wasserschaden oder Sturmwind
    if ((damageType === 'Wasserschaden' || damageType === 'Sturmwind') && onRainToggle) {
      try {
        await onRainToggle(true);
      } catch (error) {
        console.error('Failed to activate rain effect:', error);
      }
    }

    // Add bot response
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: `Vielen Dank! Ich habe "${damageType}" als Schadensursache notiert. Können Sie den Schaden genauer beschreiben?`,
      timestamp: new Date(),
      isUser: false,
    };

    setMessages(prev => [...prev, botMessage]);
    setConversationState('damage_selected');
  };

  const handleRepairSupportOption = async (answer: 'Ja' | 'Nein', displayText?: string) => {
    setShowRepairOptions(false);

    // Add user selection message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: displayText || answer,
      timestamp: new Date(),
      isUser: true,
    };

    if (answer === 'Ja') {
      // show small loader while fetching AI recommendations
      const loaderId = (Date.now() + 2).toString();
      const loader: Message = { id: loaderId, text: '', timestamp: new Date(), isUser: false, isLoadingMessage: true, loadingSteps: ['Empfehlungen zusammenstellen'], currentStep: 0 };
      setMessages(prev => [...prev, userMessage, loader]);

      try {
        let aiItems: { title: string; detail: string; tags?: string[] }[] = [];
        if (apiKey && generateRecommendations) {
          aiItems = await generateRecommendations({
            location: selectedLocation || undefined,
            damageType: selectedDamageType || undefined,
            description: damageDescription || undefined,
            dateISO: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
            imagesCount: uploadedImages.length,
          });
        }

        // remove loader
        setMessages(prev => prev.filter(m => m.id !== loaderId));

        const recMarker: Message = {
          id: (Date.now() + 3).toString(),
          text: '__RECOMMENDATIONS__',
          timestamp: new Date(),
          isUser: false,
        };

        // attach AI items in a closure by temporarily placing on window to pass to child via state variable
        // Simpler: store in a ref-like state at component level
        setAIRecItems(aiItems);

        setMessages(prev => [...prev, recMarker]);
        setLastBotMessageId(recMarker.id);
      } catch (e) {
        setMessages(prev => prev.map(m => (m.id === loaderId ? { ...m, text: 'Empfehlungen konnten nicht geladen werden.' } : m)));
      }
    } else {
      const botReply: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Alles klar. Wenn Sie später Unterstützung benötigen, sagen Sie einfach Bescheid.',
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, userMessage, botReply]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent | null, messageText?: string) => {
    if (e) e.preventDefault();

    const actualMessageText = messageText || inputMessage.trim();
    if (!actualMessageText || isLoading) return;

    setShowQuickOptions(false);
    setShowDamageOptions(false);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: actualMessageText,
      timestamp: new Date(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Check if this is a description response after damage selection
    if (conversationState === 'damage_selected') {
      // Save user's free-text damage description
      setDamageDescription(actualMessageText);
      const dateMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Wann ist der Schaden aufgetreten? Bitte wählen Sie das Datum aus:',
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, dateMessage]);
      setConversationState('date_needed');
      setShowDatePicker(true);
      setLastBotMessageId(dateMessage.id);
      return;
    }

    if (!apiKey) {
      const infoMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Um KI-Antworten zu aktivieren, bitte setze deinen OpenAI API-Schlüssel in der Karte oben.",
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, infoMessage]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendWithFunctions(actualMessageText);

      if (result.type === 'function_call' && result.name === 'zoom_to_location') {
        const address = result.args.address;
        if (onLocationRequest) {
          try {
            const loc = await onLocationRequest(address);
            const locationMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: loc.success
                ? `📍 "${loc.location}" gefunden und zur Position auf der Karte gezoomt! Was hat den Schaden verursacht?`
                : `❌ ${loc.error || 'Konnte diesen Ort nicht finden. Bitte versuche eine spezifischere Adresse.'}`,
              timestamp: new Date(),
              isUser: false,
            };
            setMessages(prev => [...prev, locationMessage]);
            if (loc.success) {
              setSelectedLocation(loc.location || address);
              setShowDamageOptions(true);
              setLastBotMessageId(locationMessage.id);
            }
          } catch (error) {
            const errorMessage: Message = {
              id: (Date.now() + 2).toString(),
              text: "❌ Entschuldigung, ich hatte Probleme dabei, diesen Ort zu finden. Bitte versuche es noch einmal.",
              timestamp: new Date(),
              isUser: false,
            };
            setMessages(prev => [...prev, errorMessage]);
          }
        } else {
          const fallbackMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Ich bin mir nicht sicher, wie ich darauf antworten soll.",
            timestamp: new Date(),
            isUser: false,
          };
          setMessages(prev => [...prev, fallbackMessage]);
        }
      } else if (result.type === 'function_call' && result.name === 'toggle_rain_effect') {
        const enabled = result.args.enabled;
        if (onRainToggle) {
          try {
            const rainResult = await onRainToggle(enabled);
            const rainMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: rainResult.success
                ? `🌧️ Regen-Effekt ${enabled ? 'aktiviert' : 'deaktiviert'} auf der Karte!`
                : `❌ ${rainResult.error || 'Konnte den Regen-Effekt nicht umschalten.'}`,
              timestamp: new Date(),
              isUser: false,
            };
            setMessages(prev => [...prev, rainMessage]);
          } catch (error) {
            const errorMessage: Message = {
              id: (Date.now() + 2).toString(),
              text: "❌ Entschuldigung, ich hatte Probleme dabei, den Regen-Effekt umzuschalten. Bitte versuche es noch einmal.",
              timestamp: new Date(),
              isUser: false,
            };
            setMessages(prev => [...prev, errorMessage]);
          }
        } else {
          const fallbackMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Ich bin mir nicht sicher, wie ich darauf antworten soll.",
            timestamp: new Date(),
            isUser: false,
          };
          setMessages(prev => [...prev, fallbackMessage]);
        }
      } else if (result.type === 'text') {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: result.content,
          timestamp: new Date(),
          isUser: false,
        };
        setMessages(prev => [...prev, aiResponse]);
      }

    } catch (err: unknown) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: `❌ OpenAI Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="h-full flex flex-col bg-chat-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <h2 className="text-lg font-semibold text-foreground">Chat</h2>
        <p className="text-sm text-muted-foreground">
          Stell deine Fragen rund um Schaden, Deckung und Meldung
        </p>
      </div>

      {/* API Key Setup Card - Only shown when no key is set */}
      {!apiKey && (
        <ApiKeySetupCard
          value={apiKeyInput}
          onValueChange={setApiKeyInput}
          onSave={saveApiKey}
        />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              <div
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-start gap-2 max-w-[80%]">
                  {!message.isUser && (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1 shrink-0">
                      <MapPin className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg ${message.text === '__RECOMMENDATIONS__' ? 'p-0' : 'p-3'} ${message.isUser
                      ? 'bg-primary text-primary-foreground ml-8'
                      : message.text === '__RECOMMENDATIONS__'
                        ? 'bg-transparent text-foreground'
                        : 'bg-message-bubble text-message-text'
                      }`}
                  >
                    {message.isLoadingMessage ? (
                      <LoadingMessage steps={message.loadingSteps || []} currentStep={message.currentStep} />
                    ) : message.isEstimate ? (
                      <EstimateResult text={message.text} />
                    ) : message.text === '__SUMMARY__' ? (
                      <DamageSummary
                        location={selectedLocation || undefined}
                        damageType={selectedDamageType || undefined}
                        description={damageDescription || undefined}
                        dateISO={selectedDate ? selectedDate.toISOString().split('T')[0] : undefined}
                        imagesCount={uploadedImages.length}
                      />
                    ) : message.text === '__RECOMMENDATIONS__' ? (
                      <RepairRecommendations
                        damageType={selectedDamageType || undefined}
                        description={damageDescription || undefined}
                        location={selectedLocation || undefined}
                        aiItems={aiRecItems}
                        onRequestPartners={handleRequestPartnersClick}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    )}
                    <div className="mt-1 flex items-center justify-between">
                      <span className={`text-xs ${message.isUser
                        ? 'text-primary-foreground/70'
                        : 'text-message-text/70'
                        }`}>
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Quick options after first bot message */}
              {!message.isUser && message.id === '1' && showQuickOptions && (
                <div className="mt-3 ml-8 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickOption('Schaden melden')}
                    className="text-left justify-start text-sm w-fit"
                  >
                    Schaden melden
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickOption('Schadensimulation')}
                    className="text-left justify-start text-sm w-fit"
                  >
                    Schadensimulation
                  </Button>
                </div>
              )}

              {/* Danke button after partner route confirmation */}
              {!message.isUser && message.id === thanksMessageId && showThanksOption && (
                <div className="mt-3 ml-8 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleThanksClick}
                    className="text-left justify-start text-sm w-fit"
                  >
                    Danke
                  </Button>
                </div>
              )}

              {/* Simulation options after follow-up */}
              {!message.isUser && message.id === lastBotMessageId && showSimulationOptions && (
                <div className="mt-3 ml-8 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSimulationOption('yes')}
                    className="text-left justify-start text-sm w-fit"
                  >
                    Ja, sehr gerne! 😊
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSimulationOption('no')}
                    className="text-left justify-start text-sm w-fit"
                  >
                    Nee, kein Bock
                  </Button>
                </div>
              )}

              {/* Damage cause options */}
              {!message.isUser && message.id === lastBotMessageId && showDamageOptions && (
                <div className="mt-3 ml-8 grid grid-cols-3 gap-3 max-w-md">
                  <button
                    onClick={() => handleDamageOption('Wasserschaden')}
                    className="p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors text-center group"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <div className="text-primary text-xl">🌨️</div>
                      </div>
                      <span className="text-sm font-medium text-foreground">Wasserschaden</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDamageOption('Sturmwind')}
                    className="p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors text-center group"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <div className="text-primary text-xl">💨</div>
                      </div>
                      <span className="text-sm font-medium text-foreground">Sturmwind</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDamageOption('Andere')}
                    className="p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors text-center group"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <div className="text-primary text-xl">⚡</div>
                      </div>
                      <span className="text-sm font-medium text-foreground">Andere</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Repair support options (after estimate) */}
              {!message.isUser && message.id === lastBotMessageId && showRepairOptions && (
                <div className="mt-3 ml-8 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRepairSupportOption('Ja', 'Ja, bitte Unterstützung bei der Reparatur 🔧')}
                    className="text-left justify-start text-sm w-fit"
                  >
                    Ja, bitte Unterstützung bei der Reparatur 🔧
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRepairSupportOption('Nein', 'Nein, ich brauche keine Hilfe 🙌')}
                    className="text-left justify-start text-sm w-fit"
                  >
                    Nein, ich brauche keine Hilfe 🙌
                  </Button>
                </div>
              )}

              {/* Date picker */}
              {!message.isUser && message.id === lastBotMessageId && showDatePicker && (
                <div className="mt-3 ml-8">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Datum auswählen</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                            setShowDatePicker(false);

                            // Add user message with selected date
                            const userDateMessage: Message = {
                              id: Date.now().toString(),
                              text: `Schaden aufgetreten am: ${format(date, "dd.MM.yyyy")}`,
                              timestamp: new Date(),
                              isUser: true,
                            };

                            // Add bot asking for images
                            const botImageMessage: Message = {
                              id: (Date.now() + 1).toString(),
                              text: `Können Sie Bilder vom Schaden hochladen? Das würde bei der Bewertung helfen.`,
                              timestamp: new Date(),
                              isUser: false,
                            };

                            setMessages(prev => [...prev, userDateMessage, botImageMessage]);
                            setConversationState('date_selected');
                            setLastBotMessageId(botImageMessage.id);
                            setShowImageUpload(true);
                          }
                        }}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Image Upload */}
              {!message.isUser && message.id === lastBotMessageId && showImageUpload && (
                <ImageUpload
                  images={uploadedImages}
                  onAdd={(files) => setUploadedImages((prev) => [...prev, ...files])}
                  onRemove={(index) => setUploadedImages((prev) => prev.filter((_, i) => i !== index))}
                  onDone={async () => {
                    setShowImageUpload(false);
                    const confirmMessage: Message = {
                      id: Date.now().toString(),
                      text: `${uploadedImages.length} Bild(er) hochgeladen`,
                      timestamp: new Date(),
                      isUser: true,
                    };
                    setMessages((prev) => [...prev, confirmMessage]);
                    await produceEstimateAndFinalize();
                  }}
                  onSkip={async () => {
                    setShowImageUpload(false);
                    const skipMessage: Message = {
                      id: Date.now().toString(),
                      text: 'Keine Bilder hochgeladen',
                      timestamp: new Date(),
                      isUser: true,
                    };
                    setMessages((prev) => [...prev, skipMessage]);
                    await produceEstimateAndFinalize();
                  }}
                />
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Gib gerne deine Anliegen ein..."
            className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
            disabled={!inputMessage.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;