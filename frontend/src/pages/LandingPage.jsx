import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Cpu, FileCheck, Search, Users, Lock,
  ChevronRight, Star, CheckCircle, ArrowRight,
  Globe, Zap, Eye, AlertTriangle, Award, Phone, Ambulance, HeartHandshake, FileText, QrCode, Bot
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const STATS = [
  { value: '2.4M+', label: 'Citizens Served' },
  { value: '99.2%', label: 'Verification Accuracy' },
  { value: '< 10 Min', label: 'Emergency Response' },
  { value: '850+', label: 'Police Stations Connected' },
];

const MAIN_SERVICES = [
  { icon: Shield, title: 'Police Verification', desc: 'Apply for Police Character Certificate, Tenant Verification, or Employee Clearance online.', link: '/citizen/request', badge: 'Verification', color: 'from-blue-600 to-indigo-800' },
  { icon: AlertTriangle, title: '🚨 Emergency SOS Alert', desc: '1-Click location dispatch to nearest police control room during active emergencies.', link: '/emergency-sos', badge: 'High Priority', color: 'from-red-600 to-rose-700' },
  { icon: Ambulance, title: '🚑 Accident Assistance', desc: 'Report road collisions, request medical aid, and facilitate helper/witness reporting.', link: '/accident-assistance', badge: 'Assistance', color: 'from-emerald-600 to-teal-800' },
  { icon: HeartHandshake, title: '👩 Women Safety Desk', desc: 'Confidential harassment, stalking, and safety reporting unit with victim identity protection.', link: '/women-safety', badge: 'Confidential', color: 'from-pink-600 to-purple-800' },
  { icon: FileText, title: '👜 Report Snatching / Crime', desc: 'Digitally file mobile snatching, robbery, theft, or burglary complaints.', link: '/report-crime', badge: 'Crime Desk', color: 'from-amber-600 to-orange-700' },
  { icon: Search, title: '🔎 Track Complaint / Case', desc: 'Track real-time timeline for verification applications, crime reports, and SOS alerts.', link: '/track', badge: 'Status Check', color: 'from-cyan-600 to-blue-800' },
  { icon: QrCode, title: '📜 Verify Certificate', desc: 'Instantly validate tamper-evident digital certificates via QR code scan or certificate number.', link: '/track', badge: 'Public Validation', color: 'from-indigo-600 to-blue-900' },
  { icon: Bot, title: '🤖 AI Citizen Assistant', desc: '24/7 intelligent assistance for police procedures, legal guidance, and emergency routing.', link: '#ai-chatbot', badge: 'AI Powered', color: 'from-violet-600 to-purple-900' },
];

export default function LandingPage() {
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
              National Police & Citizen Safety Network
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display text-white leading-tight">
              AI-Powered Police <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent">
                Verification & Safety
              </span>
            </h1>
            <p className="mt-6 text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
              Transparent, automated police verification, emergency SOS alert dispatch, crime reporting, women safety, and tamper-evident QR digital certificates.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/emergency-sos"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-900/40 hover:scale-105 active:scale-95 transition flex items-center gap-2 border border-red-400/30 animate-pulse"
              >
                <AlertTriangle size={18} />
                <span>🚨 Emergency SOS</span>
              </Link>
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
                <span>Track Complaint</span>
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
                    <h3 className="font-bold text-white text-sm">System Control Desk</h3>
                    <p className="text-slate-400 text-[11px]">Active Police Operations</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-800/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> Online
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-300">AI Face Verification Score:</span>
                  <span className="font-mono font-bold text-emerald-400">97.4% Match</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-300">Digital Certificate Cryptography:</span>
                  <span className="font-mono font-bold text-amber-400">SHA-256 Validated</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-300">Police Case Audit Ledger:</span>
                  <span className="font-mono font-bold text-blue-400">Immutable Record</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="py-12 bg-slate-900/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={i} className="text-center p-4">
              <p className="font-black text-2xl md:text-3xl text-amber-400 font-display">{s.value}</p>
              <p className="text-slate-400 text-xs font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Main Citizen Services Grid ── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="px-3.5 py-1 rounded-full bg-blue-950 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-800/40">
            What Do You Need Help With?
          </span>
          <h2 className="text-3xl md:text-5xl font-black font-display text-white mt-3 tracking-tight">
            PUBLIC SAFETY & <span className="text-amber-400">POLICE SERVICES</span>
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Select a service card below to initiate police verification, emergency dispatch, or incident reporting.
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
