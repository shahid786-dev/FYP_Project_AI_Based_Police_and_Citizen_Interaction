import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Shield, FileText, Lock, Users } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 pt-32 pb-16 px-4 max-w-4xl mx-auto w-full">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-cyan-900/30 text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
            <FileText size={32} />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-4">Terms & Conditions</h1>
          <p className="text-slate-400">Last updated: August 2026</p>
        </div>
        
        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield size={24} className="text-cyan-400" /> 1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using the AI-Based Police and Citizen Interaction System ("PakVerify"), you agree to be bound by these Terms and Conditions. This system is a government initiative to streamline police verification processes and citizen services. 
            </p>
          </section>

          <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Users size={24} className="text-cyan-400" /> 2. User Responsibilities
            </h2>
            <p>
              Users are required to provide accurate, current, and complete information during registration and application submission. Any fraudulent information, including but not limited to fake CNICs, altered documents, or deepfake imagery during the AI face verification process, will result in immediate suspension and may lead to legal action under the Prevention of Electronic Crimes Act (PECA).
            </p>
          </section>
          
          <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock size={24} className="text-cyan-400" /> 3. Service Usage
            </h2>
            <p>
              The platform provides services including but not limited to character certificates, emergency SOS, and crime reporting. Emergency services should only be used in genuine emergencies. Abuse of the SOS feature is a punishable offense.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 pt-32 pb-16 px-4 max-w-4xl mx-auto w-full">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Lock size={32} />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-slate-400">Last updated: August 2026</p>
        </div>
        
        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-white mb-4 text-blue-400">1. Data Collection</h2>
            <p>
              We collect personal information such as Name, CNIC, Address, Contact details, and Biometric data (facial images) to process police verification requests. This information is cross-referenced with national databases (NADRA) for identity verification.
            </p>
          </section>

          <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-white mb-4 text-blue-400">2. Data Security & Blockchain</h2>
            <p>
              Your data is highly secure. We use AES-256 encryption for data at rest. Critical transactional data, such as application approvals and certificate issuances, are immutably logged on a decentralized blockchain ledger to prevent tampering and ensure full transparency.
            </p>
          </section>
          
          <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-white mb-4 text-blue-400">3. Data Sharing</h2>
            <p>
              We do not share your personal information with third-party marketing agencies. Data is only shared with authorized law enforcement agencies, government bodies, and verified employers (only with your explicit consent via digital certificate QR code verification).
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
