import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, ArrowLeftRight, Leaf, Wallet, ShieldCheck, Shield,
  TrendingUp, Settings, LogOut, X, Users, Blocks, Vote, FileCode,
  Warehouse, Calculator, FileCheck, Mail
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/trading', label: 'Trading', icon: ArrowLeftRight, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/carbon-credits', label: 'Carbon Credits', icon: Leaf, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/carbon-calculator', label: 'Carbon Calculator', icon: Calculator, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/portfolio', label: 'Portfolio', icon: Wallet, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/compliance', label: 'Compliance', icon: ShieldCheck, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/predictions', label: 'Predictions', icon: TrendingUp, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/blockchain', label: 'Blockchain', icon: Blocks, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/smart-contracts', label: 'Smart Contracts', icon: FileCode, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/governance', label: 'Governance', icon: Vote, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/warehouses', label: 'Warehouses', icon: Warehouse, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/market-guards', label: 'Market Guards', icon: Shield, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/kyc', label: 'KYC Verification', icon: FileCheck, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/emails', label: 'Email Alerts', icon: Mail, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['retail', 'institutional', 'regulator'] },
  { path: '/admin', label: 'Regulator', icon: Users, roles: ['regulator'] },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || 'retail'));

  return (
    <div className="h-full flex flex-col glass-card border-r border-white/5" style={{ background: 'rgba(11, 17, 26, 0.95)' }}>
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#00F298' }}>
            <ArrowLeftRight className="w-5 h-5" style={{ color: '#060B12' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>E4N</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Exchange</p>
          </div>
        </div>
        <button data-testid="close-sidebar-btn" onClick={onClose} className="lg:hidden p-1 rounded hover:bg-white/5">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {filteredNav.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.path.slice(1)}`}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-white/5 text-white border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : ''}`} strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium" style={{ background: '#14223A', color: '#00F298' }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{user?.role || 'retail'}</p>
          </div>
        </div>
        <button
          data-testid="logout-btn"
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
