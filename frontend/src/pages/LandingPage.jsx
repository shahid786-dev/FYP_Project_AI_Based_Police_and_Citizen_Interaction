import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Search, ChevronRight, ArrowRight, FileText, QrCode,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { publicPortalAPI } from '../api/apiClient';

const MAIN_SERVICES = [
  { icon: Shield, title: 'Police Verification', desc: 'Apply for Police Character Certificate, Tenant Verification, or Employee Clearance online.', link: '/citizen/request', badge: 'Verification', color: 'from-blue-600 to-indigo-800' },
  { icon: Search, title: 'Track Application', desc: 'Check the current status and review progress for your police verification application.', link: '/track', badge: 'Status Check', color: 'from-cyan-600 to-blue-800' },
  { icon: QrCode, title: 'Verify Certificate', desc: 'Validate an issued police verification certificate using its QR code or certificate number.', link: '/track', badge: 'Certificate', color: 'from-indigo-600 to-blue-900' },
  { icon: FileText, title: 'Digital Certificates', desc: 'Access official certificates issued after successful police verification and payment review.', link: '/login', badge: 'Citizen Portal', color: 'from-amber-600 to-orange-700' },
];

export default function LandingPage() {
  const [verifiedCitizens, setVerifiedCitizens] = useState(null);
  const [statsUnavailable, setStatsUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      try {
        const response = await publicPortalAPI.stats();
        if (active) {
          setVerifiedCitizens(response.data.verified_citizens);
          setStatsUnavailable(false);
        }
      } catch {
        if (active) setStatsUnavailable(true);
      }
    };

    loadStats();
    const interval = window.setInterval(loadStats, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      {/* ── Hero Section ── */}
      <section className="relative pt-28 pb-20 overflow-hidden border-b border-slate-800">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-bold uppercase tracking-wider mb-6">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              National Police Verification Portal
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display text-white leading-tight">
              AI-Powered Police <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent">
                Verification Services
              </span>
            </h1>
            <p className="mt-6 text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
              Submit and track police verification applications, complete identity checks, and receive digital certificates with QR-based verification.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/citizen/request"
                className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
              >
                <span>Police Verification</span>
                <ChevronRight size={16} />
              </Link>
              <Link
                to="/track"
                className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider border border-slate-700 transition flex items-center gap-1.5"
              >
                <Search size={16} />
                <span>Track Application</span>
              </Link>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="relative flex justify-center">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Verification Workflow</h3>
                    <p className="text-slate-400 text-[11px]">Application to digital certificate</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-800/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />                   Available
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-300">Identity and document review</span>
                  <span className="font-semibold text-emerald-400">Application stage</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-300">Police staff and authority review</span>
                  <span className="font-semibold text-amber-400">Review stage</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-300">Digital certificate and QR check</span>
                  <span className="font-semibold text-blue-400">After approval</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="py-8 bg-slate-900/60 border-b border-slate-800" aria-live="polite">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
          <div className="text-center p-4">
            <p className="font-black text-3xl md:text-4xl text-amber-400 font-display">
              {verifiedCitizens === null ? (statsUnavailable ? '—' : '…') : verifiedCitizens.toLocaleString()}
            </p>
            <p className="text-slate-400 text-sm font-medium mt-1">Unique citizens with completed verification</p>
            {statsUnavailable && (
              <p className="text-slate-500 text-xs mt-1">Statistics are temporarily unavailable.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Main Citizen Services Grid ── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="px-3.5 py-1 rounded-full bg-blue-950 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-800/40">
            What Do You Need Help With?
          </span>
          <h2 className="text-3xl md:text-5xl font-black font-display text-white mt-3 tracking-tight">
            POLICE VERIFICATION <span className="text-amber-400">SERVICES</span>
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Apply for verification, follow your application, and check issued certificates.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MAIN_SERVICES.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <Link
                key={idx}
                to={srv.link}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${srv.color} flex items-center justify-center shadow-md text-white`}>
                      <Icon size={24} />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-400 text-[10px] font-bold uppercase border border-slate-800">
                      {srv.badge}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-lg group-hover:text-amber-400 transition">{srv.title}</h3>
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">{srv.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:translate-x-1 transition">
                  <span>Open Service</span>
                  <ArrowRight size={16} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
