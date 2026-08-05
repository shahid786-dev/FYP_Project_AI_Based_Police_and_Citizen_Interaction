import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Shield, Search, CheckCircle, XCircle, Clock, Eye,
  BarChart2, Users, AlertTriangle, FileText
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { policeAPI } from '../api/apiClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const STATUS_STYLE = {
  PENDING:'status-pending', UNDER_REVIEW:'status-review',
  FACE_VERIFIED:'status-review', APPROVED:'status-approved',
  REJECTED:'status-rejected', COMPLETED:'status-approved',
};
const COLORS = ['#22d3ee','#6366f1','#10b981','#f59e0b','#ef4444'];

export default function PoliceDashboard() {
  const { user, role } = useSelector(s => s.auth);
  const [tab, setTab]   = useState(role === 'POLICE_AUTHORITY' ? 'analytics' : 'queue');
  const [apps, setApps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [criminal, setCriminal]   = useState({ query:'', type:'cnic', result:null, loading:false });
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    policeAPI.allApplications().then(r => setApps(r.data)).catch(()=>{}).finally(()=>setLoading(false));
    policeAPI.analytics().then(r => setAnalytics(r.data)).catch(()=>{});
  }, []);

  const handleReview = async (id, status) => {
    setActionLoading(id + status);
    try {
      await policeAPI.review(id, { status, notes: reviewNote });
      setApps(prev => prev.map(a => a.id === id ? { ...a, status: status === 'APPROVED' ? 'COMPLETED' : 'REJECTED' } : a));
      setReviewNote('');
    } catch { alert('Review failed.'); }
    finally { setActionLoading(null); }
  };

  const handleCriminalSearch = async () => {
    setCriminal(c => ({ ...c, loading: true, result: null }));
    try {
      const payload = c.type === 'cnic' ? { cnic: criminal.query } : { name: criminal.query };
      const res = await policeAPI.criminalSearch(payload);
      setCriminal(c => ({ ...c, result: res.data, loading: false }));
    } catch { setCriminal(c => ({ ...c, loading: false, result: { status:'ERROR', records:[] } })); }
  };

  const pendingApps = apps.filter(a => ['PENDING','UNDER_REVIEW','FACE_VERIFIED','CRIMINAL_CHECK'].includes(a.status));

  const TABS = [
    ...(role !== 'POLICE_AUTHORITY' ? [{ id:'queue', label:'Review Queue', icon:Clock, badge:pendingApps.length }] : []),
    { id:'criminal', label:'Criminal Search', icon:Search },
    { id:'analytics', label:'Analytics', icon:BarChart2 },
  ];

  return (
    <DashboardLayout role="police" userName={user?.full_name || 'Officer'}>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Police Dashboard</h1>
        <p className="text-white/50 mt-1 text-sm">Manage verification requests and criminal records</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${tab===t.id?'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30':'text-white/50 hover:text-white border border-white/10'}`}>
            <t.icon size={16} />
            {t.label}
            {t.badge > 0 && <span className="w-5 h-5 rounded-full bg-cyan-400 text-navy-950 text-xs flex items-center justify-center font-bold">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Review Queue ── */}
      {tab === 'queue' && (
        <div className="glass-card p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Clock size={18} className="text-cyan-400"/> Application Queue</h2>
          {loading ? <div className="text-white/40 text-sm py-8 text-center">Loading applications…</div>
            : pendingApps.length === 0 ? <div className="text-white/30 text-sm py-8 text-center">No pending applications.</div>
            : pendingApps.map(app => (
              <div key={app.id} className="border border-white/10 rounded-xl p-4 mb-3 hover:border-white/20 transition">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-white font-medium">{app.applicant?.full_name}</p>
                    <p className="text-white/40 text-xs font-mono">{app.tracking_id} · {app.application_type}</p>
                    <p className="text-white/30 text-xs mt-1">CNIC: {app.applicant?.cnic}</p>
                    {app.face_confidence > 0 && <p className="text-cyan-400 text-xs mt-1">AI Confidence: {app.face_confidence}%</p>}
                  </div>
                  <span className={STATUS_STYLE[app.status]||'status-pending'}>{app.status.replace(/_/g,' ')}</span>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <input value={reviewNote} onChange={e=>setReviewNote(e.target.value)}
                    placeholder="Review notes (optional)…"
                    className="input-field text-sm py-2" />
                  <div className="flex gap-2">
                    <button onClick={()=>handleReview(app.id,'APPROVED')} disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-400/10 border border-green-400/30 text-green-400 text-sm font-medium hover:bg-green-400/20 transition">
                      {actionLoading===app.id+'APPROVED'?<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>:<CheckCircle size={14}/>}
                      Approve
                    </button>
                    <button onClick={()=>handleReview(app.id,'REJECTED')} disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-400/10 border border-red-400/30 text-red-400 text-sm font-medium hover:bg-red-400/20 transition">
                      <XCircle size={14}/> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Criminal Search ── */}
      {tab === 'criminal' && (
        <div className="glass-card p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Search size={18} className="text-cyan-400"/>Criminal Record Search</h2>
          <div className="flex gap-3 mb-4 flex-wrap">
            {['cnic','name'].map(t=>(
              <button key={t} onClick={()=>setCriminal(c=>({...c,type:t,result:null}))}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition ${criminal.type===t?'bg-cyan-400/20 border-cyan-400/40 text-cyan-400':'border-white/10 text-white/40 hover:text-white'}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mb-6">
            <input value={criminal.query} onChange={e=>setCriminal(c=>({...c,query:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&handleCriminalSearch()}
              placeholder={criminal.type==='cnic'?'XXXXX-XXXXXXX-X':'Full name…'}
              className="input-field flex-1 font-mono" />
            <button onClick={handleCriminalSearch} disabled={criminal.loading||!criminal.query}
              className="btn-primary px-6 flex items-center gap-2">
              {criminal.loading?<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>:<Search size={16}/>}
              Search
            </button>
          </div>
          {criminal.result && (
            <div className={`p-5 rounded-xl border ${criminal.result.status==='CLEAN'?'bg-green-400/5 border-green-400/30':'bg-red-400/5 border-red-400/30'}`}>
              <div className="flex items-center gap-3 mb-3">
                {criminal.result.status==='CLEAN'?<CheckCircle size={22} className="text-green-400"/>:<AlertTriangle size={22} className="text-red-400"/>}
                <p className={`font-semibold ${criminal.result.status==='CLEAN'?'text-green-400':'text-red-400'}`}>
                  {criminal.result.status.replace(/_/g,' ')}
                </p>
              </div>
              {criminal.result.records?.map((r,i)=>(
                <div key={i} className="text-sm text-white/60 border-t border-white/10 pt-3 mt-3">
                  <p><span className="text-white/40">Name:</span> {r.name}</p>
                  <p><span className="text-white/40">CNIC:</span> <span className="font-mono">{r.cnic}</span></p>
                  <p><span className="text-white/40">Crime:</span> {r.crime_type}</p>
                  <p><span className="text-white/40">FIR:</span> {r.fir_number}</p>
                  <p><span className="text-white/40">Station:</span> {r.police_station}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Analytics ── */}
      {tab === 'analytics' && analytics && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Total Applications', value:analytics.total_applications,  color:'text-cyan-400' },
              { label:'Completed',          value:analytics.completed_applications, color:'text-green-400' },
              { label:'Success Rate',       value:`${analytics.success_rate}%`,   color:'text-blue-400' },
              { label:'Revenue (PKR)',       value:analytics.total_revenue?.toLocaleString(), color:'text-purple-400' },
            ].map((s,i)=>(
              <div key={i} className="glass-card p-5">
                <p className="text-white/40 text-xs mb-1">{s.label}</p>
                <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">Monthly Application Trends</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.monthly_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize:12}} />
                <YAxis stroke="#ffffff50" tick={{fontSize:12}} />
                <Tooltip contentStyle={{background:'#0f172a',border:'1px solid #22d3ee33',borderRadius:8}} />
                <Bar dataKey="applications" fill="#22d3ee" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {analytics.district_reports?.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-white font-semibold mb-4">District-wise Applications</h3>
              <div className="flex flex-col gap-2">
                {analytics.district_reports.slice(0,8).map((d,i)=>(
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-white/50 w-32 truncate">{d.district}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full bg-cyan-400" style={{width:`${Math.min(100,(d.count/analytics.total_applications)*100)}%`}} />
                    </div>
                    <span className="text-white/60 w-8 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
