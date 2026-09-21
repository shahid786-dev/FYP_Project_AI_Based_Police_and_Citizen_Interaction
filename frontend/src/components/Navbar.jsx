import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AlertTriangle, Menu, X, UserCheck, LogOut,
  ChevronDown, Phone
} from 'lucide-react';
import { logout } from '../store/authSlice';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  {
    label: 'Services', dropdown: true,
    items: [
      { to: '/citizen/request', label: 'Police Verification', desc: 'Apply for character certificate' },
      { to: '/report-crime', label: 'Report Crime', desc: 'File snatching / FIR complaints' },
      { to: '/women-safety', label: 'Women Safety', desc: 'Confidential safety reporting' },
      { to: '/accident-assistance', label: 'Accident Help', desc: 'Road accident & medical aid' },
      { to: '/criminal-records', label: 'Criminal Records', desc: 'Search criminal database' },
    ],
  },
  { to: '/track', label: 'Track Status' },
  { to: '/blockchain', label: 'Blockchain Ledger' },
];

// Pakistan Police Badge SVG Logo
const PoliceBadge = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon
      points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
      fill="url(#navStarGrad)"
      stroke="#f59e0b"
      strokeWidth="2"
    />
    <circle cx="50" cy="50" r="22" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="1.5" />
    <path d="M43 42 A10 10 0 1 1 57 58 A8 8 0 1 0 43 42Z" fill="#f59e0b" />
    <polygon points="50,35 52,44 61,44 54,49 57,58 50,53 43,58 46,49 39,44 48,44" fill="#f59e0b" />
    <defs>
      <linearGradient id="navStarGrad" x1="0" y1="0" x2="100" y2="100">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="100%" stopColor="#0f2848" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, role } = useSelector((s) => s.auth);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); setActiveDropdown(null); }, [location]);

  const getDashboardPath = () => {
    if (role === 'POLICE_AUTHORITY') return '/authority/dashboard';
    if (role === 'POLICE_STAFF') return '/staff/dashboard';
    if (role === 'SUPER_ADMIN') return '/admin/dashboard';
    return '/citizen/dashboard';
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-slate-950/98 backdrop-blur-2xl shadow-2xl shadow-black/40 border-b border-slate-800/80'
        : 'bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/40'
    }`}>

      {/* Top Government Strip */}
      <div className="bg-gradient-to-r from-emerald-900/90 via-emerald-800/80 to-emerald-900/90 border-b border-emerald-700/40 py-1.5 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-emerald-200 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5">
              <span className="text-base">&#x1F1F5;&#x1F1F0;</span>
              Islamic Republic of Pakistan &mdash; Government Official Portal
            </span>
          </div>
          <div className="flex items-center gap-4 text-emerald-300 text-[10px] font-semibold">
            <span className="flex items-center gap-1">
              <Phone size={10} />
              Emergency: 15 | 1122 | 115
            </span>
            <span className="w-px h-3 bg-emerald-700" />
            <span className="text-emerald-400">support@pakverify.gov.pk</span>
          </div>
        </div>
      </div>

      {/* Alert Bar */}
      <div className="bg-gradient-to-r from-red-900/80 via-red-800/70 to-red-900/80 border-b border-red-700/30 py-1 px-4 text-center hidden md:block">
        <p className="text-red-200 text-[10px] font-semibold tracking-wide uppercase flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse inline-block" />
          For Life-Threatening Emergencies &mdash; Dial 15 (Police) | 1122 (Rescue) | 115 (Edhi) | 1099 (Women Helpline)
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse inline-block" />
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[70px]">

          {/* Logo — Police Badge + PakVerify */}
          <Link to="/" className="flex items-center gap-3 group shrink-0" id="nav-logo">
            {/* Police Badge */}
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 shadow-lg shadow-amber-500/10 group-hover:border-amber-400/60 transition-all duration-200 group-hover:scale-105">
              <PoliceBadge size={32} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
            </div>

            {/* Text */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-xl tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Pak<span className="text-amber-400">Verify</span>
                </span>
                <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-emerald-900/60 border border-emerald-500/30 text-[9px] font-bold text-emerald-300 tracking-widest uppercase">
                  Gov
                </span>
                <span className="hidden md:inline px-1.5 py-0.5 rounded-md bg-blue-900/60 border border-blue-500/30 text-[9px] font-bold text-blue-300 tracking-widest uppercase">
                  Official
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-medium tracking-wide hidden sm:block">
                National Police Verification Portal &middot; Pakistan Police
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map((link, i) =>
              link.dropdown ? (
                <div key={i} className="relative" onMouseLeave={() => setActiveDropdown(null)}>
                  <button
                    onMouseEnter={() => setActiveDropdown(i)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                      activeDropdown === i ? 'text-amber-400 bg-amber-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {link.label}
                    <ChevronDown size={12} className={`transition-transform duration-200 ${activeDropdown === i ? 'rotate-180' : ''}`} />
                  </button>
                  {activeDropdown === i && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900/98 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/60 p-2 z-50">
                      {link.items.map((item, j) => (
                        <Link
                          key={j}
                          to={item.to}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-800/60 transition-all duration-150 group"
                        >
                          <div>
                            <p className="text-white text-xs font-bold group-hover:text-amber-400 transition-colors">{item.label}</p>
                            <p className="text-slate-500 text-[10px] mt-0.5">{item.desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={i}
                  to={link.to}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                    location.pathname === link.to
                      ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          {/* Right Side CTAs */}
          <div className="hidden md:flex items-center gap-2">
            {/* Emergency SOS */}
            <Link
              to="/emergency-sos"
              id="nav-sos-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-900/40 hover:scale-105 active:scale-95 transition-all duration-200 border border-red-400/30 relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <AlertTriangle size={14} className="text-amber-200" />
              <span>SOS</span>
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to={getDashboardPath()}
                  id="nav-dashboard-btn"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all duration-200 border border-blue-400/30 shadow-md"
                >
                  <UserCheck size={14} />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={() => dispatch(logout())}
                  title="Logout"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-900/40 text-slate-400 hover:text-red-300 border border-slate-700/60 transition-all duration-200"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  id="nav-login-btn"
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 text-xs font-semibold transition-all duration-200 border border-slate-700/60"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  id="nav-register-btn"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all duration-200 shadow-lg shadow-amber-500/25"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            id="nav-menu-btn"
            className="lg:hidden p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all duration-200 border border-slate-700/50"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {open && (
        <div className="lg:hidden bg-slate-950/99 backdrop-blur-2xl border-b border-slate-800 px-4 pt-4 pb-6 flex flex-col gap-3 shadow-2xl">

          {/* Police Logo Mobile */}
          <div className="flex items-center gap-3 px-2 py-3 bg-slate-900/60 rounded-2xl border border-slate-800/60">
            <PoliceBadge size={36} />
            <div>
              <p className="text-white font-black text-sm">Pakistan Police</p>
              <p className="text-slate-500 text-[10px]">National Verification Portal</p>
            </div>
          </div>

          {/* Emergency Banner */}
          <Link
            to="/emergency-sos"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-sm uppercase tracking-wider text-center border border-red-400/30 shadow-lg shadow-red-900/30"
          >
            <AlertTriangle size={18} />
            <span>EMERGENCY SOS</span>
          </Link>

          {/* Nav Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {[
              { to: '/', label: 'Home' },
              { to: '/about', label: 'About Us' },
              { to: '/citizen/request', label: 'Verification' },
              { to: '/report-crime', label: 'Report Crime' },
              { to: '/women-safety', label: 'Women Safety', cls: 'text-pink-300 border-pink-900/30' },
              { to: '/accident-assistance', label: 'Accident Help', cls: 'text-emerald-300 border-emerald-900/30' },
              { to: '/track', label: 'Track Status' },
              { to: '/criminal-records', label: 'Criminal DB', cls: 'text-orange-300 border-orange-900/30' },
              { to: '/blockchain', label: 'Blockchain' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`p-3 rounded-xl bg-slate-900/80 text-slate-200 text-xs font-semibold text-center border border-slate-800/60 hover:border-amber-500/30 transition-all ${item.cls || ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-800/60">
            {isAuthenticated ? (
              <>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setOpen(false)}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm text-center hover:bg-blue-500 transition-colors"
                >
                  Access Dashboard
                </Link>
                <button
                  onClick={() => { dispatch(logout()); setOpen(false); }}
                  className="w-full py-3 rounded-xl bg-slate-800/80 text-red-400 font-semibold text-sm border border-slate-700/50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="py-3 rounded-xl bg-slate-800/80 text-white font-semibold text-sm text-center border border-slate-700/50"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="py-3 rounded-xl bg-amber-500 text-slate-950 font-black text-sm text-center"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
