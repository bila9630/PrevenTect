import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MapPin, KeyRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useOpenAI } from '@/hooks/useOpenAI';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
}

interface ChatInterfaceProps {
  onLocationRequest?: (address: string) => Promise<{ success: boolean; location?: string; coordinates?: number[]; error?: string }>;
  onRainToggle?: (enabled: boolean) => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
}

const ChatInterface = ({ onLocationRequest, onRainToggle }: ChatInterfaceProps) => {
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
  const { toast } = useToast();
  const { sendWithFunctions } = useOpenAI(apiKey);

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

  const clearApiKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    toast({ description: 'OpenAI API-Schlüssel gelöscht.' });
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
  };

  const handleSendMessage = async (e: React.FormEvent | null, messageText?: string) => {
    if (e) e.preventDefault();

    const actualMessageText = messageText || inputMessage.trim();
    if (!actualMessageText || isLoading) return;

    setShowQuickOptions(false);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: actualMessageText,
      timestamp: new Date(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

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
                ? `📍 "${loc.location}" gefunden und zur Position auf der Karte gezoomt!`
                : `❌ ${loc.error || 'Konnte diesen Ort nicht finden. Bitte versuche eine spezifischere Adresse.'}`,
              timestamp: new Date(),
              isUser: false,
            };
            setMessages(prev => [...prev, locationMessage]);
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

    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: `❌ OpenAI Fehler: ${err?.message || 'Unbekannter Fehler'}`,
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
          Stelle Fragen zu den Kartendaten
        </p>
      </div>

      {/* API Key Setup Card - Only shown when no key is set */}
      {!apiKey && (
        <div className="m-4 p-4 bg-muted/50 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">OpenAI API-Schlüssel erforderlich</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Gib deinen OpenAI API-Schlüssel ein, um KI-Antworten zu aktivieren
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="bg-background border-border text-sm"
            />
            <Button size="sm" onClick={saveApiKey}>Speichern</Button>
          </div>
        </div>
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
                    className={`rounded-lg p-3 ${message.isUser
                      ? 'bg-primary text-primary-foreground ml-8'
                      : 'bg-message-bubble text-message-text'
                      }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
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