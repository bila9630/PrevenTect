import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MapPin } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  isLocationRequest?: boolean;
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to detect if message looks like a location/address
  const detectLocation = (text: string): boolean => {
    const locationKeywords = [
      'street', 'avenue', 'road', 'boulevard', 'drive', 'lane', 'way', 'place', 'court',
      'city', 'town', 'village', 'state', 'country', 'zip', 'postal',
      'address', 'location', 'where is', 'find', 'show me', 'go to', 'navigate to'
    ];
    
    const hasNumbers = /\d/.test(text);
    const hasLocationKeywords = locationKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    // Simple heuristic: if it has numbers and location keywords, or common address patterns
    return hasLocationKeywords || 
           /\d+\s+[A-Za-z\s]+(?:street|avenue|road|blvd|drive|lane|way|st|ave|rd|dr)/i.test(text) ||
           /^[^,]+,\s*[^,]+/.test(text); // Pattern like "City, State" or "Street, City"
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const messageText = inputMessage.trim();
    const isLocationRequest = detectLocation(messageText);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      timestamp: new Date(),
      isUser: true,
      isLocationRequest,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Handle location requests
    if (isLocationRequest && onLocationRequest) {
      try {
        const result = await onLocationRequest(messageText);
        
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: result.success 
            ? `📍 Found "${result.location}" and zoomed to the location on the map!`
            : `❌ ${result.error || 'Could not find that location. Please try a more specific address.'}`,
          timestamp: new Date(),
          isUser: false,
        };
        
        setMessages(prev => [...prev, responseMessage]);
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
      // Simulate regular AI response for non-location messages
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "Thanks for your message! Try typing an address or location (like '123 Main Street, New York' or 'Paris, France') to see it on the map.",
          timestamp: new Date(),
          isUser: false,
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  return (
    <div className="h-full flex flex-col bg-chat-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <h2 className="text-lg font-semibold text-foreground">Chat</h2>
        <p className="text-sm text-muted-foreground">
          Ask questions about the map data
        </p>
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
                  {message.isLocationRequest && (
                    <MapPin className="h-3 w-3 text-primary-foreground/70" />
                  )}
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
            disabled={!inputMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;