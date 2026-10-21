import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react';
import { Shield } from 'lucide-react';
import { useSelector } from 'react-redux';
import { chatbotAPI } from '../api/apiClient';

const ROLE_DETAILS = {
  CITIZEN: {
    welcome: 'السلام علیکم! I can explain application steps, document uploads, payment information, and certificate verification. Sign in to retrieve your own application or certificate.',
    quick: ['How do I apply?', 'What documents can I upload?', 'How can I track my application?'],
  },
  POLICE_STAFF: {
    welcome: 'Welcome. I can help explain application workflows, retrieve permitted application and certificate details, and search the local criminal-record dataset.',
    quick: ['How can I review an application?', 'How do criminal-record lookups work?', 'How do I verify a certificate?'],
  },
  POLICE_AUTHORITY: {
    welcome: 'Welcome. I can help explain permitted application and certificate workflows and search the local criminal-record dataset.',
    quick: ['How can I review an application?', 'How do criminal-record lookups work?', 'How do I verify a certificate?'],
  },
  SUPER_ADMIN: {
    welcome: 'Welcome. I can help explain available workflows and retrieve application, certificate, or local criminal-record information within your authorized access.',
    quick: ['How can I review an application?', 'How do criminal-record lookups work?', 'How do I verify a certificate?'],
  },
};
const PUBLIC_DETAILS = {
  welcome: 'السلام علیکم! I can explain application steps, document uploads, payment information, and certificate verification. Sign in to retrieve private records.',
  quick: ['How do I apply?', 'What documents can I upload?', 'How can I track my application?'],
};

export default function AIChatbot() {
  const { user, role, token, isAuthenticated } = useSelector((state) => state.auth);
  const identity = isAuthenticated
    ? `${role}:${user?.id || user?.cnic || user?.email || ''}:${token || ''}`
    : 'anonymous';
  const roleDetails = isAuthenticated ? ROLE_DETAILS[role] || PUBLIC_DETAILS : PUBLIC_DETAILS;
  return <ChatbotPanel key={identity} roleDetails={roleDetails} />;
}

function ChatbotPanel({ roleDetails }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([{ from: 'ai', text: roleDetails.welcome }]);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const [pulse, setPulse]       = useState(true);
  const bottomRef               = useRef(null);
  const requestSequence         = useRef(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => { const t = setTimeout(() => setPulse(false), 6000); return () => clearTimeout(t); }, []);

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q || typing) return;
    const sequence = ++requestSequence.current;
    setMessages(prev => [...prev, { from: 'user', text: q }]);
    setInput('');
    setTyping(true);
    try {
      const res = await chatbotAPI.chat(q);
      if (requestSequence.current === sequence) {
        setMessages(prev => [...prev, { from: 'ai', text: res.data.reply }]);
      }
    } catch (error) {
      if (requestSequence.current === sequence) {
        const reply = error.response?.data?.error || 'The assistant could not retrieve that information. Please try again.';
        setMessages(prev => [...prev, { from: 'ai', text: reply }]);
      }
    } finally {
      if (requestSequence.current === sequence) setTyping(false);
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
              {roleDetails.quick.map((q) => (
                <button key={q} onClick={() => sendMessage(q)}
                  disabled={typing}
                  className="text-xs px-2.5 py-1 rounded-full border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition">
                  {q}
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
