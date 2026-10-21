import { Link } from 'react-router-dom';
import { ChevronRight, MessageCircle, Shield } from 'lucide-react';

const PORTAL_LINKS = [
  { to: '/citizen/request', label: 'Apply for Verification' },
  { to: '/track', label: 'Track Application' },
  { to: '/login', label: 'Citizen Portal' },
  { to: '/login/staff', label: 'Police Staff Portal' },
];

const INFORMATION_LINKS = [
  { to: '/about', label: 'About PakVerify' },
  { to: '/blockchain', label: 'Audit Ledger' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/privacy', label: 'Privacy Policy' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 border-t border-slate-800/60 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/40 flex items-center justify-center">
                <Shield size={24} className="text-amber-400" />
              </div>
              <span className="text-white font-black text-2xl font-display">
                Pak<span className="text-amber-400">Verify</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Police verification applications, identity review, payment processing, and digital certificate services in one secure portal.
            </p>
          </div>

          <div>
            <h2 className="text-white font-bold mb-4 uppercase tracking-widest text-sm">
              Verification Services
            </h2>
            <ul className="space-y-3">
              {PORTAL_LINKS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-slate-400 hover:text-amber-400 transition-colors text-sm flex items-center gap-2">
                    <ChevronRight size={14} className="text-slate-500" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-white font-bold mb-4 uppercase tracking-widest text-sm">
              Information & Support
            </h2>
            <ul className="space-y-3">
              {INFORMATION_LINKS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-slate-400 hover:text-cyan-400 transition-colors text-sm flex items-center gap-2">
                    <ChevronRight size={14} className="text-slate-500" />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="pt-1 flex items-center gap-2 text-slate-400 text-sm">
                <MessageCircle size={14} className="text-cyan-400" />
                Use the PakVerify assistant for help navigating the portal.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t border-slate-800/60 flex flex-col sm:flex-row justify-between gap-2 text-slate-500 text-sm">
          <span>&copy; {year} PakVerify. All rights reserved.</span>
          <span>Police Verification Portal</span>
        </div>
      </div>
    </footer>
  );
}
