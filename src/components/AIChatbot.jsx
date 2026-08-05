import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react';
import { Shield } from 'lucide-react';
import { chatbotAPI } from '../api/apiClient';

const initialMessages = [
  { from: 'ai', text: 'السلام علیکم! 👋 I am your AI Assistant for PakVerify. How can I help you today?' },
  { from: 'ai', text: 'Ask me about applications, documents, payments, or tracking your request!' },
];

const QUICK = [
  'How to apply for character certificate?',
  'What documents are required?',
  'How can I track my application?',
];

export default function AIChatbot() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const [pulse, setPulse]       = useState(true);
  const bottomRef               = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => { const t = setTimeout(() => setPulse(false), 6000); return () => clearTimeout(t); }, []);

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q) return;
    setMessages(prev => [...prev, { from: 'user', text: q }]);
    setInput('');
    setTyping(true);
    try {
      const res = await chatbotAPI.chat(q);
      setMessages(prev => [...prev, { from: 'ai', text: res.data.reply }]);
    } catch {
      // Local FAQ fallback
      const FAQ = [
        { q: 'apply',    a: 'Login → New Request → choose certificate type → upload CNIC + photo → submit. Processing: 3-7 days.' },
        { q: 'document', a: 'You need: CNIC Front & Back, Passport photo, Proof of address (utility bill).' },
        { q: 'track',    a: 'Go to Track Application and enter your Tracking ID received via SMS/Email.' },
        { q: 'payment',  a: 'We accept JazzCash, EasyPaisa, Credit/Debit Cards and Bank Transfer. Total: PKR 650.' },
        { q: 'fee',      a: 'Total fee: PKR 650 (Application PKR 500 + AI Verification PKR 100 + Processing PKR 50).' },
        { q: 'otp',      a: 'OTP is a 6-digit code sent to your mobile. Valid for 10 minutes. Use 123456 in demo mode.' },
      ];
      const lower = q.toLowerCase();
      const match = FAQ.find(f => lower.includes(f.q));
      const reply = match?.a || 'For assistance, call our helpline: 0800-12345 or email support@pakverify.gov.pk';
      setMessages(prev => [...prev, { from: 'ai', text: reply }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {pulse && !open && (
          <div className="glass-card px-4 py-2 text-sm text-white/80 animate-bounce shadow-glow-cyan">
            💬 Need help? Ask AI!
          </div>
        )}
        <button onClick={() => setOpen(!open)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-glow-cyan transition-all duration-300 hover:scale-110 animate-glow relative"
          aria-label="Open AI Chatbot">
          {open ? <X size={24} className="text-white" /> : <MessageCircle size={24} className="text-white" />}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-navy-950 animate-pulse" />
        </button>
      </div>

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
                <span className="text-green-400 text-xs">Online · English / اردو</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><ChevronDown size={20} /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ maxHeight: '340px' }}>
            {messages.map((m, i) => (
              <div key={i} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={m.from === 'user' ? 'chatbot-bubble-user' : 'chatbot-bubble-ai'}>{m.text}</div>
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
              {QUICK.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)}
                  className="text-xs px-2.5 py-1 rounded-full border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition">
                  {q.split(' ').slice(0, 4).join(' ')}…
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type your question..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/50" />
            <button onClick={() => sendMessage()}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center hover:shadow-glow-cyan transition">
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
