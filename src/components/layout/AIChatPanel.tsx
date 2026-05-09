"use client";

import { useState } from "react";
import { MessageSquare, X, Send, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", content: "Hello! I'm your AI Risk Assistant. How can I help you analyze a customer or recovery plan today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      // Mock API call to /api/ai/recommendation-chat
      const response = await fetch("/api/ai/recommendation-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await response.json();
      
      setMessages(prev => [...prev, { role: "ai", content: data.answer || "I couldn't process that request." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I encountered an error communicating with the server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 transition-transform hover:scale-105 z-50 flex items-center justify-center group"
        >
          <Sparkles className="w-6 h-6 text-primary-foreground group-hover:animate-spin" />
        </Button>
      )}

      {/* Chat Panel Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-80 sm:w-96 glass-panel z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 shrink-0 bg-black/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground">AI Risk Assistant</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div 
                className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-br-sm" 
                    : "glass border border-white/5 text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="glass border border-white/5 text-foreground rounded-2xl rounded-bl-sm p-3 text-sm flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-75"></span>
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150"></span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
          <form onSubmit={sendMessage} className="relative flex items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a customer..."
              className="pr-12 bg-black/40 border-white/10 rounded-xl focus-visible:ring-primary/50"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={isLoading || !input.trim()}
              className="absolute right-1 w-8 h-8 rounded-lg bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
