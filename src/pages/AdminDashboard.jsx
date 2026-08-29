import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Users, Shield, FileText, AlertTriangle, CheckCircle, TrendingUp,
  Activity, Eye, Lock, Download, RefreshCw, Search, XCircle,
  Clock, Database, BarChart2, Bell, MapPin, Plus, Trash2, RefreshCcw,
  UserCheck, UserX
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { authorityAPI, policeAPI, applicationAPI } from '../api/apiClient';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const LINE_DATA = [
  { month:'Jan', apps:120, approved:98,  rejected:12, fraud:2 },
  { month:'Feb', apps:195, approved:165, rejected:22, fraud:4 },
  { month:'Mar', apps:230, approved:198, rejected:28, fraud:6 },
  { month:'Apr', apps:310, approved:276, rejected:30, fraud:8 },
  { month:'May', apps:278, approved:241, rejected:29, fraud:5 },
];

const PIE_DATA = [
  { name:'Character Cert', value:40, color:'#00d4ff' },
  { name:'Tenant Verify',  value:25, color:'#2d6cff' },
  { name:'Employee Verify',value:20, color:'#8b5cf6' },
  { name:'Passport',       value:10, color:'#06b6d4' },
  { name:'Others',         value:5,  color:'#6366f1' },
];

const AUDIT_LOGS = [
  { action:'Application PV-2025-0042 Approved',   user:'DSP Tariq',       time:'2025-05-06 14:22', type:'approval' },
  { action:'Fraud Alert — Duplicate CNIC detected',user:'AI System',       time:'2025-05-06 13:15', type:'fraud' },
  { action:'New Police Staff account created',     user:'Admin Bilal',     time:'2025-05-06 11:30', type:'admin' },
  { action:'Certificate CRT-2025-041789 issued',   user:'System',         time:'2025-05-06 09:05', type:'cert' },
  { action:'Login attempt blocked — 5 failures',   user:'Unknown IP',     time:'2025-05-06 08:47', type:'security' },
  { action:'Application PV-2025-0039 Rejected',    user:'DSP Tariq',       time:'2025-05-05 16:40', type:'rejection' },
];

const STAFF = [
  { name:'DSP Muhammad Tariq', station:'Gulberg PS',   apps:47, approved:41, status:'active' },
  { name:'DSP Sara Hussain',   station:'DHA PS',        apps:38, approved:33, status:'active' },
  { name:'SI Ahmed Raza',      station:'Model Town PS', apps:29, approved:24, status:'active' },
  { name:'ASI Bilal Khan',     station:'Cantt PS',      apps:19, approved:15, status:'inactive' },
];

const FRAUD_ALERTS = [
  { id:'FA-001', desc:'Duplicate CNIC submission detected', cnic:'35202-XXXXX-X', severity:'high',   time:'13:15' },
  { id:'FA-002', desc:'AI Deepfake detected in photo',      cnic:'35201-XXXXX-X', severity:'critical', time:'11:42' },
  { id:'FA-003', desc:'Multiple applications from same IP', cnic:'Multiple',       severity:'medium', time:'09:30' },
];

export default function AdminDashboard() {
  const { user } = useSelector(s => s.auth);
  const [activeSection, setActiveSection] = useState('overview');
  const [staffList, setStaffList] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ full_name: '', email: '', cnic: '', password: 'Staff@1234' });
  const [staffError, setStaffError] = useState('');
  const [savingStaff, setSavingStaff] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchApplications();
  }, []);

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await authorityAPI.listStaff();
      setStaffList(res.data || []);
    } catch { setStaffList([]); }
    finally { setLoadingStaff(false); }
  };

  const fetchApplications = async () => {
    try {
      const res = await applicationAPI.list();
      setApplications(res.data || []);
    } catch { setApplications([]); }
  };

  const handleAddStaff = async () => {
    setSavingStaff(true); setStaffError('');
    try {
      await authorityAPI.createStaff({ ...newStaff, role: 'POLICE_STAFF' });
      setShowAddStaff(false);
      setNewStaff({ full_name: '', email: '', cnic: '', password: 'Staff@1234' });
      fetchStaff();
    } catch (err) {
      const data = err.response?.data;
      setStaffError(data?.email?.[0] || data?.cnic?.[0] || data?.error || 'Failed to create staff.');
    } finally { setSavingStaff(false); }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    try {
      await authorityAPI.deleteStaff(id);
      fetchStaff();
    } catch { alert('Could not delete staff.'); }
  };

  const handleToggleStaff = async (id) => {
    try {
      await authorityAPI.toggleStaff(id);
      fetchStaff();
    } catch { alert('Could not toggle staff status.'); }
  };

  const handleDecision = async (id, decision) => {
    try {
      const reason = decision === 'REJECT' ? prompt('Enter reason for rejection:') || 'Rejected by Admin' : 'Approved by Admin';
      await authorityAPI.decide(id, { decision, reason });
      fetchApplications();
    } catch { alert('Error submitting decision.'); }
  };

  const provinceApps = applications.filter(a =>
    !user?.province || a.applicant_province === user?.province
  );

  return (
    <DashboardLayout role="admin" userName={user?.full_name || 'Admin'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
              <Shield size={16} className="text-purple-400" />
            </div>
            <span className="text-purple-400 text-xs font-bold uppercase tracking-widest">Super Admin Portal</span>
            {user?.province && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-xs">
                <MapPin size={10} /> {user.province}
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            {user?.province ? `${user.province} Admin Panel` : 'Admin Control Center'}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {user?.province
              ? `Managing applications for ${user.province} province — ${provinceApps.length} total`
              : 'Full system oversight — PakVerify AI Platform'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { fetchStaff(); fetchApplications(); }}
            className="btn-secondary flex items-center gap-2 text-sm py-2.5">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {[
          ['overview', 'Overview'], ['applications', 'Applications'],
          ['staff', 'Staff Management'], ['analytics', 'Analytics'], ['logs', 'Audit Logs']
        ].map(([id, label]) => (
          <button key={id} onClick={() => setActiveSection(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeSection === id ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' : 'text-white/50 hover:text-white border border-transparent hover:border-white/10'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSection === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Macro stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon:FileText,    label:'Total Applications', value:'1,134', sub:'+12% this month', color:'text-cyan-400',   bg:'bg-cyan-400/10' },
              { icon:CheckCircle, label:'Approved',           value:'978',   sub:'86.2% approval rate', color:'text-green-400', bg:'bg-green-400/10' },
              { icon:XCircle,     label:'Rejected',           value:'121',   sub:'10.6% of total', color:'text-red-400',   bg:'bg-red-400/10' },
              { icon:AlertTriangle,label:'Fraud Detected',   value:'35',    sub:'AI blocked 3 today', color:'text-orange-400',bg:'bg-orange-400/10' },
            ].map((s,i) => (
              <div key={i} className="glass-card p-5">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon size={22} className={s.color}/>
                </div>
                <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-white/70 text-sm font-medium mt-0.5">{s.label}</p>
                <p className="text-white/30 text-xs mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon:Users,    label:'Registered Citizens', value:'24,871', color:'text-blue-400' },
              { icon:Shield,   label:'Police Staff',        value:'142',    color:'text-indigo-400' },
              { icon:Activity, label:'AI Verifications',    value:'2,341',  color:'text-cyan-400' },
              { icon:Database, label:'Certificates Issued', value:'891',    color:'text-purple-400' },
            ].map((s,i) => (
              <div key={i} className="glass-card p-4 flex items-center gap-4">
                <s.icon size={22} className={s.color}/>
                <div>
                  <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
                  <p className="text-white/40 text-xs">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Fraud Alerts */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2"><AlertTriangle size={16} className="text-orange-400"/>Active Fraud Alerts</h2>
              <button onClick={() => setActiveSection('fraud')} className="text-cyan-400 text-xs hover:underline">View All</button>
            </div>
            <div className="flex flex-col gap-3">
              {FRAUD_ALERTS.map((a,i) => (
                <div key={i} className={`flex items-start gap-4 p-3 rounded-xl border ${a.severity==='critical' ? 'bg-red-500/10 border-red-500/30' : a.severity==='high' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.severity==='critical' ? 'bg-red-500/20' : a.severity==='high' ? 'bg-orange-500/20' : 'bg-yellow-500/20'}`}>
                    <AlertTriangle size={16} className={a.severity==='critical' ? 'text-red-400' : a.severity==='high' ? 'text-orange-400' : 'text-yellow-400'}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-white/80 text-sm font-medium">{a.desc}</span>
                      <span className={`status-badge border text-xs ${a.severity==='critical' ? 'bg-red-500/20 text-red-400 border-red-400/30' : a.severity==='high' ? 'bg-orange-500/20 text-orange-400 border-orange-400/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'}`}>{a.severity.toUpperCase()}</span>
                    </div>
                    <p className="text-white/40 text-xs font-mono">{a.id} · CNIC: {a.cnic} · {a.time}</p>
                  </div>
                  <button className="text-cyan-400 text-xs hover:underline flex-shrink-0">Investigate</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {activeSection === 'analytics' && (
        <div className="flex flex-col gap-6">
          {/* Line Chart */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold mb-5 flex items-center gap-2"><TrendingUp size={16} className="text-cyan-400"/>Monthly Application Trends</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={LINE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="month" tick={{ fill:'rgba(255,255,255,0.4)', fontSize:12 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'rgba(255,255,255,0.4)', fontSize:12 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:'#0a1628', border:'1px solid rgba(0,212,255,0.2)', borderRadius:'12px', color:'#fff' }}/>
                <Legend wrapperStyle={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}/>
                <Line type="monotone" dataKey="apps"     stroke="#00d4ff" strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="approved" stroke="#22d3ee" strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="rejected" stroke="#f87171" strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="fraud"    stroke="#fb923c" strokeWidth={2} dot={false} strokeDasharray="5 5"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-5 flex items-center gap-2"><BarChart2 size={16} className="text-cyan-400"/>Service Distribution</h2>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {PIE_DATA.map((e,i) => <Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ background:'#0a1628', border:'1px solid rgba(0,212,255,0.2)', borderRadius:'12px', color:'#fff' }}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 flex flex-col gap-2">
                  {PIE_DATA.map((d,i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background:d.color }}/>
                      <span className="text-white/50 text-xs flex-1">{d.name}</span>
                      <span className="text-white/70 text-xs font-semibold">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-5 flex items-center gap-2"><Activity size={16} className="text-cyan-400"/>Monthly Volume</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={LINE_DATA} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="month" tick={{ fill:'rgba(255,255,255,0.4)', fontSize:12 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'rgba(255,255,255,0.4)', fontSize:12 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:'#0a1628', border:'1px solid rgba(0,212,255,0.2)', borderRadius:'12px', color:'#fff' }}/>
                  <Bar dataKey="apps" fill="#2d6cff" radius={[6,6,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── APPLICATIONS ── */}
      {activeSection === 'applications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <FileText size={16} className="text-amber-400" />
              {user?.province ? `${user.province} Applications` : 'All Applications'} ({provinceApps.length})
            </h2>
            <button onClick={fetchApplications} className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              <RefreshCcw size={12} /> Refresh
            </button>
          </div>
          {provinceApps.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No applications found{user?.province ? ` for ${user.province}` : ''}.
            </div>
          ) : (
            <div className="space-y-2">
              {provinceApps.map(app => (
                <div key={app.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-amber-400">{app.tracking_id}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">{app.status}</span>
                    </div>
                    <p className="text-white font-semibold">{app.application_type}</p>
                    <p className="text-slate-500 mt-0.5">{app.applicant?.full_name} · CNIC: <span className="font-mono">{app.applicant?.cnic}</span></p>
                    {app.applicant_province && (
                      <p className="text-cyan-400/70 text-[10px] mt-0.5 flex items-center gap-1"><MapPin size={9} />{app.applicant_province}</p>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-4 flex-shrink-0">
                    <div className="text-slate-500 text-[10px] text-right">
                      <p>{new Date(app.submitted_at).toLocaleDateString('en-PK')}</p>
                    </div>
                    {app.status === 'FORWARDED_TO_ADMIN' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleDecision(app.id, 'APPROVE')}
                          className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/40 font-bold border border-green-500/30 transition">
                          Approve
                        </button>
                        <button onClick={() => handleDecision(app.id, 'REJECT')}
                          className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40 font-bold border border-red-500/30 transition">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STAFF MANAGEMENT ── */}
      {activeSection === 'staff' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              Police Staff ({staffList.length} members)
            </h2>
            <button onClick={() => { setShowAddStaff(true); setStaffError(''); }}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
              <Plus size={14} /> Add Staff
            </button>
          </div>

          {/* Add Staff Form */}
          {showAddStaff && (
            <div className="bg-slate-900 border border-cyan-500/20 rounded-3xl p-6">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <Plus size={14} className="text-cyan-400" /> Add New Police Staff
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label-text">Full Name *</label>
                  <input className="input-field" placeholder="DSP Muhammad Ali"
                    value={newStaff.full_name} onChange={e => setNewStaff(s => ({ ...s, full_name: e.target.value }))} />
                </div>
                <div>
                  <label className="label-text">Email *</label>
                  <input type="email" className="input-field" placeholder="officer@police.gov.pk"
                    value={newStaff.email} onChange={e => setNewStaff(s => ({ ...s, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label-text">CNIC *</label>
                  <input className="input-field font-mono" placeholder="35202-XXXXXXX-X"
                    value={newStaff.cnic} onChange={e => setNewStaff(s => ({ ...s, cnic: e.target.value }))} />
                </div>
                <div>
                  <label className="label-text">Password</label>
                  <input className="input-field" placeholder="Default: Staff@1234"
                    value={newStaff.password} onChange={e => setNewStaff(s => ({ ...s, password: e.target.value }))} />
                </div>
              </div>
              {staffError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                  <AlertTriangle size={14} />{staffError}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={handleAddStaff} disabled={savingStaff}
                  className="btn-primary flex items-center gap-2 text-sm py-2.5">
                  {savingStaff ? 'Saving...' : 'Create Staff Account'}
                </button>
                <button onClick={() => setShowAddStaff(false)} className="btn-secondary text-sm py-2.5">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loadingStaff ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            </div>
          ) : staffList.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
              <Users size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No police staff accounts yet.</p>
              <button onClick={() => setShowAddStaff(true)} className="btn-primary mt-4 text-sm">
                Add First Staff Member
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {staffList.map((s) => (
                <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {s.full_name?.[0] || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{s.full_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_active ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
                        {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{s.email}</p>
                    <p className="text-slate-500 text-xs font-mono">{s.cnic}</p>
                    {s.district && <p className="text-cyan-400/70 text-xs mt-0.5">{s.district}</p>}
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => handleToggleStaff(s.id)}
                        className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${s.is_active ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                        {s.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleDeleteStaff(s.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition flex items-center gap-1 text-xs">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FRAUD ALERTS ── */}
      {activeSection === 'fraud' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-semibold flex items-center gap-2"><AlertTriangle size={18} className="text-orange-400"/>AI Fraud Detection Alerts</h2>
            <span className="status-badge bg-red-400/20 text-red-400 border border-red-400/30">3 Active</span>
          </div>
          {FRAUD_ALERTS.map((a,i) => (
            <div key={i} className={`glass-card p-5 border ${a.severity==='critical' ? 'border-red-500/30' : a.severity==='high' ? 'border-orange-500/30' : 'border-yellow-500/30'}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${a.severity==='critical' ? 'bg-red-500/20' : a.severity==='high' ? 'bg-orange-500/20' : 'bg-yellow-500/20'}`}>
                    <AlertTriangle size={20} className={a.severity==='critical' ? 'text-red-400' : a.severity==='high' ? 'text-orange-400' : 'text-yellow-400'}/>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{a.desc}</p>
                    <p className="text-white/40 text-sm mt-0.5 font-mono">Alert ID: {a.id} · CNIC: {a.cnic}</p>
                    <p className="text-white/30 text-xs mt-1">Detected at {a.time} today by AI System</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn-secondary text-sm py-1.5 px-3">Investigate</button>
                  <button className="btn-danger text-sm py-1.5 px-3">Block</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AUDIT LOGS ── */}
      {activeSection === 'logs' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2"><Database size={16} className="text-cyan-400"/>System Audit Logs</h2>
            <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"><Download size={14}/>Export Logs</button>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-3.5 text-white/30"/>
            <input className="input-field pl-9 mb-4 text-sm" placeholder="Search logs..."/>
          </div>
          <div className="flex flex-col gap-2">
            {AUDIT_LOGS.map((log,i) => {
              const colorMap = { approval:'text-green-400 bg-green-400/10', fraud:'text-red-400 bg-red-400/10', admin:'text-purple-400 bg-purple-400/10', cert:'text-cyan-400 bg-cyan-400/10', security:'text-orange-400 bg-orange-400/10', rejection:'text-yellow-400 bg-yellow-400/10' };
              const IconMap = { approval:CheckCircle, fraud:AlertTriangle, admin:Shield, cert:FileText, security:Lock, rejection:XCircle };
              const Ic = IconMap[log.type] || Activity;
              const cls = colorMap[log.type] || 'text-white/50 bg-white/5';
              const [iconCls, bgCls] = cls.split(' ');
              return (
                <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/3 transition">
                  <div className={`w-8 h-8 rounded-lg ${bgCls} flex items-center justify-center flex-shrink-0`}>
                    <Ic size={15} className={iconCls}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm">{log.action}</p>
                    <p className="text-white/30 text-xs mt-0.5">By: <span className="text-white/50">{log.user}</span></p>
                  </div>
                  <span className="text-white/30 text-xs font-mono flex-shrink-0">{log.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
