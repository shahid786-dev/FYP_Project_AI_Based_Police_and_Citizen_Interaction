import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Search, Shield, CheckCircle2, Clock, AlertCircle, AlertTriangle, FileText, Check } from 'lucide-react';
import { incidentsAPI, certAPI, API } from '../api/apiClient';

export default function TrackApplicationPage() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [query, setQuery] = useState(initialId);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialId) {
      handleSearch(initialId);
    }
  }, [initialId]);

  const handleSearch = async (searchId = query) => {
    const idToSearch = searchId.trim();
    if (!idToSearch) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // 1. If searching for certificate QR hash or cert number
      if (idToSearch.startsWith('CERT-') || idToSearch.length === 36) {
        const res = await certAPI.verify(idToSearch);
        setResult({ type: 'CERTIFICATE', data: res.data });
        setLoading(false);
        return;
      }

      // 2. Try unified tracking API (supports PKV-, CMP-, SOS-)
      const res = await incidentsAPI.trackUnified(idToSearch);
      setResult({ type: res.data.type, data: res.data });
    } catch (err) {
      console.warn('Unified tracking API fallback:', err);
      // Fallback fallback attempt directly against applications endpoint
      try {
        const appRes = await API.get('/api/citizen/applications/');
        const app = appRes.data.find(a => a.tracking_id?.toUpperCase() === idToSearch.toUpperCase());
        if (app) {
          setResult({
            type: 'VERIFICATION',
            data: {
              id: app.tracking_id,
              title: `Police Verification (${app.application_type})`,
              applicant_name: app.applicant?.full_name || 'Registered Citizen',
              status: app.status,
              submitted_at: app.submitted_at,
              updated_at: app.updated_at,
              details: app.purpose,
              timeline: [
                { title: 'Application Submitted', completed: true },
                { title: 'Face & Document AI Check', completed: app.status !== 'PENDING' },
                { title: 'Police Staff Review', completed: ['STAFF_REVIEWED', 'AUTHORITY_APPROVED', 'APPROVED', 'COMPLETED'].includes(app.status) },
                { title: 'Authority Final Decision', completed: ['AUTHORITY_APPROVED', 'APPROVED', 'COMPLETED'].includes(app.status) },
                { title: 'Certificate Issued', completed: ['APPROVED', 'COMPLETED'].includes(app.status) },
              ]
            }
          });
          return;
        }
      } catch (e) {
        console.error('Fallback failed:', e);
      }

      setError(err.response?.data?.error || `No active record found for ID "${idToSearch}". Please check tracking code.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-28 pb-16 px-4 max-w-3xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 shadow-glow">
            <Shield size={28} className="text-amber-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black font-display text-white tracking-tight">
            UNIFIED STATUS <span className="text-amber-400">TRACKER</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Track Verification Applications (<code className="text-amber-400 font-mono">PKV-...</code>), Complaints (<code className="text-amber-400 font-mono">CMP-...</code>), or SOS Alerts (<code className="text-amber-400 font-mono">SOS-...</code>)
          </p>
        </div>

        {/* Search Input Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. PKV-2026-104921 or CMP-2026-829401"
              className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs font-mono transition"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search size={16} />
              )}
              <span>Track</span>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-950/80 border border-red-600/50 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Certificate Result */}
        {result?.type === 'CERTIFICATE' && (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <div>
                <h3 className="font-bold text-white text-base">Digital Police Certificate Verified ✓</h3>
                <p className="text-slate-400 text-xs">Authentic record on police ledger</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Certificate Number:</span>
                <span className="font-mono font-bold text-amber-400">{result.data.certificate_number}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Citizen Name:</span>
                <span className="font-semibold text-white">{result.data.applicant_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold uppercase text-[10px]">
                  {result.data.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Unified Application / Complaint / SOS Timeline Result */}
        {result && result.type !== 'CERTIFICATE' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                  {result.data.type || 'RECORD FOUND'}
                </span>
                <h3 className="font-bold text-white text-lg mt-1">{result.data.title}</h3>
                <p className="text-slate-400 text-xs font-mono">Reference ID: {result.data.id}</p>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-blue-950/80 border border-blue-800/50 text-blue-300 font-black text-xs uppercase tracking-wider">
                Status: {result.data.status}
              </div>
            </div>

            {/* Timeline Progress */}
            {result.data.timeline && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Investigation Timeline</h4>
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {result.data.timeline.map((step, idx) => (
                    <div key={idx} className="relative flex items-start gap-3">
                      <div
                        className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          step.completed
                            ? 'bg-amber-500 text-slate-950 ring-4 ring-slate-900'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {step.completed ? <Check size={12} /> : idx + 1}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${step.completed ? 'text-white' : 'text-slate-500'}`}>
                          {step.title}
                        </p>
                        {step.date && <p className="text-[10px] text-slate-500 mt-0.5">{new Date(step.date).toLocaleString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Application Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Citizen Name</span>
                <span className="text-slate-200 font-medium">{result.data.applicant_name}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Submitted On</span>
                <span className="text-slate-200 font-medium">{new Date(result.data.submitted_at).toLocaleString()}</span>
              </div>
              {result.data.assigned_officer && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 sm:col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Assigned Officer</span>
                  <span className="text-amber-400 font-semibold">{result.data.assigned_officer}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
