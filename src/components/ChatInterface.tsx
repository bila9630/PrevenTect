import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MapPin, KeyRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import OpenAI from 'openai';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
}

interface ChatInterfaceProps {
  onLocationRequest?: (address: string) => Promise<{ success: boolean; location?: string; coordinates?: number[]; error?: string }>;
}

const ChatInterface = ({ onLocationRequest }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Welcome to MapAnalytics! Try typing an address or location to automatically zoom to it on the map.',
      timestamp: new Date(),
      isUser: false,
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

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
      toast({ description: 'Please enter an API key.' });
      return;
    }
    localStorage.setItem('openai_api_key', apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setApiKeyInput('');
    setShowKeyInput(false);
    toast({ description: 'OpenAI API key saved locally.' });
  };

  const clearApiKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    toast({ description: 'OpenAI API key cleared.' });
  };

  // Function definition for OpenAI to call when user wants to zoom to a location
  const zoomToLocationFunction = {
    name: "zoom_to_location",
    description: "Zoom the map to a specific location or address",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "The address or location to zoom to (e.g., 'Paris, France', '123 Main St, New York')"
        }
      },
      required: ["address"]
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const messageText = inputMessage.trim();

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      timestamp: new Date(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    if (!apiKey) {
      const infoMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "To enable AI replies, set your OpenAI API key via the 'API key' button above.",
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, infoMessage]);
      return;
    }

    setIsLoading(true);
    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { 
            role: 'system', 
            content: 'You are Mapalytics, a helpful map and geospatial assistant. Be precise and concise. When users mention locations, addresses, or want to see places on a map, use the zoom_to_location function.' 
          },
          { role: 'user', content: messageText }
        ],
        functions: [zoomToLocationFunction],
        function_call: "auto",
        temperature: 0.3
      });

      const message = response.choices[0].message;

      // Check if OpenAI wants to call the zoom function
      if (message.function_call && message.function_call.name === "zoom_to_location" && onLocationRequest) {
        const args = JSON.parse(message.function_call.arguments);
        const address = args.address;

        try {
          const result = await onLocationRequest(address);
          
          const locationMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: result.success 
              ? `📍 Found "${result.location}" and zoomed to the location on the map!`
              : `❌ ${result.error || 'Could not find that location. Please try a more specific address.'}`,
            timestamp: new Date(),
            isUser: false,
          };
          
          setMessages(prev => [...prev, locationMessage]);
        } catch (error) {
          const errorMessage: Message = {
            id: (Date.now() + 2).toString(),
            text: "❌ Sorry, I had trouble finding that location. Please try again.",
            timestamp: new Date(),
            isUser: false,
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // Regular AI response
        const content: string = message.content?.trim() || "I'm not sure how to answer that.";
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: content,
          timestamp: new Date(),
          isUser: false,
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: `❌ OpenAI error: ${err?.message || 'Unknown error'}`,
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Chat</h2>
            <p className="text-sm text-muted-foreground">
              Ask questions about the map data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowKeyInput((v) => !v)}>
              <KeyRound className="h-4 w-4 mr-2" />
              API key
            </Button>
            <div className={`text-xs ${apiKey ? 'text-primary' : 'text-muted-foreground'}`}>
              {apiKey ? 'Ready' : 'Not set'}
            </div>
          </div>
        </div>
        {showKeyInput && (
          <div className="mt-3 flex items-center gap-2">
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="bg-input border-border"
            />
            <Button size="sm" onClick={saveApiKey}>Save</Button>
            {apiKey && (
              <Button size="sm" variant="secondary" onClick={clearApiKey}>Clear</Button>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-start gap-2 max-w-[80%]">
                {!message.isUser && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1 shrink-0">
                    <MapPin className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                className={`rounded-lg p-3 ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground ml-8'
                    : 'bg-message-bubble text-message-text'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className={`text-xs ${
                    message.isUser 
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
            placeholder="Try typing an address like '123 Main St, New York'..."
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