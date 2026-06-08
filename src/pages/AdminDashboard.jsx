import { useState } from 'react';
import {
  Users, Shield, FileText, AlertTriangle, CheckCircle, TrendingUp,
  Activity, Eye, Lock, Download, RefreshCw, Search, XCircle,
  Clock, Database, BarChart2, Bell
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
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
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <DashboardLayout role="admin" userName="Shahid Ali">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Admin Control Center</h1>
          <p className="text-white/50 text-sm mt-1">Full system oversight — PakVerify AI Platform</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2 text-sm py-2.5"><Download size={16}/>Export Report</button>
          <button className="btn-primary flex items-center gap-2 text-sm py-2.5"><RefreshCw size={16}/>Refresh</button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {[
          ['overview','Overview'], ['analytics','Analytics'], ['staff','Staff Management'],
          ['fraud','Fraud Alerts'], ['logs','Audit Logs']
        ].map(([id,label]) => (
          <button key={id} onClick={() => setActiveSection(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeSection===id ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' : 'text-white/50 hover:text-white border border-transparent hover:border-white/10'}`}>
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

      {/* ── STAFF MANAGEMENT ── */}
      {activeSection === 'staff' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Police Staff ({STAFF.length} members)</h2>
            <button className="btn-primary text-sm py-2 px-4">+ Add Staff</button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {STAFF.map((s,i) => (
              <div key={i} className="glass-card p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {s.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold">{s.name}</p>
                    <span className={`status-badge border text-xs ${s.status==='active' ? 'status-approved' : 'status-rejected'}`}>{s.status}</span>
                  </div>
                  <p className="text-white/40 text-sm">{s.station}</p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <div><span className="text-white/30">Applications: </span><span className="text-cyan-400 font-semibold">{s.apps}</span></div>
                    <div><span className="text-white/30">Approved: </span><span className="text-green-400 font-semibold">{s.approved}</span></div>
                    <div><span className="text-white/30">Rate: </span><span className="text-white/60 font-semibold">{Math.round(s.approved/s.apps*100)}%</span></div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button className="p-1.5 rounded-lg bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20"><Eye size={14}/></button>
                  <button className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10"><Lock size={14}/></button>
                </div>
              </div>
            ))}
          </div>
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
