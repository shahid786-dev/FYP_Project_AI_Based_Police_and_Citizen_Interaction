import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, Shield, Award, FileText, AlertCircle, CreditCard, Fingerprint, Activity } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useSelector } from 'react-redux';
import { notificationsAPI } from '../api/apiClient';

const NOTIF_META = {
  APPLICATION_SUBMITTED: { icon: FileText,    color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20' },
  AI_VERIFIED:           { icon: Fingerprint, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  NADRA_VERIFIED:        { icon: Shield,      color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
  CRIMINAL_CHECKED:      { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  STAFF_REVIEWED:        { icon: Activity,    color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  AUTHORITY_APPROVED:    { icon: CheckCheck,  color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20' },
  AUTHORITY_REJECTED:    { icon: AlertCircle, color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20' },
  CHALLAN_GENERATED:     { icon: CreditCard,  color: 'text-pink-400',   bg: 'bg-pink-400/10',   border: 'border-pink-400/20' },
  PAYMENT_CONFIRMED:     { icon: CreditCard,  color: 'text-emerald-400',bg: 'bg-emerald-400/10',border: 'border-emerald-400/20' },
  CERTIFICATE_READY:     { icon: Award,       color: 'text-cyan-300',   bg: 'bg-cyan-300/10',   border: 'border-cyan-300/20' },
  GENERAL:               { icon: Bell,        color: 'text-white/50',   bg: 'bg-white/5',       border: 'border-white/10' },
};

function timeAgo(dt) {
  const diff = (Date.now() - new Date(dt)) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return new Date(dt).toLocaleDateString('en-PK');
}

export default function NotificationsPage() {
  const { user } = useSelector(s => s.auth);
  const [notifs, setNotifs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');

  useEffect(() => {
    notificationsAPI.list()
      .then(r => setNotifs(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;
  const filtered = filter === 'unread' ? notifs.filter(n => !n.is_read) : notifs;

  return (
    <DashboardLayout role="citizen" userName={user?.full_name || 'Citizen'}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-3">
            <Bell size={22} className="text-cyan-400"/> Notifications
            {unreadCount > 0 && (
              <span className="w-6 h-6 rounded-full bg-cyan-400 text-[#0a1628] text-xs font-bold flex items-center justify-center">{unreadCount}</span>
            )}
          </h1>
          <p className="text-white/50 mt-1 text-sm">Stay updated on your application status</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-2 text-sm text-cyan-400 hover:text-white transition border border-cyan-400/30 px-4 py-2 rounded-xl hover:bg-cyan-400/10">
            <CheckCheck size={15}/> Mark All Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[['all','All'], ['unread','Unread']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${filter===v ? 'bg-cyan-400/20 text-cyan-400 border-cyan-400/30' : 'text-white/40 border-white/10 hover:text-white'}`}>
            {l} {v==='unread' && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Bell size={44} className="text-white/10 mx-auto mb-4"/>
          <p className="text-white/30 text-sm">{filter==='unread' ? 'All caught up! No unread notifications.' : 'No notifications yet.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(n => {
            const meta = NOTIF_META[n.notif_type] || NOTIF_META.GENERAL;
            const Icon = meta.icon;
            return (
              <div key={n.id}
                className={`glass-card p-5 flex items-start gap-4 transition cursor-pointer border ${n.is_read ? 'opacity-60' : `${meta.border}`}`}
                onClick={() => !n.is_read && markRead(n.id)}>
                <div className={`w-11 h-11 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={meta.color}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className={`font-semibold text-sm ${n.is_read ? 'text-white/60' : 'text-white'}`}>{n.title}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-cyan-400"/>}
                      <span className="text-white/30 text-xs flex items-center gap-1">
                        <Clock size={11}/>{timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className={`text-sm mt-1 ${n.is_read ? 'text-white/40' : 'text-white/60'}`}>{n.message}</p>
                  {n.reference_id && (
                    <p className="text-white/25 text-xs mt-1.5 font-mono">Ref: {n.reference_id}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
