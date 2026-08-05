import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Shield, Clock, Search, CheckCircle, XCircle, AlertTriangle,
  FileText, User, ChevronDown, ChevronUp, Eye, MessageSquare,
  ThumbsUp, ThumbsDown, Info, Activity, Fingerprint
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { policeAPI } from '../api/apiClient';

const STATUS_COLORS = {
  PENDING:          'status-pending',
  UNDER_REVIEW:     'status-review',
  FACE_VERIFIED:    'status-review',
  CRIMINAL_CHECK:   'status-review',
  CRIMINAL_CHECKED: 'status-review',
  STAFF_REVIEWED:   'status-review',
  AUTHORITY_APPROVED:'status-approved',
  AUTHORITY_REJECTED:'status-rejected',
  PAYMENT_PENDING:  'status-pending',
  PAYMENT_CONFIRMED:'status-review',
  COMPLETED:        'status-approved',
};

const WORKABLE = ['PENDING','UNDER_REVIEW','FACE_VERIFIED','CRIMINAL_CHECK','CRIMINAL_CHECKED'];

function ApplicationCard({ app, onRemark }) {
  const [open, setOpen]         = useState(false);
  const [remark, setRemark]     = useState('');
  const [rec, setRec]           = useState('APPROVE');
  const [sending, setSending]   = useState(false);
  const [done, setDone]         = useState(false);

  const canAct = WORKABLE.includes(app.status);

  const handleSubmit = async () => {
    if (!remark.trim()) return;
    setSending(true);
    try {
      await policeAPI.staffRemark(app.id, { remarks: remark, recommendation: rec });
      setDone(true);
      onRemark(app.id);
    } catch { alert('Could not submit remark.'); }
    finally { setSending(false); }
  };

  return (
    <div className="glass-card overflow-hidden transition hover:border-white/20">
      {/* Header row */}
      <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{app.applicant?.full_name}</p>
          <p className="text-white/40 text-xs font-mono mt-0.5">{app.tracking_id} · {app.application_type}</p>
        </div>
        <span className={STATUS_COLORS[app.status] || 'status-pending'}>{app.status.replace(/_/g,' ')}</span>
        {open ? <ChevronUp size={16} className="text-white/40 flex-shrink-0" /> : <ChevronDown size={16} className="text-white/40 flex-shrink-0" />}
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-white/10 p-5 flex flex-col gap-5">
          {/* Citizen info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              ['CNIC',     app.applicant?.cnic],
              ['Email',    app.applicant?.email],
              ['Mobile',   app.applicant?.mobile_number || '—'],
              ['District', app.applicant?.district || '—'],
              ['Province', app.applicant?.province || '—'],
              ['Submitted',new Date(app.submitted_at).toLocaleDateString('en-PK')],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="text-white/30 text-xs mb-0.5">{l}</p>
                <p className="text-white/80 font-mono text-xs">{v}</p>
              </div>
            ))}
          </div>

          {/* AI & verification results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-cyan-400/5 border border-cyan-400/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Fingerprint size={16} className="text-cyan-400" />
                <span className="text-cyan-400 text-sm font-semibold">AI Verification</span>
              </div>
              <p className="text-white/60 text-xs">Confidence: <span className="text-white font-bold">{app.face_confidence ? `${app.face_confidence}%` : 'N/A'}</span></p>
              <p className="text-white/60 text-xs mt-1">Liveness: <span className="text-white font-bold">{app.liveness_score ? `${(app.liveness_score * 100).toFixed(1)}%` : 'N/A'}</span></p>
            </div>

            <div className={`rounded-xl p-4 border ${app.criminal_check?.result === 'CLEAN' ? 'bg-green-400/5 border-green-400/20' : app.criminal_check ? 'bg-red-400/5 border-red-400/20' : 'bg-white/3 border-white/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className={app.criminal_check?.result === 'CLEAN' ? 'text-green-400' : app.criminal_check ? 'text-red-400' : 'text-white/30'} />
                <span className={`text-sm font-semibold ${app.criminal_check?.result === 'CLEAN' ? 'text-green-400' : app.criminal_check ? 'text-red-400' : 'text-white/30'}`}>Criminal Check</span>
              </div>
              <p className="text-white/60 text-xs">{app.criminal_check?.result || 'Not yet performed'}</p>
              {app.criminal_check?.report_summary && (
                <p className="text-white/40 text-xs mt-1 line-clamp-2">{app.criminal_check.report_summary}</p>
              )}
            </div>

            <div className="rounded-xl bg-purple-400/5 border border-purple-400/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-purple-400" />
                <span className="text-purple-400 text-sm font-semibold">NADRA Status</span>
              </div>
              <p className="text-white/60 text-xs">
                {app.status === 'CRIMINAL_CHECKED' || app.status === 'STAFF_REVIEWED' ? 'Identity Matched ✓' :
                 app.face_confidence > 0 ? 'Verified' : 'Pending'}
              </p>
            </div>
          </div>

          {/* Purpose */}
          <div className="rounded-xl bg-white/3 p-4 border border-white/5">
            <p className="text-white/40 text-xs mb-1">Purpose / Notes</p>
            <p className="text-white/70 text-sm">{app.purpose || '—'}</p>
            {app.notes && <p className="text-white/40 text-xs mt-2 italic">Previous notes: {app.notes}</p>}
          </div>

          {/* Remark section (only if actionable) */}
          {canAct && !done && (
            <div className="flex flex-col gap-3">
              <p className="text-white/50 text-sm font-medium flex items-center gap-2">
                <MessageSquare size={15} className="text-cyan-400" /> Add Investigation Remark
              </p>
              <textarea
                rows={3}
                value={remark}
                onChange={e => setRemark(e.target.value)}
                placeholder="Enter your investigation remarks…"
                className="input-field text-sm resize-none"
              />
              <div className="flex gap-3 items-center">
                <span className="text-white/40 text-xs">Recommend:</span>
                {['APPROVE', 'REJECT', 'MORE_INFO'].map(r => (
                  <button key={r} onClick={() => setRec(r)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${rec === r
                      ? r === 'APPROVE' ? 'bg-green-400/20 border-green-400/40 text-green-400'
                        : r === 'REJECT' ? 'bg-red-400/20 border-red-400/40 text-red-400'
                        : 'bg-yellow-400/20 border-yellow-400/40 text-yellow-400'
                      : 'border-white/10 text-white/30 hover:text-white'}`}>
                    {r === 'APPROVE' ? <><ThumbsUp size={10} className="inline mr-1"/>Approve</> :
                     r === 'REJECT'  ? <><ThumbsDown size={10} className="inline mr-1"/>Reject</> :
                     <><Info size={10} className="inline mr-1"/>More Info</>}
                  </button>
                ))}
              </div>
              <button onClick={handleSubmit} disabled={sending || !remark.trim()}
                className="btn-primary text-sm py-2.5 flex items-center justify-center gap-2 self-start px-6">
                {sending ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> : <CheckCircle size={15} />}
                Submit Remark & Forward to Authority
              </button>
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-400/10 border border-green-400/30">
              <CheckCircle size={16} className="text-green-400" />
              <p className="text-green-400 text-sm">Remark submitted. Application forwarded to Police Authority.</p>
            </div>
          )}
          {!canAct && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/3 border border-white/10">
              <Eye size={14} className="text-white/30" />
              <p className="text-white/40 text-sm">This application is beyond staff review stage.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StaffDashboard() {
  const { user } = useSelector(s => s.auth);
  const [tab, setTab]     = useState('queue');
  const [apps, setApps]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [criminal, setCriminal] = useState({ query: '', type: 'cnic', result: null, loading: false });

  useEffect(() => {
    policeAPI.allApplications()
      .then(r => setApps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemarkDone = (id) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'STAFF_REVIEWED' } : a));
  };

  const reviewable = apps.filter(a => [...WORKABLE, 'STAFF_REVIEWED'].includes(a.status));
  const pending    = apps.filter(a => WORKABLE.includes(a.status));

  const handleCriminalSearch = async () => {
    setCriminal(c => ({ ...c, loading: true, result: null }));
    try {
      const payload = criminal.type === 'cnic' ? { cnic: criminal.query } : { name: criminal.query };
      const res = await policeAPI.criminalSearch(payload);
      setCriminal(c => ({ ...c, result: res.data, loading: false }));
    } catch {
      setCriminal(c => ({ ...c, loading: false, result: { status: 'ERROR', records: [] } }));
    }
  };

  const TABS = [
    { id: 'queue',    label: 'Review Queue',    icon: Clock,   badge: pending.length },
    { id: 'criminal', label: 'Criminal Search', icon: Search },
  ];

  return (
    <DashboardLayout role="police" userName={user?.full_name || 'Officer'}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Shield size={16} className="text-blue-400" />
            </div>
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest">Police Staff Portal</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Staff Dashboard</h1>
          <p className="text-white/50 mt-1 text-sm">Review applications, add remarks, and forward to Authority</p>
        </div>
        <div className="flex gap-3">
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-cyan-400 font-bold text-xl">{apps.length}</p>
            <p className="text-white/40 text-xs">Total</p>
          </div>
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-yellow-400 font-bold text-xl">{pending.length}</p>
            <p className="text-white/40 text-xs">Pending</p>
          </div>
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-green-400 font-bold text-xl">{apps.filter(a=>a.status==='STAFF_REVIEWED').length}</p>
            <p className="text-white/40 text-xs">Reviewed</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${tab === t.id ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' : 'text-white/50 hover:text-white border border-white/10'}`}>
            <t.icon size={16} />
            {t.label}
            {t.badge > 0 && <span className="w-5 h-5 rounded-full bg-cyan-400 text-[#0a1628] text-xs flex items-center justify-center font-bold">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Review Queue ── */}
      {tab === 'queue' && (
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          ) : reviewable.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <CheckCircle size={40} className="text-green-400/30 mx-auto mb-3" />
              <p className="text-white/30">No applications in your queue.</p>
            </div>
          ) : (
            reviewable.map(app => (
              <ApplicationCard key={app.id} app={app} onRemark={handleRemarkDone} />
            ))
          )}
        </div>
      )}

      {/* ── Criminal Search ── */}
      {tab === 'criminal' && (
        <div className="glass-card p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Search size={18} className="text-cyan-400" /> Criminal Record Database Search
          </h2>
          <div className="flex gap-3 mb-4">
            {['cnic', 'name'].map(t => (
              <button key={t} onClick={() => setCriminal(c => ({ ...c, type: t, result: null }))}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition ${criminal.type === t ? 'bg-cyan-400/20 border-cyan-400/40 text-cyan-400' : 'border-white/10 text-white/40 hover:text-white'}`}>
                {t === 'cnic' ? 'Search by CNIC' : 'Search by Name'}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mb-6">
            <input value={criminal.query} onChange={e => setCriminal(c => ({ ...c, query: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleCriminalSearch()}
              placeholder={criminal.type === 'cnic' ? 'XXXXX-XXXXXXX-X' : 'Full name…'}
              className="input-field flex-1 font-mono" />
            <button onClick={handleCriminalSearch} disabled={criminal.loading || !criminal.query}
              className="btn-primary px-6 flex items-center gap-2">
              {criminal.loading ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> : <Search size={16} />}
              Search
            </button>
          </div>
          {criminal.result && (
            <div className={`p-5 rounded-xl border ${criminal.result.status === 'CLEAN' ? 'bg-green-400/5 border-green-400/30' : 'bg-red-400/5 border-red-400/30'}`}>
              <div className="flex items-center gap-3 mb-3">
                {criminal.result.status === 'CLEAN' ? <CheckCircle size={22} className="text-green-400" /> : <AlertTriangle size={22} className="text-red-400" />}
                <p className={`font-semibold ${criminal.result.status === 'CLEAN' ? 'text-green-400' : 'text-red-400'}`}>
                  {criminal.result.status?.replace(/_/g, ' ')}
                </p>
              </div>
              {criminal.result.records?.map((r, i) => (
                <div key={i} className="text-sm text-white/60 border-t border-white/10 pt-3 mt-3 grid grid-cols-2 gap-2">
                  <p><span className="text-white/40">Name:</span> {r.name}</p>
                  <p><span className="text-white/40">CNIC:</span> <span className="font-mono">{r.cnic}</span></p>
                  <p><span className="text-white/40">Crime:</span> {r.crime_type}</p>
                  <p><span className="text-white/40">FIR:</span> {r.fir_number}</p>
                  <p><span className="text-white/40">Station:</span> {r.police_station}</p>
                  <p><span className="text-white/40">Severity:</span> {r.crime_severity}</p>
                  {r.is_wanted && <p className="col-span-2 text-red-400 font-semibold">⚠ WANTED PERSON</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
