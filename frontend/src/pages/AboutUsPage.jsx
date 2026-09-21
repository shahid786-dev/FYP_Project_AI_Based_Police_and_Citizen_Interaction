import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Shield, Award, Users, CheckCircle2 } from 'lucide-react';

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 max-w-6xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="px-3 py-1 rounded-full bg-cyan-950 text-cyan-400 font-semibold text-xs uppercase tracking-wider border border-cyan-800/40">
              About The Initiative
            </span>
            <h1 className="text-4xl md:text-5xl font-black font-display text-white mt-4 tracking-tight leading-tight">
              Modernizing Security with <span className="text-cyan-400">Artificial Intelligence</span>
            </h1>
            <p className="text-slate-400 mt-6 text-lg leading-relaxed">
              PakVerify is a visionary project bridging the gap between citizens and law enforcement. Our mission is to provide transparent, fast, and highly secure police services right to your fingertips using advanced AI and Blockchain technologies.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>
            <img 
              src="/police_team.png" 
              alt="Police Team" 
              className="relative z-10 w-full h-auto rounded-3xl shadow-2xl border-4 border-slate-800 object-cover"
            />
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-16 bg-slate-900 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-12">Our Achievements & Milestones</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Shield, stat: '500k+', label: 'Citizens Verified' },
              { icon: Award, stat: '100%', label: 'Blockchain Secured' },
              { icon: Users, stat: '99.9%', label: 'AI Accuracy Check' },
              { icon: CheckCircle2, stat: '24/7', label: 'Emergency Response' },
            ].map((Item, i) => (
              <div key={i} className="p-6 bg-slate-950 border border-slate-800 rounded-3xl hover:border-cyan-500/40 transition">
                <Item.icon size={40} className="text-cyan-400 mx-auto mb-4" />
                <h3 className="text-3xl font-black text-white">{Item.stat}</h3>
                <p className="text-slate-500 text-sm font-semibold uppercase tracking-wide mt-2">{Item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-6">Our Vision for a Safer Tomorrow</h2>
        <p className="text-slate-400 text-lg leading-relaxed mb-10">
          We envision a Pakistan where public safety services are seamlessly integrated with modern technology, eliminating bureaucratic red tape, combatting corruption via transparent ledgers, and ensuring that every citizen feels secure, heard, and protected.
        </p>
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-900 border border-slate-800">
          <span className="text-slate-500">Project conceptualized and developed by</span>
          <strong className="text-cyan-400 font-display">Shahid Ali</strong>
        </div>
      </section>

      <Footer />
    </div>
  );
}
