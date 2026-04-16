import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Loader2 } from 'lucide-react';

export default function AIChat() {
  const { apiCall } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadHistory = async () => {
    try {
      const data = await apiCall('get', '/chat/history');
      const formatted = data.flatMap(m => [
        { role: 'user', content: m.user_message, timestamp: m.timestamp },
        { role: 'ai', content: m.ai_response, timestamp: m.timestamp },
      ]);
      setMessages(formatted.slice(-20));
    } catch {}
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const data = await apiCall('post', '/chat', { message: userMsg });
      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Failed to get response. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">Ask me about carbon credits, trading strategies, or compliance rules.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-500/20'
                : 'bg-white/5 text-slate-300 border border-white/5'
            }`}>
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <input
            data-testid="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about markets, compliance..."
            className="flex-1 px-3 py-2 rounded-xl text-sm glass-input bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            data-testid="chat-send-btn"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2 rounded-xl transition-all disabled:opacity-30 hover:bg-emerald-500/10"
            style={{ color: '#00F298' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
