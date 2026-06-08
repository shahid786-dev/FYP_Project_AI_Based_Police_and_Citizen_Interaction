import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Mic, ChevronDown } from 'lucide-react';
import { Shield } from 'lucide-react';

const FAQ = [
  { q: "How to apply for character certificate?", a: "Login to your Citizen Portal, click 'New Request', select 'Character Certificate', upload your CNIC and photo, then submit. Processing takes 3-7 working days." },
  { q: "What documents are required?", a: "You need: (1) Original CNIC, (2) Recent passport-size photo, (3) Proof of address (utility bill), and (4) Any relevant supporting documents." },
  { q: "How long does verification take?", a: "Standard verification takes 3-5 working days. Urgent requests are processed within 24-48 hours with an additional fee." },
  { q: "How can I track my application?", a: "Go to 'Track Application' on the home page, enter your Tracking ID (received via SMS/Email after submission) to see real-time status." },
  { q: "What are the payment methods?", a: "We accept JazzCash, EasyPaisa, Credit/Debit Cards, and Bank Transfer. Payments are 100% secure and encrypted." },
  { q: "Is my data secure?", a: "Yes! All data is encrypted with AES-256. We comply with Pakistan's data protection laws and use multi-factor authentication." },
];

const initialMessages = [
  { from: 'ai', text: 'السلام علیکم! 👋 I am your AI Assistant for PakVerify. How can I help you today?' },
  { from: 'ai', text: 'You can ask me about applications, documents, payments, or tracking your request. Select a quick question below or type your own!' },
];

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [pulse, setPulse] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 6000);
    return () => clearTimeout(t);
  }, []);

  const sendMessage = (text) => {
    const q = text || input.trim();
    if (!q) return;
    setMessages(prev => [...prev, { from: 'user', text: q }]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const match = FAQ.find(f => f.q.toLowerCase().includes(q.toLowerCase().split(' ')[0]) || q.toLowerCase().includes(f.q.toLowerCase().split(' ')[1]));
      const reply = match
        ? match.a
        : "I understand your query. For detailed assistance, please visit our Help Center or call our helpline at 0800-12345. Our agents are available 24/7.";
      setTyping(false);
      setMessages(prev => [...prev, { from: 'ai', text: reply }]);
    }, 1500);
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {pulse && !open && (
          <div className="glass-card px-4 py-2 text-sm text-white/80 animate-bounce shadow-glow-cyan">
            💬 Need help? Ask AI!
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-glow-cyan transition-all duration-300 hover:scale-110 animate-glow relative"
          aria-label="Open AI Chatbot"
        >
          {open ? <X size={24} className="text-white" /> : <MessageCircle size={24} className="text-white" />}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-navy-950 animate-pulse" />
        </button>
      </div>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col glass-card border border-cyan-400/20 shadow-glow-cyan overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-600/30 to-blue-700/30 border-b border-white/10">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">PakVerify AI Assistant</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs">Online • English / اردو</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ maxHeight: '340px' }}>
            {messages.map((m, i) => (
              <div key={i} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={m.from === 'user' ? 'chatbot-bubble-user' : 'chatbot-bubble-ai'}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="chatbot-bubble-ai flex items-center gap-1 py-3">
                  <span className="typing-dot w-2 h-2 bg-cyan-400 rounded-full" />
                  <span className="typing-dot w-2 h-2 bg-cyan-400 rounded-full" />
                  <span className="typing-dot w-2 h-2 bg-cyan-400 rounded-full" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Replies */}
          <div className="px-4 pb-2 flex flex-col gap-1.5">
            <p className="text-white/30 text-xs font-medium">Quick Questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {FAQ.slice(0, 3).map((f, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(f.q)}
                  className="text-xs px-2.5 py-1 rounded-full border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition"
                >
                  {f.q.split(' ').slice(0, 4).join(' ')}...
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type your question..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/50"
            />
            <button
              onClick={() => sendMessage()}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center hover:shadow-glow-cyan transition"
            >
              <Send size={16} className="text-white" />
            </button>
            <button className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition">
              <Mic size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
