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
  AudioLines,
  Eye,
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
    { label: 'Caller Intel', path: '/caller-intelligence', icon: Fingerprint },
    { label: 'Fraud Shield', path: '/fraud-prevention', icon: Shield },
    { label: 'Fraud Detect', path: '/fraud-detection', icon: Eye },
    { label: 'PBX Trunks', path: '/trunks', icon: PhoneCall },
    { label: 'Audio Report', path: '/audio-report', icon: AudioLines },
    { label: 'Security', path: '/security', icon: Lock },
    { label: 'Technology', path: '/features', icon: Cpu },
  ];

  const SECONDARY_NAV: { label: string; path: string; icon: any }[] = [];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-xs'
            : 'bg-white border-b border-gray-100'
        }`}
      >
        <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16 gap-2 xl:gap-4">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2 lg:gap-2.5 group flex-shrink-0">
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 p-0.5 shadow-xs group-hover:scale-105 transition-all duration-200">
                <div className="w-full h-full bg-white rounded-[7px] flex items-center justify-center">
                  <Shield className="w-4 h-4 lg:w-4.5 lg:h-4.5 text-slate-900" />
                </div>
              </div>
              <div className="flex flex-col hidden sm:block whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm lg:text-base font-bold tracking-tight text-slate-900">
                    VoiceShield AI
                  </span>
                  <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 font-bold">
                    LIVE
                  </span>
                </div>
                <span className="text-[9px] font-medium text-slate-500 leading-none">
                  Real-Time Voice Security
                </span>
              </div>
            </Link>

            {/* Desktop Center Navigation */}
            <div className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-1 justify-center max-w-4xl px-1">
              {PRIMARY_NAV.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-2 py-1 xl:px-2.5 xl:py-1.5 rounded-md text-[11px] xl:text-[12.5px] font-medium whitespace-nowrap transition-all duration-150 ${
                      active
                        ? 'text-slate-900 bg-slate-100 border border-slate-200 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right Actions */}
            <div className="hidden md:flex items-center gap-1.5 xl:gap-2.5 flex-shrink-0">
              {isAuthenticated ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link
                    to="/investigation"
                    className="px-2.5 py-1 rounded-md hover:bg-red-50 text-red-600 transition-colors flex items-center gap-1 text-[11px] xl:text-xs font-semibold whitespace-nowrap border border-red-100"
                    title="Investigation Center"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Investigation</span>
                  </Link>
                  <Link
                    to="/profile"
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Profile"
                  >
                    <User className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 xl:gap-2 flex-shrink-0">
                  <Link
                    to="/signin"
                    className="px-2.5 py-1 text-[11px] xl:text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/detect"
                    className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] xl:text-xs hover:shadow-sm transition-all flex items-center gap-1 group whitespace-nowrap shadow-xs"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-14 lg:top-16 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed top-14 lg:top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-40 lg:hidden animate-fade-in-down">
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
                  <Link
                    to="/investigation"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Investigation Center
                  </Link>
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
      <div className="h-14 lg:h-16" />
    </>
  );
};
