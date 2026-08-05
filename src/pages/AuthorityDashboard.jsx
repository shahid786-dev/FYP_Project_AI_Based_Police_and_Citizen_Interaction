import { useState, useEffect } from 'react';
import {
  Shield, Users, FileText, CheckCircle, XCircle, AlertTriangle,
  BarChart2, Clock, Eye, Lock, Download, RefreshCw, Search,
  PlusCircle, Trash2, Edit3, Activity, Database, ChevronDown,
  ChevronUp, Fingerprint, Award, DollarSign
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useSelector } from 'react-redux';
import { authorityAPI, policeAPI, adminAPI } from '../api/apiClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#22d3ee','#6366f1','#10b981','#f59e0b','#ef4444'];
const STATUS_COLOR = {
  PENDING:'status-pending', UNDER_REVIEW:'status-review', FACE_VERIFIED:'status-review',
  CRIMINAL_CHECKED:'status-review', STAFF_REVIEWED:'status-review',
  AUTHORITY_APPROVED:'status-approved', AUTHORITY_REJECTED:'status-rejected',
  PAYMENT_PENDING:'status-pending', PAYMENT_CONFIRMED:'status-review',
  COMPLETED:'status-approved',
};

/* ── Staff Form Modal ─────────────────────────────────────────── */
function StaffModal({ staff, onClose, onSaved }) {
  const [form, setForm] = useState(
    staff || { full_name:'', cnic:'', email:'', mobile_number:'', password:'Staff@1234', role:'POLICE_STAFF' }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      if (staff) await authorityAPI.updateStaff(staff.id, form);
      else        await authorityAPI.createStaff(form);
      onSaved();
    } catch(e) {
      setErr(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md p-6 flex flex-col gap-4">
        <h3 className="text-white font-bold text-lg">{staff ? 'Edit Staff' : 'Add New Staff'}</h3>
        {[['full_name','Full Name','text'],['cnic','CNIC','text'],['email','Email','email'],['mobile_number','Mobile','text']].map(([k,l,t]) => (
          <input key={k} type={t} value={form[k]} onChange={set(k)} placeholder={l}
            className="input-field text-sm" />
        ))}
        {!staff && (
          <input type="password" value={form.password} onChange={set('password')} placeholder="Password"
            className="input-field text-sm" />
        )}
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm py-2.5">
            {saving ? 'Saving…' : staff ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Application Decision Row ─────────────────────────────────── */
function AppRow({ app, onAction }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState('');

  const decide = async (decision) => {
    setActing(decision);
    try {
      await authorityAPI.decide(app.id, { decision, reason });
      onAction(app.id, decision === 'APPROVE' ? 'AUTHORITY_APPROVED' : 'AUTHORITY_REJECTED');
    } catch { alert('Action failed.'); }
    finally { setActing(''); }
  };

  const issueCert = async () => {
    setActing('CERT');
    try {
      await authorityAPI.issueCert(app.id);
      onAction(app.id, 'COMPLETED');
    } catch(e) { alert(e.response?.data?.error || 'Issue failed.'); }
    finally { setActing(''); }
  };

  const canDecide = app.status === 'STAFF_REVIEWED';
  const canCert   = app.status === 'PAYMENT_CONFIRMED';

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition">
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setOpen(o=>!o)}>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{app.applicant?.full_name}</p>
          <p className="text-white/40 text-xs font-mono">{app.tracking_id} · {app.application_type}</p>
          {app.face_confidence > 0 && <p className="text-cyan-400 text-xs mt-0.5">AI: {app.face_confidence}%</p>}
        </div>
        <span className={STATUS_COLOR[app.status] || 'status-pending'}>{app.status.replace(/_/g,' ')}</span>
        {open ? <ChevronUp size={14} className="text-white/30 flex-shrink-0"/> : <ChevronDown size={14} className="text-white/30 flex-shrink-0"/>}
      </div>

      {open && (
        <div className="border-t border-white/10 p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[['CNIC', app.applicant?.cnic],['Email', app.applicant?.email],
              ['District', app.applicant?.district||'—'],['Submitted', new Date(app.submitted_at).toLocaleDateString('en-PK')]
            ].map(([l,v]) => (
              <div key={l}><p className="text-white/30 mb-0.5">{l}</p><p className="text-white/70 font-mono">{v}</p></div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-cyan-400/5 border border-cyan-400/20 p-3">
              <p className="text-cyan-400 text-xs font-semibold mb-1 flex items-center gap-1"><Fingerprint size={12}/>AI Result</p>
              <p className="text-white/70 text-xs">Conf: {app.face_confidence||0}% | Live: {app.liveness_score ? (app.liveness_score*100).toFixed(0)+'%' : 'N/A'}</p>
            </div>
            <div className={`rounded-lg p-3 border ${app.criminal_check?.result==='CLEAN'?'bg-green-400/5 border-green-400/20':'bg-white/3 border-white/10'}`}>
              <p className="text-xs font-semibold mb-1 text-green-400 flex items-center gap-1"><Shield size={12}/>Criminal</p>
              <p className="text-white/70 text-xs">{app.criminal_check?.result||'Pending'}</p>
            </div>
            <div className="rounded-lg bg-purple-400/5 border border-purple-400/20 p-3">
              <p className="text-purple-400 text-xs font-semibold mb-1 flex items-center gap-1"><Activity size={12}/>NADRA</p>
              <p className="text-white/70 text-xs">{app.face_confidence>0?'Verified':'Pending'}</p>
            </div>
          </div>

          {app.notes && (
            <div className="bg-white/3 rounded-lg p-3 border border-white/5">
              <p className="text-white/30 text-xs mb-1">Staff Notes</p>
              <p className="text-white/60 text-sm">{app.notes}</p>
            </div>
          )}

          {canDecide && (
            <div className="flex flex-col gap-3">
              <input value={reason} onChange={e=>setReason(e.target.value)}
                placeholder="Reason / remarks (optional)…" className="input-field text-sm py-2"/>
              <div className="flex gap-3">
                <button onClick={()=>decide('APPROVE')} disabled={!!acting}
                  className="flex-1 py-2 rounded-xl bg-green-400/10 border border-green-400/30 text-green-400 text-sm font-medium hover:bg-green-400/20 transition flex items-center justify-center gap-1.5">
                  {acting==='APPROVE'?<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>:<CheckCircle size={14}/>}
                  Final Approve
                </button>
                <button onClick={()=>decide('REJECT')} disabled={!!acting}
                  className="flex-1 py-2 rounded-xl bg-red-400/10 border border-red-400/30 text-red-400 text-sm font-medium hover:bg-red-400/20 transition flex items-center justify-center gap-1.5">
                  <XCircle size={14}/> Reject
                </button>
              </div>
            </div>
          )}

          {canCert && (
            <button onClick={issueCert} disabled={!!acting}
              className="btn-primary text-sm py-2.5 flex items-center justify-center gap-2">
              {acting==='CERT'?<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>:<Award size={15}/>}
              Issue Blockchain Certificate
            </button>
          )}

          {app.status === 'COMPLETED' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-400/10 border border-green-400/30">
              <Award size={15} className="text-green-400"/>
              <p className="text-green-400 text-sm font-medium">Certificate Issued — Application Complete</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function AuthorityDashboard() {
  const { user } = useSelector(s => s.auth);
  const [tab, setTab]         = useState('applications');
  const [apps, setApps]       = useState([]);
  const [staff, setStaff]     = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [modal, setModal]     = useState(null); // null | 'add' | staffObj

  const loadApps  = () => policeAPI.allApplications().then(r => setApps(r.data)).catch(()=>{});
  const loadStaff = () => { setStaffLoading(true); authorityAPI.listStaff().then(r=>setStaff(r.data)).catch(()=>{}).finally(()=>setStaffLoading(false)); };
  const loadAnalytics = () => policeAPI.analytics().then(r=>setAnalytics(r.data)).catch(()=>{});
  const loadAuditLogs = () => adminAPI.auditLogs().then(r=>setAuditLogs(Array.isArray(r.data)?r.data:r.data.results||[])).catch(()=>{});

  useEffect(() => {
    Promise.all([loadApps(), loadAnalytics()]).finally(() => setLoading(false));
    loadStaff();
    loadAuditLogs();
  }, []);

  const handleAction = (id, newStatus) => setApps(prev => prev.map(a => a.id===id ? {...a, status:newStatus} : a));

  const handleToggle = async (s) => {
    await authorityAPI.toggleStaff(s.id);
    loadStaff();
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete ${s.full_name}?`)) return;
    await authorityAPI.deleteStaff(s.id);
    loadStaff();
  };

  const handleResetPwd = async (s) => {
    const pwd = prompt(`New password for ${s.full_name}:`, 'Staff@1234');
    if (!pwd) return;
    await authorityAPI.resetStaffPwd(s.id, { password: pwd });
    alert('Password reset successfully.');
  };

  const TABS = [
    { id:'applications', label:'Applications',    icon:FileText,  badge: apps.filter(a=>a.status==='STAFF_REVIEWED').length },
    { id:'staff',        label:'Staff Management',icon:Users },
    { id:'analytics',    label:'Analytics',       icon:BarChart2 },
    { id:'logs',         label:'Audit Logs',      icon:Database },
  ];

  const reviewed  = apps.filter(a => a.status === 'STAFF_REVIEWED');
  const allActive = apps.filter(a => !['COMPLETED','AUTHORITY_REJECTED'].includes(a.status));

  return (
    <DashboardLayout role="police" userName={user?.full_name || 'Authority'}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center">
              <Shield size={16} className="text-cyan-400"/>
            </div>
            <span className="text-cyan-400 text-xs font-semibold uppercase tracking-widest">Police Authority Portal</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Authority Dashboard</h1>
          <p className="text-white/50 mt-1 text-sm">Final approvals, certificate issuance, staff management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>{loadApps();loadStaff();loadAnalytics();}} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
            <RefreshCw size={14}/> Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Awaiting Decision', value: reviewed.length,                         color:'text-yellow-400', bg:'bg-yellow-400/10', icon:Clock },
          { label:'Active Cases',      value: allActive.length,                        color:'text-cyan-400',   bg:'bg-cyan-400/10',   icon:Eye },
          { label:'Completed',         value: apps.filter(a=>a.status==='COMPLETED').length, color:'text-green-400',  bg:'bg-green-400/10',  icon:CheckCircle },
          { label:'Staff Members',     value: staff.length,                            color:'text-purple-400', bg:'bg-purple-400/10', icon:Users },
        ].map((s,i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className={s.color}/>
            </div>
            <div>
              <p className={`font-bold text-2xl font-display ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${tab===t.id?'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30':'text-white/50 hover:text-white border border-white/10'}`}>
            <t.icon size={16}/>
            {t.label}
            {t.badge>0 && <span className="w-5 h-5 rounded-full bg-yellow-400 text-[#0a1628] text-xs flex items-center justify-center font-bold">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Applications ── */}
      {tab === 'applications' && (
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          ) : apps.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <FileText size={40} className="text-white/10 mx-auto mb-3"/>
              <p className="text-white/30">No applications yet.</p>
            </div>
          ) : (
            <>
              {reviewed.length > 0 && (
                <div className="mb-2">
                  <p className="text-yellow-400 text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock size={14}/> Awaiting Your Decision ({reviewed.length})
                  </p>
                  {reviewed.map(a => <AppRow key={a.id} app={a} onAction={handleAction}/>)}
                </div>
              )}
              <div>
                <p className="text-white/40 text-sm font-semibold mb-3">All Applications ({apps.length})</p>
                {apps.filter(a=>a.status!=='STAFF_REVIEWED').map(a => <AppRow key={a.id} app={a} onAction={handleAction}/>)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Staff Management ── */}
      {tab === 'staff' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Police Staff ({staff.length})</h2>
            <button onClick={()=>setModal('add')} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
              <PlusCircle size={15}/> Add Staff
            </button>
          </div>
          {staffLoading ? (
            <div className="text-white/30 text-sm text-center py-8">Loading staff…</div>
          ) : staff.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Users size={36} className="text-white/10 mx-auto mb-3"/>
              <p className="text-white/30 text-sm">No staff accounts yet.</p>
              <button onClick={()=>setModal('add')} className="btn-primary mt-4 text-sm px-6 py-2.5">Add First Staff</button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {staff.map(s => (
                <div key={s.id} className="glass-card p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {s.full_name?.[0] || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold truncate">{s.full_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${s.is_active ? 'bg-green-400/15 border-green-400/30 text-green-400' : 'bg-red-400/15 border-red-400/30 text-red-400'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs font-mono mt-0.5">{s.cnic}</p>
                    <p className="text-white/30 text-xs">{s.email}</p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button onClick={()=>setModal(s)} className="text-xs flex items-center gap-1 text-cyan-400 hover:underline"><Edit3 size={11}/>Edit</button>
                      <button onClick={()=>handleToggle(s)} className="text-xs flex items-center gap-1 text-yellow-400 hover:underline"><Lock size={11}/>{s.is_active?'Deactivate':'Activate'}</button>
                      <button onClick={()=>handleResetPwd(s)} className="text-xs flex items-center gap-1 text-purple-400 hover:underline"><RefreshCw size={11}/>Reset Pwd</button>
                      <button onClick={()=>handleDelete(s)} className="text-xs flex items-center gap-1 text-red-400 hover:underline"><Trash2 size={11}/>Delete</button>
                    </div>
                  </div>
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
              { label:'Total', value:analytics.total_applications, color:'text-cyan-400' },
              { label:'Completed', value:analytics.completed_applications, color:'text-green-400' },
              { label:'Success Rate', value:`${analytics.success_rate}%`, color:'text-blue-400' },
              { label:'Revenue PKR', value:(analytics.total_revenue||0).toLocaleString(), color:'text-purple-400' },
            ].map((s,i)=>(
              <div key={i} className="glass-card p-5">
                <p className="text-white/40 text-xs mb-1">{s.label}</p>
                <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">Monthly Application Trends</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.monthly_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10"/>
                <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize:12}}/>
                <YAxis stroke="#ffffff50" tick={{fontSize:12}}/>
                <Tooltip contentStyle={{background:'#0f172a',border:'1px solid #22d3ee33',borderRadius:8}}/>
                <Bar dataKey="applications" fill="#22d3ee" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {analytics.district_reports?.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-white font-semibold mb-4">District Reports</h3>
              <div className="flex flex-col gap-2">
                {analytics.district_reports.slice(0,8).map((d,i)=>(
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-white/50 w-28 truncate">{d.district||'Unknown'}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full bg-cyan-400" style={{width:`${Math.min(100,(d.count/(analytics.total_applications||1))*100)}%`}}/>
                    </div>
                    <span className="text-white/60 w-6 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Audit Logs ── */}
      {tab === 'logs' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2"><Database size={16} className="text-cyan-400"/>System Audit Logs</h2>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No audit logs found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {auditLogs.slice(0,50).map((log, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/3 transition">
                  <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
                    <Activity size={14} className="text-cyan-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm truncate">{log.action || log.event || log.description || JSON.stringify(log)}</p>
                    <p className="text-white/30 text-xs mt-0.5">By: <span className="text-white/50">{log.user || log.performed_by || '—'}</span></p>
                  </div>
                  <span className="text-white/30 text-xs font-mono flex-shrink-0">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('en-PK',{hour:'2-digit',minute:'2-digit'}) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Staff Modal */}
      {modal && (
        <StaffModal
          staff={modal !== 'add' ? modal : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadStaff(); }}
        />
      )}
    </DashboardLayout>
  );
}
