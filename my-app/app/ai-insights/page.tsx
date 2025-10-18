'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import OllamaStatusBadge from '@/components/OllamaStatusBadge';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function AIInsightsPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your AI assistant for NFL statistics analysis. I can help you explore player performance, team matchups, and fantasy insights using your database. What would you like to know?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<Array<{id:string,name:string}>>([]);
  const [showCandidatesFor, setShowCandidatesFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // TODO: Implement Ollama API call
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: inputMessage }] }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      // If the tool/orchestrator returned candidates, surface them in the UI
      if (data?.candidates && Array.isArray(data.candidates)) {
        setCandidates(data.candidates.slice(0, 10).map((c: any) => ({ id: String(c.id), name: c.name })));
        setShowCandidatesFor(userMessage.content);
        setIsLoading(false);
        return;
      }

      // Support multiple response shapes from the server for backward compatibility
      const aiContent = data?.message?.content ?? data?.response ?? data?.responseText ?? "I'm still learning! The AI service will be connected soon.";

      // Dev: log debug info when available
      if (data?.debug) console.debug('AI debug:', data.debug);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiContent,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting right now. The AI service will be available soon!",
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickCandidate = async (id: string, name: string) => {
    // Clear candidates UI and call get-player-stats directly for quick results
    setCandidates([]);
    setShowCandidatesFor(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/tools/get-player-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: id, playerName: name }),
      });
      const json = await res.json();
      const content = json?.rows ? `Returned ${json.rows.length} rows for ${name}` : json?.error ?? 'No data';
      const msg: Message = { id: Date.now().toString(), content, sender: 'ai', timestamp: new Date() };
      setMessages(prev => [...prev, msg]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), content: 'Failed to fetch player rows', sender: 'ai', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-400 mb-2 flex items-center">
              <Bot className="w-10 h-10 mr-3" />
              AI Insights
            </h1>
            <p className="text-gray-400 text-lg">
              Chat with our AI assistant to get intelligent insights about NFL statistics
            </p>
          </div>
          <div>
            <OllamaStatusBadge />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Chat Interface - Main Section */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-800 border-blue-400 h-[700px] flex flex-col">
              <CardHeader className="border-b border-gray-700">
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <Bot className="w-6 h-6" />
                  AI Chat Assistant
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex items-start gap-2 max-w-[80%] ${
                          message.sender === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                            message.sender === 'user' ? 'bg-blue-600' : 'bg-green-600'
                          }`}
                        >
                          {message.sender === 'user' ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>
                        <div
                          className={`rounded-lg p-3 ${
                            message.sender === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-200'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-200">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Section */}
                <div className="border-t border-gray-700 p-4">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me about NFL stats, player performance, or fantasy insights..."
                      className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar with Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gray-800 border-blue-400">
              <CardHeader>
                <CardTitle className="text-blue-400 text-sm">Quick Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  "Which RBs have the best matchups?",
                  "Show me trending WRs",
                  "What are the defensive rankings?",
                  "Give me fantasy sleepers"
                ].map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 text-xs p-2"
                    onClick={() => setInputMessage(question)}
                  >
                    {question}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-blue-400">
              <CardHeader>
                <CardTitle className="text-blue-400 text-sm">AI Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Player performance analysis</li>
                  <li>• Fantasy football advice</li>
                  <li>• Trending player insights</li>
                  <li>• Statistical comparisons</li>
                  <li>• Week-by-week analysis</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-blue-400">
              <CardHeader>
                <CardTitle className="text-blue-400 text-sm">Data Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  Our AI analyzes statistic such as:
                </p>
                <ul className="text-xs text-gray-400 mt-2 space-y-1">
                  <li>• Player stats & averages</li>
                  <li>• Team defensive rankings</li>
                  <li>• Matchup data</li>
                  <li>• Performance trends</li>
                  <li>• Fantasy projections</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}