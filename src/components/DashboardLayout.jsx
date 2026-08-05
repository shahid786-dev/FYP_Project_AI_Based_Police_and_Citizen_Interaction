import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Shield, Home, FileText, Search, CreditCard, Award,
  Bell, LogOut, Menu, X, User, ChevronRight, Settings,
  Database, BarChart2, Users, Clock
} from 'lucide-react';
import { logout } from '../store/authSlice';

const citizenNav = [
  { icon: Home,      label: 'Dashboard',    to: '/citizen/dashboard' },
  { icon: FileText,  label: 'New Request',  to: '/citizen/request' },
  { icon: Search,    label: 'Track Status', to: '/track' },
  { icon: CreditCard,label: 'Payments',     to: '/citizen/payment' },
  { icon: Award,     label: 'Certificates', to: '/citizen/certificate' },
  { icon: Bell,      label: 'Notifications',to: '/citizen/notifications' },
  { icon: Database,  label: 'Blockchain',   to: '/blockchain' },
];

const staffNav = [
  { icon: Home,      label: 'Dashboard',      to: '/staff/dashboard' },
  { icon: Clock,     label: 'Review Queue',   to: '/staff/dashboard' },
  { icon: Database,  label: 'Blockchain',     to: '/blockchain' },
];

const authorityNav = [
  { icon: Home,      label: 'Dashboard',       to: '/authority/dashboard' },
  { icon: FileText,  label: 'Applications',    to: '/authority/dashboard' },
  { icon: Users,     label: 'Staff Mgmt',      to: '/authority/dashboard' },
  { icon: BarChart2, label: 'Analytics',       to: '/authority/dashboard' },
  { icon: Database,  label: 'Blockchain',      to: '/blockchain' },
];

const adminNav = [
  { icon: Home,      label: 'Overview',     to: '/admin/dashboard' },
  { icon: Users,     label: 'Police Staff', to: '/admin/dashboard' },
  { icon: FileText,  label: 'Applications', to: '/admin/dashboard' },
  { icon: Database,  label: 'Blockchain',   to: '/blockchain' },
  { icon: Settings,  label: 'System Logs',  to: '/admin/dashboard' },
];

export default function DashboardLayout({ children, role = 'citizen', userName = 'User' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const dispatch  = useDispatch();

  const nav = role === 'staff'     ? staffNav
            : role === 'authority' ? authorityNav
            : role === 'police'    ? authorityNav   // legacy fallback
            : role === 'admin'     ? adminNav
            : citizenNav;

  const roleLabel = role === 'staff'     ? 'Police Staff'
                  : role === 'authority' ? 'Police Authority'
                  : role === 'police'    ? 'Police Portal'
                  : role === 'admin'     ? 'Administrator'
                  : 'Citizen';

  const roleColor = role === 'staff'     ? 'from-blue-600 to-indigo-700'
                  : role === 'authority' ? 'from-cyan-500 to-blue-600'
                  : role === 'police'    ? 'from-cyan-500 to-blue-600'
                  : role === 'admin'     ? 'from-purple-600 to-indigo-700'
                  : 'from-cyan-500 to-blue-600';

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="page-bg min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-navy-950/95 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleColor} flex items-center justify-center shadow-glow-cyan`}>
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-display font-bold text-sm">PakVerify</p>
            <p className="text-white/40 text-xs">{roleLabel} Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="glass-card p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{userName}</p>
              <p className="text-white/40 text-xs">{roleLabel}</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {nav.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-link ${location.pathname === item.to ? 'active' : ''}`}
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={18} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-navy-950/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5">
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-1 text-sm text-white/40">
              <span>Portal</span>
              <ChevronRight size={14} />
              <span className="text-white/70">{roleLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {role === 'citizen' && (
              <Link to="/citizen/notifications"
                className="relative p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full" />
              </Link>
            )}
            <Link to="/blockchain"
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition">
              <Database size={18} />
            </Link>
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center text-white text-xs font-bold`}>
              {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
