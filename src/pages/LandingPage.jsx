import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Cpu, FileCheck, Search, Users, Lock,
  ChevronRight, Star, CheckCircle, ArrowRight,
  Globe, Zap, Eye, AlertTriangle, Award, Phone
} from 'lucide-react';
import Navbar from '../components/Navbar';

const STATS = [
  { value: '2.4M+', label: 'Applications Processed' },
  { value: '98.7%', label: 'Accuracy Rate' },
  { value: '<24h', label: 'Avg Processing Time' },
  { value: '850+', label: 'Police Stations Connected' },
];

const SERVICES = [
  { icon: FileCheck, title: 'Character Certificate', desc: 'Get your police character certificate issued digitally within 24 hours.', color: 'from-cyan-500 to-blue-600' },
  { icon: Users, title: 'Tenant Verification', desc: 'Verify your tenant\'s background for safe property rental.', color: 'from-blue-500 to-indigo-600' },
  { icon: Shield, title: 'Employee Verification', desc: 'Conduct thorough employee background checks instantly.', color: 'from-indigo-500 to-purple-600' },
  { icon: Globe, title: 'Passport Verification', desc: 'Streamlined police clearance for passport applications.', color: 'from-purple-500 to-pink-600' },
  { icon: Lock, title: 'Arms License', desc: 'Apply and verify arms license status securely online.', color: 'from-pink-500 to-red-500' },
  { icon: Search, title: 'General Verification', desc: 'General purpose police verification for any legal requirement.', color: 'from-orange-500 to-amber-500' },
];

const AI_FEATURES = [
  { icon: Eye, title: 'AI Face Recognition', desc: 'Biometric identity verification with deepfake detection and liveness checks.' },
  { icon: Cpu, title: 'Smart Chatbot', desc: 'NLP-powered assistant supporting Urdu and English for 24/7 guidance.' },
  { icon: AlertTriangle, title: 'Fraud Detection', desc: 'AI monitors applications for suspicious patterns and duplicate submissions.' },
  { icon: Zap, title: 'Instant Processing', desc: 'Automated document verification reduces processing time by 80%.' },
];

const TESTIMONIALS = [
  { name: 'Muhammad Ali Khan', role: 'Business Owner, Karachi', text: 'Got my character certificate in less than 24 hours! No more visiting the thana. Truly revolutionary system.', rating: 5 },
  { name: 'Aisha Mahmood', role: 'HR Manager, Lahore', text: 'Employee verification is now so simple. We verified 50 candidates in a single day without any hassle.', rating: 5 },
  { name: 'Tariq Hussain', role: 'Landlord, Islamabad', text: 'Tenant verification saved me from a potential fraud. The AI system caught discrepancies I would have missed.', rating: 5 },
];

const STEPS = [
  { n: '01', title: 'Register with CNIC', desc: 'Create your account using your CNIC and OTP verification.' },
  { n: '02', title: 'Submit Request', desc: 'Fill the online form and upload required documents.' },
  { n: '03', title: 'AI Verification', desc: 'Facial recognition and document AI checks run automatically.' },
  { n: '04', title: 'Pay Online', desc: 'Pay the fee via JazzCash, EasyPaisa or card.' },
  { n: '05', title: 'Police Review', desc: 'Staff reviews and approves your application.' },
  { n: '06', title: 'Get Certificate', desc: 'Download your digital certificate with QR authentication.' },
];

function CountUp({ target }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const numeric = parseFloat(target.replace(/[^0-9.]/g, ''));
    const suffix = target.replace(/[0-9.]/g, '');
    let start = 0;
    const step = numeric / 60;
    const interval = setInterval(() => {
      start += step;
      if (start >= numeric) { setVal(target); clearInterval(interval); }
      else setVal(Math.floor(start) + suffix);
    }, 25);
    return () => clearInterval(interval);
  }, [target]);
  return <span>{val}</span>;
}

export default function LandingPage() {
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    const el = document.getElementById('stats-section');
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="page-bg grid-overlay">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/30 bg-cyan-400/5 text-cyan-400 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              Pakistan's First AI-Powered Police Services
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Smart Police
              <span className="block neon-text">Verification</span>
              <span className="block text-white/80">For Citizens</span>
            </h1>
            <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-lg">
              Eliminate "Thana Culture" with transparent, AI-powered online verification.
              Get character certificates, tenant verification, and more — without leaving home.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary flex items-center gap-2 text-base">
                Apply Now <ChevronRight size={18} />
              </Link>
              <Link to="/track" className="btn-secondary flex items-center gap-2 text-base">
                <Search size={18} /> Track Application
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-2">
                {['AK','FM','TH','SB','MR'].map((i,idx) => (
                  <div key={idx} className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 border-2 border-navy-950 flex items-center justify-center text-white text-xs font-bold">{i}</div>
                ))}
              </div>
              <div>
                <div className="flex text-yellow-400 mb-0.5">{[...Array(5)].map((_,i)=><Star key={i} size={14} fill="currentColor"/>)}</div>
                <p className="text-white/50 text-sm">Trusted by 2.4M+ citizens</p>
              </div>
            </div>
          </div>

          {/* Right — hero illustration */}
          <div className="relative flex justify-center animate-float">
            <div className="relative w-80 h-80 lg:w-96 lg:h-96">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-spin-slow" />
              <div className="absolute inset-4 rounded-full border border-cyan-400/10 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
              {/* Center card */}
              <div className="absolute inset-8 glass-card rounded-full flex flex-col items-center justify-center gap-2 gradient-border">
                <Shield size={56} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 12px rgba(0,212,255,0.6))' }} />
                <p className="font-display font-bold text-white text-sm">PakVerify</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-xs">System Online</span>
                </div>
              </div>
              {/* Orbital icons */}
              {[
                { Icon: Cpu,       top: '-8px', left: '50%', label: 'AI' },
                { Icon: FileCheck, top: '50%',  right: '-8px', label: 'Docs' },
                { Icon: Lock,      bottom: '-8px', left: '50%', label: 'Secure' },
                { Icon: Users,     top: '50%',  left: '-8px', label: 'Citizens' },
              ].map(({ Icon, label, ...pos }, i) => (
                <div key={i} className="absolute" style={pos}>
                  <div className="glass-card p-3 rounded-2xl flex flex-col items-center gap-1 border border-cyan-400/20" style={{ transform: 'translate(-50%,-50%)' }}>
                    <Icon size={20} className="text-cyan-400" />
                    <span className="text-white/60 text-[10px]">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="stats-section" className="py-16 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={i} className="glass-card p-6 text-center gradient-border">
              <p className="font-display text-3xl font-bold neon-text-subtle">
                {statsVisible ? <CountUp target={s.value} /> : '0'}
              </p>
              <p className="text-white/50 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest mb-2">Our Services</p>
            <h2 className="section-title">Citizen Services <span className="neon-text">Online</span></h2>
            <p className="section-subtitle">All police verification services digitized for your convenience.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <Link to="/login" key={i} className="glass-card-hover p-6 group cursor-pointer block">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                  <s.icon size={24} className="text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                <div className="flex items-center gap-1 mt-4 text-cyan-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition">
                  Apply Now <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="py-20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest mb-2">Simple Process</p>
            <h2 className="section-title">How It <span className="neon-text">Works</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="glass-card p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 font-display text-5xl font-bold text-white/5">{s.n}</div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/20 flex items-center justify-center mb-4">
                  <span className="text-cyan-400 font-bold text-sm">{s.n}</span>
                </div>
                <h3 className="text-white font-semibold mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Features ── */}
      <section id="about" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest mb-2">Powered by AI</p>
            <h2 className="section-title">Intelligent <span className="neon-text">Verification</span></h2>
            <p className="text-white/60 mt-4 leading-relaxed">
              Our system uses cutting-edge artificial intelligence to verify identities, detect fraud, and process applications faster than ever before — making Pakistan's police services truly 21st century.
            </p>
            <div className="mt-8 flex flex-col gap-4">
              {AI_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-4 glass-card p-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0">
                    <f.icon size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">{f.title}</h4>
                    <p className="text-white/50 text-sm mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* AI visual */}
          <div className="relative flex justify-center">
            <div className="glass-card gradient-border p-8 w-full max-w-sm">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/30 border border-cyan-400/20 flex items-center justify-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-cyan-400/40 flex items-center justify-center bg-cyan-400/5">
                    <Users size={56} className="text-cyan-400/60" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400/60 animate-ping" />
                  <div className="scan-line" style={{ position:'absolute', top:0, left:0, right:0 }} />
                </div>
                {/* Corner markers */}
                {['top-0 left-0','top-0 right-0','bottom-0 left-0','bottom-0 right-0'].map((pos,i) => (
                  <div key={i} className={`absolute ${pos} w-6 h-6`}>
                    <div className={`absolute w-full h-0.5 bg-cyan-400 ${i<2?'top-0':'bottom-0'}`} />
                    <div className={`absolute h-full w-0.5 bg-cyan-400 ${i%2===0?'left-0':'right-0'}`} />
                  </div>
                ))}
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-cyan-400 text-xs font-mono animate-pulse">AI SCANNING... 94.7%</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {[{ label: 'Face Match', val: 97 }, { label: 'Document Auth', val: 100 }, { label: 'Liveness', val: 89 }].map((b,i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>{b.label}</span><span className="text-cyan-400">{b.val}%</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${b.val}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest mb-2">Testimonials</p>
            <h2 className="section-title">Trusted by <span className="neon-text">Citizens</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="glass-card p-6 gradient-border">
                <div className="flex text-yellow-400 mb-4">{[...Array(t.rating)].map((_,j)=><Star key={j} size={16} fill="currentColor"/>)}</div>
                <p className="text-white/70 text-sm leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
                    {t.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{t.name}</p>
                    <p className="text-white/40 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="glass-card gradient-border p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-glow-cyan opacity-50" />
            <div className="relative">
              <Award size={48} className="text-cyan-400 mx-auto mb-4" />
              <h2 className="font-display text-3xl font-bold text-white mb-4">
                Ready to Apply <span className="neon-text">Online?</span>
              </h2>
              <p className="text-white/60 mb-8">Join 2.4 million citizens who have already experienced the future of police services.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/register" className="btn-primary flex items-center gap-2">
                  Get Started Free <ChevronRight size={18} />
                </Link>
                <Link to="/track" className="btn-secondary flex items-center gap-2">
                  <Search size={18} /> Track Application
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                  <Shield size={16} className="text-white" />
                </div>
                <span className="font-display font-bold text-white">PakVerify</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">Pakistan's premier AI-powered police verification and citizen services platform.</p>
            </div>
            {[
              { title: 'Services', links: ['Character Certificate','Tenant Verification','Employee Verification','Arms License','Passport Clearance'] },
              { title: 'Platform', links: ['Citizen Portal','Police Dashboard','Admin Console','Track Application','Digital Certificates'] },
              { title: 'Support', links: ['Help Center','Contact Us','Privacy Policy','Terms of Service','Accessibility'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-white font-semibold mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-white/40 text-sm hover:text-cyan-400 transition">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 gap-4">
            <p className="text-white/30 text-sm">© 2025 PakVerify — Government of Pakistan. All rights reserved.</p>
            <div className="flex items-center gap-2 text-white/30 text-sm">
              <Phone size={14} />
              <span>Helpline: 0800-12345 (24/7)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
