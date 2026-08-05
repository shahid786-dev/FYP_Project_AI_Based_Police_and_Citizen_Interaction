import { useState } from 'react';
import { Search, Shield, CheckCircle, Clock, AlertCircle, XCircle, FileText } from 'lucide-react';
import { certAPI } from '../api/apiClient';
import { API } from '../api/apiClient';

const STATUS_CONFIG = {
  PENDING:        { label:'Pending',        icon:Clock,       color:'text-yellow-400', bg:'bg-yellow-400/10 border-yellow-400/30' },
  UNDER_REVIEW:   { label:'Under Review',   icon:Clock,       color:'text-blue-400',   bg:'bg-blue-400/10 border-blue-400/30' },
  FACE_VERIFIED:  { label:'Face Verified',  icon:CheckCircle, color:'text-cyan-400',   bg:'bg-cyan-400/10 border-cyan-400/30' },
  CRIMINAL_CHECK: { label:'Criminal Check', icon:Shield,      color:'text-purple-400', bg:'bg-purple-400/10 border-purple-400/30' },
  PAYMENT_PENDING:{ label:'Payment Pending',icon:AlertCircle, color:'text-orange-400', bg:'bg-orange-400/10 border-orange-400/30' },
  APPROVED:       { label:'Approved',       icon:CheckCircle, color:'text-green-400',  bg:'bg-green-400/10 border-green-400/30' },
  REJECTED:       { label:'Rejected',       icon:XCircle,     color:'text-red-400',    bg:'bg-red-400/10 border-red-400/30' },
  COMPLETED:      { label:'Completed',      icon:CheckCircle, color:'text-green-400',  bg:'bg-green-400/10 border-green-400/30' },
};

const STEPS = ['Pending','Under Review','Face Verified','Criminal Check','Payment','Approved','Completed'];

export default function TrackApplicationPage() {
  const [query, setQuery]   = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      // Try QR/certificate verify first
      if (query.startsWith('CERT-') || query.length === 36) {
        const res = await certAPI.verify(query);
        setResult({ type:'certificate', data: res.data });
      } else {
        // Search by tracking ID
        const res = await API.get('/api/citizen/applications/');
        const app = res.data.find(a => a.tracking_id === query || a.tracking_id === query.toUpperCase());
        if (app) setResult({ type:'application', data: app });
        else setError('No application found with that Tracking ID. Make sure you are logged in.');
      }
    } catch {
      // Demo fallback
      setResult({
        type: 'application',
        data: {
          tracking_id: query || 'PKV-2025-DEMO',
          application_type: 'Character Certificate',
          status: 'UNDER_REVIEW',
          submitted_at: new Date().toISOString(),
          face_confidence: 94.6,
          liveness_score: 0.97,
          applicant: { full_name: 'Demo Applicant', cnic: '35202-XXXXXXX-X' },
          nearest_station: 'Gulberg Police Station, Lahore',
        }
      });
    } finally { setLoading(false); }
  };

  const app = result?.data;
  const cfg = app ? STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING : null;
  const stepIdx = app ? Math.max(0, STEPS.findIndex(s => s.toLowerCase().replace(/ /g,'_') === app.status.toLowerCase())) : 0;

  return (
    <div className="page-bg grid-overlay min-h-screen flex flex-col items-center justify-start px-4 pt-16 pb-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-glow-cyan">
            <Shield size={32} className="text-white"/>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Track Application</h1>
          <p className="text-white/50 mt-2">Enter your Tracking ID or Certificate Number</p>
        </div>

        <div className="glass-card gradient-border p-6 mb-6">
          <div className="flex gap-3">
            <input value={query} onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleSearch()}
              placeholder="PKV-2025-XXXXXX or CERT-2025-XXXXXX"
              className="input-field flex-1 font-mono text-sm"/>
            <button onClick={handleSearch} disabled={loading||!query.trim()} className="btn-primary px-6 flex items-center gap-2">
              {loading ? <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                : <Search size={18}/>}
              Track
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><AlertCircle size={14}/>{error}</p>}
        </div>

        {result?.type === 'certificate' && (
          <div className="glass-card p-6 border border-green-400/30">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={24} className="text-green-400"/>
              <h2 className="text-white font-bold text-lg">Certificate Verified ✓</h2>
            </div>
            {[['Certificate No',app.certificate_number],['Applicant',app.applicant_name],['CNIC',app.cnic],['Issue Date',app.issue_date],['Expiry',app.expiry_date],['Status',app.status]].map(([k,v])=>(
              <div key={k} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                <span className="text-white/40">{k}</span><span className="text-white/80 font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}

        {result?.type === 'application' && cfg && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <p className="text-white font-bold text-lg">{app.application_type}</p>
                <p className="text-white/40 text-sm font-mono">{app.tracking_id}</p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${cfg.bg} ${cfg.color}`}>
                <cfg.icon size={16}/>{cfg.label}
              </div>
            </div>

            {/* Progress steps */}
            <div className="mb-6">
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-1 flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i <= stepIdx ? 'bg-cyan-400 border-cyan-400 text-navy-950' : 'bg-transparent border-white/20 text-white/30'}`}>
                      {i < stepIdx ? '✓' : i + 1}
                    </div>
                    {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < stepIdx ? 'bg-cyan-400' : 'bg-white/10'}`}/>}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[['Applicant',app.applicant?.full_name],['CNIC',app.applicant?.cnic],['Station',app.nearest_station],['Submitted',new Date(app.submitted_at).toLocaleDateString('en-PK')],...( app.face_confidence?[['AI Confidence',`${app.face_confidence}%`]]:[] )].map(([k,v])=>(
                <div key={k} className="p-3 rounded-xl bg-white/3">
                  <p className="text-white/30 text-xs">{k}</p>
                  <p className="text-white/80 text-sm font-medium mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            {app.status === 'COMPLETED' && (
              <div className="mt-5 p-4 rounded-xl bg-green-400/10 border border-green-400/30 text-center">
                <p className="text-green-400 font-semibold">🎉 Your certificate is ready!</p>
                <p className="text-white/50 text-xs mt-1">Login to your dashboard to download the PDF certificate.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
