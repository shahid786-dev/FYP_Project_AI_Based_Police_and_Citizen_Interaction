import { Link } from 'react-router-dom';
import { Shield, PhoneCall, Mail, MapPin, AlertTriangle, ExternalLink, ChevronRight } from 'lucide-react';

const SERVICES = [
  { to: '/citizen/request', label: 'Police Verification' },
  { to: '/track', label: 'Track Application' },
  { to: '/report-crime', label: 'Report a Crime' },
  { to: '/women-safety', label: 'Women Safety Desk' },
  { to: '/accident-assistance', label: 'Accident Assistance' },
  { to: '/criminal-records', label: 'Criminal Records' },
  { to: '/emergency-sos', label: '🚨 Emergency SOS' },
];

const QUICK_LINKS = [
  { to: '/about', label: 'About PakVerify' },
  { to: '/blockchain', label: 'Blockchain Ledger' },
  { to: '/verify/certificate', label: 'Verify Certificate' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/privacy', label: 'Privacy Policy' },
];

const POLICE_PORTALS = [
  { href: 'https://punjabpolice.gov.pk', label: 'Punjab Police', province: 'Punjab' },
  { href: 'https://sindhpolice.gov.pk', label: 'Sindh Police', province: 'Sindh' },
  { href: 'https://kppolice.gov.pk', label: 'KP Police', province: 'Khyber Pakhtunkhwa' },
  { href: 'https://balochpolice.gov.pk', label: 'Balochistan Police', province: 'Balochistan' },
  { href: 'https://islamabadpolice.gov.pk', label: 'Islamabad Police', province: 'ICT' },
  { href: 'https://ajkpolice.gov.pk', label: 'AJK Police', province: 'Azad Kashmir' },
  { href: 'https://gbpolice.gov.pk', label: 'GB Police', province: 'Gilgit-Baltistan' },
];

const HELPLINES = [
  { icon: '🚔', label: 'Police Emergency', number: '15' },
  { icon: '🚑', label: 'Rescue / Ambulance', number: '1122' },
  { icon: '📞', label: 'Edhi Foundation', number: '115' },
  { icon: '👩', label: 'Women Helpline', number: '1099' },
  { icon: '🏥', label: 'RESCUE / Fire', number: '16' },
  { icon: '📡', label: 'Crime Stoppers', number: '0800-02345' },
];

// Province-wise contact information
const PROVINCE_CONTACTS = [
  {
    province: 'Punjab',
    city: 'Lahore',
    phone: '+92-42-99001122',
    email: 'igp.complaints@punjabpolice.gov.pk',
    address: 'Central Police Office, Lahore, Punjab',
    flag: '🏛️',
  },
  {
    province: 'Sindh',
    city: 'Karachi',
    phone: '+92-21-35662222',
    email: 'igp@sindhpolice.gov.pk',
    address: 'Inspector General Office, Garden Karachi, Sindh',
    flag: '🌊',
  },
  {
    province: 'KPK',
    city: 'Peshawar',
    phone: '+92-91-9213500',
    email: 'igp@kppolice.gov.pk',
    address: 'Central Police Office, Peshawar, KPK',
    flag: '🏔️',
  },
  {
    province: 'Balochistan',
    city: 'Quetta',
    phone: '+92-81-9202820',
    email: 'igp@balochpolice.gov.pk',
    address: 'Inspector General Office, Quetta, Balochistan',
    flag: '🗺️',
  },
  {
    province: 'ICT',
    city: 'Islamabad',
    phone: '+92-51-9260404',
    email: 'igp@islamabadpolice.gov.pk',
    address: 'Police HQ, Sector G-7/2, Islamabad',
    flag: '🏛️',
  },
  {
    province: 'Gilgit-Baltistan',
    city: 'Gilgit',
    phone: '+92-5811-920202',
    email: 'igp@gbpolice.gov.pk',
    address: 'Inspector General Office, Gilgit-Baltistan',
    flag: '⛰️',
  },
  {
    province: 'AJK',
    city: 'Muzaffarabad',
    phone: '+92-5822-920911',
    email: 'igp@ajkpolice.gov.pk',
    address: 'Police HQ, Muzaffarabad, Azad Kashmir',
    flag: '🏕️',
  },
];

// Police badge SVG
const PoliceBadgeSmall = () => (
  <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
    <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="2.5" />
    <circle cx="50" cy="50" r="20" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="1.5" />
    <polygon points="50,35 52,44 61,44 54,49 57,58 50,53 43,58 46,49 39,44 48,44" fill="#f59e0b" />
  </svg>
);

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 border-t border-slate-800/60 relative overflow-hidden">

      {/* Decorative BG */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-800/5 rounded-full blur-3xl" />
        <div className="absolute -top-24 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-800/3 rounded-full blur-3xl" />
      </div>

      {/* Emergency Strip */}
      <div className="relative bg-gradient-to-r from-red-900/70 via-red-800/50 to-red-900/70 border-b border-red-700/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-red-200">
            <AlertTriangle size={16} className="text-red-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">National Emergency Hotlines</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {HELPLINES.map((h, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-red-950/60 border border-red-700/30 rounded-lg px-2.5 py-1">
                <span className="text-sm">{h.icon}</span>
                <span className="text-red-200 text-[9px] font-medium">{h.label}:</span>
                <span className="text-white font-black text-xs">{h.number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Province Contacts Stripe */}
      <div className="relative border-b border-slate-800/40 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-5 h-0.5 bg-amber-500 rounded-full" />
            Provincial Police Headquarters — Contact Directory
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {PROVINCE_CONTACTS.map((p, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 hover:border-amber-500/30 transition-all duration-200 group">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">{p.flag}</span>
                  <span className="text-amber-400 font-bold text-xs">{p.province}</span>
                </div>
                <p className="text-slate-400 text-[10px] mb-1 flex items-center gap-1">
                  <PhoneCall size={9} className="text-blue-400 shrink-0" />
                  <span className="font-mono">{p.phone}</span>
                </p>
                <p className="text-slate-500 text-[9px] truncate flex items-center gap-1" title={p.email}>
                  <Mail size={9} className="text-amber-400 shrink-0" />
                  {p.email}
                </p>
                <p className="text-slate-600 text-[9px] mt-1 flex items-start gap-1">
                  <MapPin size={9} className="text-emerald-400 shrink-0 mt-0.5" />
                  {p.city}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">

          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-5 group">
              {/* Police Badge + Shield combo */}
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/40 flex items-center justify-center shadow-lg group-hover:border-amber-400/70 transition-all duration-200 group-hover:scale-105">
                  <PoliceBadgeSmall />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-center">
                  <Shield size={10} className="text-emerald-400" />
                </div>
              </div>
              <div>
                <span className="text-white font-black text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Pak<span className="text-amber-400">Verify</span>
                </span>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">Official Gov Portal</p>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              Pakistan's first AI-Powered, Blockchain-Secured Police Verification System — ensuring transparency, efficiency, and citizen safety nationwide.
            </p>

            {/* Certifications */}
            <div className="flex flex-wrap gap-2">
              {['🔐 End-to-End Encrypted', '⛓️ Blockchain Secured', '🏛️ Govt. Authorized', '🤖 AI-Powered'].map((tag, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-400 text-[10px] font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-bold mb-5 uppercase tracking-widest text-xs flex items-center gap-2">
              <span className="w-5 h-0.5 bg-amber-500 rounded-full" />
              Citizen Services
            </h4>
            <ul className="space-y-2.5">
              {SERVICES.map((s, i) => (
                <li key={i}>
                  <Link
                    to={s.to}
                    className="text-slate-400 hover:text-amber-400 transition-colors text-sm flex items-center gap-2 group"
                  >
                    <ChevronRight size={12} className="text-slate-600 group-hover:text-amber-500 transition-colors" />
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links + Police Portals */}
          <div>
            <h4 className="text-white font-bold mb-5 uppercase tracking-widest text-xs flex items-center gap-2">
              <span className="w-5 h-0.5 bg-blue-500 rounded-full" />
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((s, i) => (
                <li key={i}>
                  <Link
                    to={s.to}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-sm flex items-center gap-2 group"
                  >
                    <ChevronRight size={12} className="text-slate-600 group-hover:text-blue-500 transition-colors" />
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Police Portals */}
            <h4 className="text-white font-bold mt-7 mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
              <span className="w-5 h-0.5 bg-emerald-500 rounded-full" />
              Police Portals
            </h4>
            <ul className="space-y-2">
              {POLICE_PORTALS.map((p, i) => (
                <li key={i}>
                  <a href={p.href} target="_blank" rel="noopener noreferrer"
                    className="text-slate-400 hover:text-emerald-400 transition-colors text-xs flex items-center gap-2 group">
                    <ExternalLink size={10} className="text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                    <span className="font-medium">{p.label}</span>
                    <span className="text-slate-600 text-[9px]">({p.province})</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-5 uppercase tracking-widest text-xs flex items-center gap-2">
              <span className="w-5 h-0.5 bg-rose-500 rounded-full" />
              Contact & Support
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-900/40 border border-blue-700/30 flex items-center justify-center shrink-0 mt-0.5">
                  <PhoneCall size={14} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">15 / 1122 / 115</p>
                  <p className="text-slate-500 text-xs">Emergency Helplines</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-900/40 border border-blue-700/30 flex items-center justify-center shrink-0 mt-0.5">
                  <PhoneCall size={14} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">+92-42-99001122</p>
                  <p className="text-slate-500 text-xs">Technical Support (Punjab HQ)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-900/40 border border-blue-700/30 flex items-center justify-center shrink-0 mt-0.5">
                  <PhoneCall size={14} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">+92-21-35662222</p>
                  <p className="text-slate-500 text-xs">Technical Support (Sindh HQ)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-900/40 border border-amber-700/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail size={14} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-200 text-[10px] font-mono">support@pakverify.gov.pk</p>
                  <p className="text-slate-500 text-xs mt-0.5">Portal Technical Support</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-900/40 border border-amber-700/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail size={14} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-200 text-[10px] font-mono">igp.complaints@punjabpolice.gov.pk</p>
                  <p className="text-slate-500 text-xs mt-0.5">Official Complaints (Punjab)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-900/40 border border-emerald-700/30 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={14} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">Central Police Office</p>
                  <p className="text-slate-500 text-xs">Lahore, Punjab · Karachi, Sindh · Peshawar, KPK</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-500 text-xs">
            <p>© {year} PakVerify Government Portal. All rights reserved.</p>
            <span className="hidden md:inline text-slate-700">|</span>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-600">All Systems Operational</span>
            </span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <p className="text-slate-500 text-xs">
              Designed & Developed by <span className="text-amber-400 font-bold">Shahid Ali</span>
              <span className="text-slate-600 mx-1">·</span>
              <span className="text-blue-400 font-semibold">Roll No: Shahid58</span>
            </p>
            <p className="text-slate-600 text-[10px]">
              Final Year Project — AI-Based Police & Citizen Interaction System
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
