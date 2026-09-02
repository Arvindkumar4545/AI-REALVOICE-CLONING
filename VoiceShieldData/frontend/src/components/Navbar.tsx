import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  Activity,
  Mic,
  Fingerprint,
  PhoneCall,
  Flame,
  FileText,
  Sliders,
  Cpu,
  Info,
  Layers,
  Lock,
  Briefcase,
  Menu,
  X,
  User,
  LogOut,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const PRIMARY_NAV = [
    { label: 'Detection', path: '/detect', icon: Mic },
    { label: 'Technology', path: '/features', icon: Cpu },
    { label: 'How It Works', path: '/how-it-works', icon: Activity },
    { label: 'Security', path: '/security', icon: Lock },
  ];

  const SECONDARY_NAV = [
    { label: 'Documentation', path: '/about', icon: FileText },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm'
            : 'bg-white border-b border-gray-200/30'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-0.5 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
                  <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-slate-900" />
                </div>
              </div>
              <div className="flex flex-col hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="text-base lg:text-lg font-black tracking-tight text-slate-900">
                    VoiceShield AI
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-700 font-bold">
                    LIVE
                  </span>
                </div>
                <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                  Real-Time Voice Security
                </span>
              </div>
            </Link>

            {/* Desktop Center Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {PRIMARY_NAV.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'text-slate-900 bg-slate-100 border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right Actions */}
            <div className="hidden md:flex items-center gap-3">
              {SECONDARY_NAV.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}

              <div className="w-px h-6 bg-slate-200" />

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  {user && ['admin', 'investigator', 'law_enforcement'].includes(user.role) && (
                    <Link
                      to="/investigation"
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      title="Investigation Center"
                    >
                      <ShieldAlert className="w-5 h-5" />
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Profile"
                  >
                    <User className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/detect"
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-2 group"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-40 lg:hidden animate-fade-in-down">
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-2">
            {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    active
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-slate-200 space-y-2">
              {isAuthenticated ? (
                <>
                  {user && ['admin', 'investigator', 'law_enforcement'].includes(user.role) && (
                    <Link
                      to="/investigation"
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                    >
                      <ShieldAlert className="w-5 h-5" />
                      <span>Investigation Center</span>
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
                  >
                    <User className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className="block text-center px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/detect"
                    className="block text-center px-4 py-3 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold hover:shadow-lg transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spacer to prevent content overlap */}
      <div className="h-16 lg:h-20" />
    </>
  );
};
