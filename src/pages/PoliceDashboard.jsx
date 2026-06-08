import { useState } from 'react';
import {
  FileText, CheckCircle, XCircle, Clock, Search, Eye,
  Shield, AlertTriangle, ChevronRight, User, Download,
  MessageSquare, RotateCcw, Filter
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const APPS = [
  { id:'PV-2025-0042', name:'Fatima Noor',      cnic:'35201-9876543-2', type:'Character Certificate', date:'2025-05-06', status:'pending',  risk:'low',    station:'Gulberg PS' },
  { id:'PV-2025-0041', name:'Muhammad Ali',     cnic:'35202-1234567-1', type:'Tenant Verification',   date:'2025-05-05', status:'review',   risk:'medium', station:'DHA PS' },
  { id:'PV-2025-0040', name:'Ahmed Hassan',     cnic:'35203-5556677-3', type:'Employee Verification', date:'2025-05-04', status:'pending',  risk:'low',    station:'Model Town PS' },
  { id:'PV-2025-0039', name:'Sara Malik',       cnic:'35204-1122334-4', type:'Arms License Check',    date:'2025-05-03', status:'review',   risk:'high',   station:'Cantt PS' },
  { id:'PV-2025-0038', name:'Tariq Hussain',    cnic:'35205-9988776-5', type:'Passport Clearance',    date:'2025-05-02', status:'approved', risk:'low',    station:'Johar Town PS' },
  { id:'PV-2025-0037', name:'Zainab Ahmed',     cnic:'35206-7654321-6', type:'Character Certificate', date:'2025-05-01', status:'rejected', risk:'high',   station:'Shadman PS' },
  { id:'PV-2025-0036', name:'Bilal Chaudhry',   cnic:'35207-1357924-7', type:'General Verification',  date:'2025-04-30', status:'approved', risk:'low',    station:'Gulberg PS' },
];

const CHART_DATA = [
  { day:'Mon', approved:8, rejected:2, pending:5 },
  { day:'Tue', approved:12,rejected:1, pending:7 },
  { day:'Wed', approved:6, rejected:3, pending:9 },
  { day:'Thu', approved:15,rejected:2, pending:4 },
  { day:'Fri', approved:10,rejected:4, pending:6 },
  { day:'Sat', approved:7, rejected:1, pending:3 },
];

const RiskBadge = ({ risk }) => {
  const map = { low:'bg-green-400/20 text-green-400 border-green-400/30', medium:'bg-yellow-400/20 text-yellow-400 border-yellow-400/30', high:'bg-red-400/20 text-red-400 border-red-400/30' };
  return <span className={`status-badge border ${map[risk]}`}>{risk.toUpperCase()}</span>;
};
const StatusBadge = ({ status }) => {
  const map = { pending:'status-pending', review:'status-review', approved:'status-approved', rejected:'status-rejected' };
  return <span className={map[status] || 'status-pending'}>{status.charAt(0).toUpperCase()+status.slice(1)}</span>;
};

export default function PoliceDashboard() {
  const [tab, setTab]             = useState('all');
  const [selected, setSelected]   = useState(null);
  const [searchQ, setSearchQ]     = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const filtered = APPS.filter(a => {
    const matchTab = tab === 'all' || a.status === tab;
    const matchSearch = !searchQ || a.name.toLowerCase().includes(searchQ.toLowerCase()) || a.id.toLowerCase().includes(searchQ.toLowerCase()) || a.cnic.includes(searchQ);
    return matchTab && matchSearch;
  });

  const doAction = (action) => {
    setActionMsg(`Application ${selected.id} has been ${action}.`);
    setTimeout(() => setActionMsg(''), 3000);
    setSelected(null);
  };

  return (
    <DashboardLayout role="police" userName="Mohsin Raza">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Police Staff Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Review and manage citizen verification applications</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
          <span className="text-white/50">Gulberg Police Station</span>
        </div>
      </div>

      {/* Toast */}
      {actionMsg && (
        <div className="glass-card p-4 border border-green-400/30 bg-green-400/5 flex items-center gap-3 mb-6 animate-slide-up">
          <CheckCircle size={18} className="text-green-400"/><p className="text-green-400 text-sm">{actionMsg}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon:Clock,       label:'Pending Review',   value:'14', color:'text-yellow-400', bg:'bg-yellow-400/10' },
          { icon:Eye,         label:'Under Review',     value:'7',  color:'text-blue-400',   bg:'bg-blue-400/10' },
          { icon:CheckCircle, label:'Approved Today',   value:'23', color:'text-green-400',  bg:'bg-green-400/10' },
          { icon:AlertTriangle,label:'High Risk Flagged',value:'3', color:'text-red-400',    bg:'bg-red-400/10' },
        ].map((s,i) => (
          <div key={i} className="glass-card p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={22} className={s.color}/>
            </div>
            <div>
              <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-white/50 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-white font-semibold mb-5">Weekly Application Processing</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={CHART_DATA} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="day" tick={{ fill:'rgba(255,255,255,0.4)', fontSize:12 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'rgba(255,255,255,0.4)', fontSize:12 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:'#0a1628', border:'1px solid rgba(0,212,255,0.2)', borderRadius:'12px', color:'#fff' }}/>
              <Bar dataKey="approved" fill="#22d3ee" radius={[4,4,0,0]}/>
              <Bar dataKey="rejected" fill="#f87171" radius={[4,4,0,0]}/>
              <Bar dataKey="pending"  fill="#fbbf24" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-5 justify-center mt-3 text-xs text-white/50">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-cyan-400"/><span>Approved</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400"/><span>Rejected</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-yellow-400"/><span>Pending</span></div>
          </div>
        </div>

        {/* Criminal Record Search */}
        <div className="glass-card p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Search size={16} className="text-cyan-400"/>CNIC Search</h2>
          <div className="flex flex-col gap-3">
            <input className="input-field font-mono text-sm" placeholder="Enter CNIC number..."/>
            <button className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5">
              <Search size={16}/> Search Records
            </button>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-white/30 text-xs text-center">Enter a CNIC to check criminal records in the National Database</p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-white/40 text-xs font-medium">Recent Searches</p>
            {['35202-1234567-1','35201-9876543-2'].map(cnic => (
              <div key={cnic} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 hover:bg-white/5 cursor-pointer transition">
                <span className="text-white/60 text-xs font-mono">{cnic}</span>
                <span className="status-approved text-xs">Clear</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application Table */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-white font-semibold">Applications Queue</h2>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
              <input className="input-field pl-9 py-2 text-sm w-48" placeholder="Search..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
            </div>
            <div className="flex gap-1.5">
              {['all','pending','review','approved','rejected'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab===t ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' : 'text-white/40 hover:text-white'}`}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>App ID</th><th>Applicant</th><th>CNIC</th><th>Service</th><th>Date</th><th>Station</th><th>Risk</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app,i) => (
                <tr key={i} className="cursor-pointer" onClick={()=>setSelected(app)}>
                  <td className="font-mono text-cyan-400 text-xs">{app.id}</td>
                  <td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{app.name[0]}</div>{app.name}</div></td>
                  <td className="font-mono text-xs text-white/50">{app.cnic}</td>
                  <td className="text-xs">{app.type}</td>
                  <td className="text-white/50 text-xs">{app.date}</td>
                  <td className="text-white/50 text-xs">{app.station}</td>
                  <td><RiskBadge risk={app.risk}/></td>
                  <td><StatusBadge status={app.status}/></td>
                  <td onClick={e=>e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={()=>setSelected(app)} className="p-1.5 rounded-lg bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 transition" title="Review"><Eye size={14}/></button>
                      <button onClick={()=>doAction('approved')} className="p-1.5 rounded-lg bg-green-400/10 text-green-400 hover:bg-green-400/20 transition" title="Approve"><CheckCircle size={14}/></button>
                      <button onClick={()=>doAction('rejected')} className="p-1.5 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition" title="Reject"><XCircle size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setSelected(null)}>
          <div className="glass-card gradient-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-display font-bold text-lg">Application Review</h3>
              <button onClick={()=>setSelected(null)} className="text-white/40 hover:text-white"><XCircle size={20}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[['App ID',selected.id],['Name',selected.name],['CNIC',selected.cnic],['Service',selected.type],['Station',selected.station],['Date',selected.date],['Risk Level',selected.risk.toUpperCase()]].map(([k,v])=>(
                <div key={k} className="glass-card p-3">
                  <p className="text-white/30 text-xs">{k}</p>
                  <p className="text-white/80 text-sm font-medium font-mono">{v}</p>
                </div>
              ))}
            </div>

            {/* Documents */}
            <div className="glass-card p-4 mb-4">
              <p className="text-white/60 text-sm font-medium mb-3">Uploaded Documents</p>
              {['CNIC Front.jpg','CNIC Back.jpg','Profile Photo.jpg'].map(doc=>(
                <div key={doc} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2 text-sm text-white/60"><FileText size={14} className="text-cyan-400"/>{doc}</div>
                  <button className="text-cyan-400 hover:underline text-xs flex items-center gap-1"><Eye size={12}/>View</button>
                </div>
              ))}
            </div>

            {/* Recommendation */}
            <div className="mb-5">
              <label className="label-text">Officer Recommendation / Notes</label>
              <textarea className="input-field resize-none text-sm" rows={3} placeholder="Enter your assessment notes..."/>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>doAction('approved')} className="btn-success flex items-center justify-center gap-2"><CheckCircle size={16}/>Approve</button>
              <button onClick={()=>doAction('rejected')} className="btn-danger flex items-center justify-center gap-2"><XCircle size={16}/>Reject</button>
              <button className="col-span-2 btn-secondary flex items-center justify-center gap-2 text-sm"><MessageSquare size={14}/>Request Additional Documents</button>
              <button className="col-span-2 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition"><ChevronRight size={14}/>Forward to Authority</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
