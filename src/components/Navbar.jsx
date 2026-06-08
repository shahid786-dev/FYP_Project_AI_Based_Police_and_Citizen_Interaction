import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Menu, X, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Track Application', to: '/track' },
    { label: 'Services', to: '/#services' },
    { label: 'About', to: '/#about' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-glow-cyan">
              <Shield size={20} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-display font-bold text-sm leading-none">PakVerify</p>
              <p className="text-cyan-400 text-[10px] leading-none mt-0.5">AI Police Services</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <a
                key={l.label}
                href={l.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === l.to
                    ? 'text-cyan-400 bg-cyan-400/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="btn-secondary text-sm py-2 px-4">Login</Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-4">Apply Now</Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-navy-900/95 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex flex-col gap-2">
          {navLinks.map(l => (
            <a
              key={l.label}
              href={l.to}
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/5 text-sm font-medium"
            >
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
            <Link to="/login"    className="btn-secondary text-sm text-center" onClick={() => setOpen(false)}>Login</Link>
            <Link to="/register" className="btn-primary  text-sm text-center" onClick={() => setOpen(false)}>Apply Now</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
