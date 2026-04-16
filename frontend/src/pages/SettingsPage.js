import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Globe, Shield, User, Check, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { apiCall, user } = useAuth();
  const { locale, changeLanguage, languages, t } = useI18n();
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const handleSetupMFA = async () => {
    try {
      const data = await apiCall('post', '/auth/mfa/setup');
      setMfaSetup(data);
    } catch (e) { toast.error(e.message); }
  };

  const handleVerifyMFA = async () => {
    try {
      await apiCall('post', '/auth/mfa/verify', { code: mfaCode });
      toast.success('MFA enabled successfully');
      setMfaEnabled(true);
      setMfaSetup(null);
      setMfaCode('');
    } catch (e) { toast.error(e.message); }
  };

  const handleExportTrades = async () => {
    try {
      const token = localStorage.getItem('e4n_token');
      const resp = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reports/trades/csv`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `E4N_Trades_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Trade report downloaded');
    } catch (e) { toast.error('Export failed'); }
  };

  const handleExportCompliance = async () => {
    try {
      const token = localStorage.getItem('e4n_token');
      const resp = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reports/compliance/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `E4N_Compliance_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Compliance report downloaded');
    } catch (e) { toast.error('Export failed'); }
  };

  return (
    <div data-testid="settings-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>{t('settings.title')}</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your account, security, and preferences</p>
      </motion.div>

      {/* Profile Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><User className="w-4 h-4 text-emerald-400" />{t('settings.profile')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Name</p>
            <p className="text-sm">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Email</p>
            <p className="text-sm">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Role</p>
            <Badge variant="outline" className="text-xs border-white/10 capitalize">{user?.role}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Wallet</p>
            <p className="text-xs font-mono text-emerald-400">{user?.wallet_address}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Region</p>
            <p className="text-sm">{user?.region}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">KYC Tier</p>
            <p className="text-sm">{user?.kyc_tier}</p>
          </div>
        </div>
      </motion.div>

      {/* Language */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-400" />{t('settings.language')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {languages.map(lang => (
            <button key={lang.code} data-testid={`lang-${lang.code}`} onClick={() => changeLanguage(lang.code)}
              className={`p-3 rounded-xl text-center transition-all ${locale === lang.code ? 'glass-card-active' : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]'}`}>
              <p className="text-lg font-medium mb-0.5">{lang.flag}</p>
              <p className="text-xs text-slate-400">{lang.name}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* MFA */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-yellow-400" />{t('settings.mfa')}</h3>
        {mfaEnabled ? (
          <div className="flex items-center gap-2"><Check className="w-5 h-5 text-emerald-400" /><span className="text-sm text-emerald-400">{t('settings.mfa_enabled')}</span></div>
        ) : mfaSetup ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Copy this secret to your authenticator app:</p>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
              <code className="text-sm font-mono text-emerald-400 flex-1 break-all">{mfaSetup.secret}</code>
              <button onClick={() => { navigator.clipboard.writeText(mfaSetup.secret); toast.success('Copied'); }} className="p-1 hover:bg-white/10 rounded">
                <Copy className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Input data-testid="mfa-code-input" value={mfaCode} onChange={e => setMfaCode(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} className="glass-input bg-white/5 border-white/10 text-white w-48" />
              <Button data-testid="mfa-verify-btn" onClick={handleVerifyMFA} style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl">Verify & Enable</Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-400 mb-3">Add an extra layer of security to your account with TOTP-based two-factor authentication.</p>
            <Button data-testid="mfa-setup-btn" onClick={handleSetupMFA} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5">{t('settings.mfa_setup')}</Button>
          </div>
        )}
      </motion.div>

      {/* Export Reports */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Download className="w-4 h-4 text-emerald-400" />{t('common.export')} Reports</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button data-testid="export-trades-csv" onClick={handleExportTrades} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 justify-start gap-2">
            <Download className="w-4 h-4" />Trade History (CSV)
          </Button>
          <Button data-testid="export-carbon-csv" onClick={async () => {
            const token = localStorage.getItem('e4n_token');
            const resp = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reports/carbon-credits/csv`, { headers: { Authorization: `Bearer ${token}` } });
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'E4N_CarbonCredits.csv'; a.click();
            toast.success('Downloaded');
          }} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 justify-start gap-2">
            <Download className="w-4 h-4" />Carbon Credits (CSV)
          </Button>
          <Button data-testid="export-compliance-pdf" onClick={handleExportCompliance} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 justify-start gap-2">
            <Download className="w-4 h-4" />Compliance Report (PDF)
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
