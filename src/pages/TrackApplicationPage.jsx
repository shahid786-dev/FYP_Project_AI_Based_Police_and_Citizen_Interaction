import { useState } from 'react';
import { Search, CheckCircle, Clock, Shield, FileText, Award, AlertCircle, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';

const MOCK_APPS = {
  'PV-2025-0041': {
    id: 'PV-2025-0041', type: 'Character Certificate', name: 'Tahir Raza',
    cnic: '35202-1234567-1', station: 'Gulberg Police Station, Lahore',
    submitted: '2025-05-01', updated: '2025-05-06', currentStep: 5,
    steps: [
      { label: 'Application Submitted',     date: '2025-05-01 09:15 AM', done: true,  note: 'Application received and logged in system.' },
      { label: 'Documents Under Review',     date: '2025-05-01 02:30 PM', done: true,  note: 'Documents verified by AI. All clear.' },
      { label: 'AI Verification Complete',   date: '2025-05-02 10:00 AM', done: true,  note: 'Face recognition 97.4% match. Identity confirmed.' },
      { label: 'Police Review',              date: '2025-05-04 11:20 AM', done: true,  note: 'DSP Muhammad Tariq reviewed the application.' },
      { label: 'Application Approved',       date: '2025-05-05 03:45 PM', done: true,  note: 'Application approved by SP Headquarters.' },
      { label: 'Certificate Issued',         date: '2025-05-06 09:00 AM', done: true,  note: 'Digital certificate generated and ready for download.' },
    ],
  },
  'PV-2025-0038': {
    id: 'PV-2025-0038', type: 'Tenant Verification', name: 'Tahir Raza',
    cnic: '35202-1234567-1', station: 'DHA Phase 5 Station, Lahore',
    submitted: '2025-04-28', updated: '2025-05-06', currentStep: 3,
    steps: [
      { label: 'Application Submitted',    date: '2025-04-28 11:00 AM', done: true,  note: 'Application received.' },
      { label: 'Documents Under Review',   date: '2025-04-28 04:00 PM', done: true,  note: 'Initial AI document scan completed.' },
      { label: 'AI Verification Complete', date: '2025-04-30 10:30 AM', done: true,  note: 'Biometric verification passed.' },
      { label: 'Police Review',            date: null,                   done: false, note: 'Awaiting review by police staff. Additional documents may be requested.' },
      { label: 'Application Approved',     date: null,                   done: false, note: 'Pending' },
      { label: 'Certificate Issued',       date: null,                   done: false, note: 'Pending' },
    ],
  },
};

const STEP_ICONS = [FileText, Search, Shield, Clock, CheckCircle, Award];

export default function TrackApplicationPage() {
  const [trackId, setTrackId]   = useState('');
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [notFound, setNotFound] = useState(false);

  const search = () => {
    setNotFound(false); setResult(null);
    if (!trackId.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const app = MOCK_APPS[trackId.trim().toUpperCase()];
      if (app) setResult(app); else setNotFound(true);
    }, 1200);
  };

  const pct = result ? Math.round((result.currentStep / result.steps.length) * 100) : 0;

  return (
    <div className="page-bg grid-overlay min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 mb-4 shadow-glow-cyan">
              <Search size={26} className="text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">Track Your Application</h1>
            <p className="text-white/50">Enter your Application ID to see real-time status updates</p>
          </div>

          {/* Search box */}
          <div className="glass-card gradient-border p-6 mb-8">
            <label className="label-text">Application / Tracking ID</label>
            <div className="flex gap-3 mt-1">
              <input
                className="input-field font-mono flex-1"
                placeholder="e.g. PV-2025-0041"
                value={trackId}
                onChange={e => setTrackId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
              />
              <button onClick={search} disabled={loading} className="btn-primary flex items-center gap-2 px-6 flex-shrink-0">
                {loading
                  ? <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  : <><Search size={18}/> Track</>}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <p className="text-white/30 text-xs">Try demo IDs:</p>
              {Object.keys(MOCK_APPS).map(id => (
                <button key={id} onClick={() => { setTrackId(id); }} className="text-cyan-400 text-xs font-mono hover:underline">{id}</button>
              ))}
            </div>
          </div>

          {/* Not found */}
          {notFound && (
            <div className="glass-card p-6 border border-red-500/30 bg-red-500/5 flex items-center gap-4 animate-slide-up">
              <AlertCircle size={24} className="text-red-400 flex-shrink-0"/>
              <div>
                <p className="text-red-400 font-semibold">Application Not Found</p>
                <p className="text-white/50 text-sm">Please check the ID and try again. Contact helpline: 0800-12345</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="animate-slide-up">
              {/* App info */}
              <div className="glass-card gradient-border p-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Application Details</p>
                    <h2 className="text-white font-display font-bold text-xl">{result.type}</h2>
                    <p className="text-cyan-400 font-mono text-sm mt-0.5">{result.id}</p>
                  </div>
                  <span className={result.currentStep >= result.steps.length ? 'status-completed' : 'status-review'}>
                    {result.currentStep >= result.steps.length ? '✓ Completed' : '⏳ In Progress'}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm mb-5">
                  {[['Applicant', result.name],['CNIC', result.cnic],['Police Station', result.station],['Submitted', result.submitted],['Last Updated', result.updated]].map(([k,v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-white/30 text-xs">{k}</span>
                      <span className="text-white/80 font-medium font-mono text-xs mt-0.5">{v}</span>
                    </div>
                  ))}
                </div>
                {/* Overall progress */}
                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>Overall Progress</span><span>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-6">Application Timeline</h3>
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/5" />

                  <div className="flex flex-col gap-0">
                    {result.steps.map((step, i) => {
                      const Icon = STEP_ICONS[i];
                      const isActive = i === result.currentStep - 1 && !result.steps[i].done;
                      const isDone = step.done;
                      return (
                        <div key={i} className={`relative flex gap-4 pb-8 last:pb-0 ${!isDone && !isActive ? 'opacity-40' : ''}`}>
                          {/* Dot */}
                          <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                            isDone    ? 'bg-green-400/20 border border-green-400/40' :
                            isActive  ? 'bg-cyan-400/20 border-2 border-cyan-400 animate-pulse' :
                            'bg-white/5 border border-white/10'
                          }`}>
                            <Icon size={20} className={isDone ? 'text-green-400' : isActive ? 'text-cyan-400' : 'text-white/30'} />
                          </div>
                          {/* Content */}
                          <div className="flex-1 pt-2">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className={`font-semibold text-sm ${isDone ? 'text-white' : isActive ? 'text-cyan-400' : 'text-white/40'}`}>{step.label}</h4>
                              {isDone   && <span className="status-approved text-xs">Done</span>}
                              {isActive && <span className="status-review text-xs">In Progress</span>}
                            </div>
                            {step.date && <p className="text-white/30 text-xs mb-1 font-mono">{step.date}</p>}
                            <p className="text-white/50 text-xs leading-relaxed">{step.note}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {result.currentStep >= result.steps.length && (
                  <div className="mt-6 pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-3">
                    <a href="/citizen/certificate" className="btn-primary flex items-center justify-center gap-2 flex-1">
                      <Award size={18}/> Download Certificate
                    </a>
                    <button className="btn-secondary flex items-center justify-center gap-2 flex-1">
                      Share Certificate <ChevronRight size={16}/>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
