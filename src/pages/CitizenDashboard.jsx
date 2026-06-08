import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle, XCircle, Bell, ChevronRight,
  Plus, Search, Award, Shield, User, AlertTriangle, Eye,
  TrendingUp, Calendar
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const APPS = [
  { id: 'PV-2025-0041', type: 'Character Certificate', date: '2025-05-01', status: 'approved',   station: 'Gulberg Police Station' },
  { id: 'PV-2025-0038', type: 'Tenant Verification',   date: '2025-04-28', status: 'review',     station: 'DHA Phase 5 Station' },
  { id: 'PV-2025-0031', type: 'Employee Verification', date: '2025-04-15', status: 'pending',    station: 'Model Town Station' },
  { id: 'PV-2025-0022', type: 'Passport Clearance',    date: '2025-03-20', status: 'completed',  station: 'Cantt Police Station' },
  { id: 'PV-2025-0011', type: 'Arms License Check',    date: '2025-02-10', status: 'rejected',   station: 'Johar Town Station' },
];

const ACTIVITY_DATA = [
  { month: 'Jan', apps: 1 }, { month: 'Feb', apps: 2 }, { month: 'Mar', apps: 1 },
  { month: 'Apr', apps: 3 }, { month: 'May', apps: 2 },
];

const NOTIFICATIONS = [
  { icon: CheckCircle, color: 'text-green-400', text: 'Character Certificate approved!', time: '2 hrs ago' },
  { icon: Bell,        color: 'text-yellow-400', text: 'Additional documents requested for PV-0038', time: '1 day ago' },
  { icon: Shield,      color: 'text-cyan-400',   text: 'AI verification complete for PV-0031', time: '2 days ago' },
  { icon: AlertTriangle,color:'text-orange-400', text: 'Payment pending for PV-0038', time: '3 days ago' },
];

const SERVICES = [
  { icon: FileText, label: 'Character Certificate', color: 'from-cyan-500 to-blue-600' },
  { icon: User,     label: 'Tenant Verification',   color: 'from-blue-500 to-indigo-600' },
  { icon: Shield,   label: 'Employee Verification', color: 'from-indigo-500 to-purple-600' },
  { icon: Search,   label: 'General Verification',  color: 'from-purple-500 to-pink-600' },
  { icon: Award,    label: 'Arms License',           color: 'from-pink-500 to-red-500' },
  { icon: Eye,      label: 'Passport Clearance',     color: 'from-orange-500 to-amber-500' },
];

const StatusBadge = ({ status }) => {
  const map = {
    pending:   { cls: 'status-pending',   label: 'Pending' },
    approved:  { cls: 'status-approved',  label: 'Approved' },
    rejected:  { cls: 'status-rejected',  label: 'Rejected' },
    review:    { cls: 'status-review',    label: 'Under Review' },
    completed: { cls: 'status-completed', label: 'Completed' },
  };
  const s = map[status] || map.pending;
  return <span className={s.cls}>{s.label}</span>;
};

export default function CitizenDashboard() {
  const [activeTab, setActiveTab] = useState('all');

  const filtered = activeTab === 'all' ? APPS : APPS.filter(a => a.status === activeTab);

  return (
    <DashboardLayout role="citizen" userName="Tahir Raza">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Welcome back, <span className="neon-text-subtle">Tahir!</span> 👋
          </h1>
          <p className="text-white/50 mt-1 text-sm">Here's your verification portal overview.</p>
        </div>
        <Link to="/citizen/request" className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus size={18} /> New Request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: FileText,    label: 'Total Applications', value: '5',  color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
          { icon: CheckCircle, label: 'Approved',           value: '2',  color: 'text-green-400',  bg: 'bg-green-400/10' },
          { icon: Clock,       label: 'Pending',            value: '2',  color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { icon: Award,       label: 'Certificates',       value: '2',  color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map((s, i) => (
          <div key={i} className="glass-card p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Services quick access */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">Quick Services</h2>
              <span className="text-white/30 text-xs">Select to apply</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SERVICES.map((s, i) => (
                <Link to="/citizen/request" key={i}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/5 hover:border-cyan-400/20 hover:bg-white/5 transition-all duration-200 group cursor-pointer text-center">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center group-hover:scale-110 transition`}>
                    <s.icon size={20} className="text-white" />
                  </div>
                  <span className="text-white/60 text-xs font-medium group-hover:text-white transition leading-tight">{s.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Bell size={16} className="text-cyan-400" /> Notifications
            </h2>
            <span className="status-badge bg-cyan-400/20 text-cyan-400 border border-cyan-400/30">4 New</span>
          </div>
          <div className="flex flex-col gap-3">
            {NOTIFICATIONS.map((n, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition cursor-pointer">
                <n.icon size={16} className={`${n.color} mt-0.5 flex-shrink-0`} />
                <div className="min-w-0">
                  <p className="text-white/70 text-xs leading-relaxed">{n.text}</p>
                  <p className="text-white/30 text-xs mt-1">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={18} className="text-cyan-400" />
          <h2 className="text-white font-semibold">Application Activity</h2>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={ACTIVITY_DATA}>
            <defs>
              <linearGradient id="cyan-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '12px', color: '#fff' }} />
            <Area type="monotone" dataKey="apps" stroke="#00d4ff" strokeWidth={2} fill="url(#cyan-grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Application History */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Calendar size={16} className="text-cyan-400" /> Application History
          </h2>
          <div className="flex gap-2 flex-wrap">
            {['all','pending','review','approved','rejected'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab===t ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' : 'text-white/40 hover:text-white'}`}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Application ID</th><th>Service Type</th><th>Date</th><th>Police Station</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, i) => (
                <tr key={i}>
                  <td className="font-mono text-cyan-400 text-xs">{app.id}</td>
                  <td>{app.type}</td>
                  <td className="text-white/50">{app.date}</td>
                  <td className="text-white/50 text-xs">{app.station}</td>
                  <td><StatusBadge status={app.status} /></td>
                  <td>
                    <Link to="/track" className="flex items-center gap-1 text-cyan-400 text-xs hover:underline">
                      Track <ChevronRight size={12}/>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
