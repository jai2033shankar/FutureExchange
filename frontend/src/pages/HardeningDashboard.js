import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, Activity, Landmark, FileCheck, Link2, Eye, Gavel, Leaf, Lock, Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function HardeningDashboard() {
  const { apiCall } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [breakers, setBreakers] = useState([]);
  const [treasury, setTreasury] = useState(null);
  const [sars, setSars] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [debtMarket, setDebtMarket] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [dash, brk, tres, sar, lch, debt, ident] = await Promise.all([
        apiCall('get', '/hardening/dashboard'),
        apiCall('get', '/guards/volatility-breakers'),
        apiCall('get', '/insurance/treasury'),
        apiCall('get', '/compliance/sar-monitor'),
        apiCall('get', '/logistics/custody-handovers'),
        apiCall('get', '/credit/debt-market'),
        apiCall('get', '/identity/profile'),
      ]);
      setDashboard(dash); setBreakers(brk); setTreasury(tres);
      setSars(sar); setHandovers(lch); setDebtMarket(debt); setIdentity(ident);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const runSARScan = async () => {
    try {
      const data = await apiCall('post', '/compliance/scan-wash-trading');
      toast.success(`Scanned ${data.scanned_trades} trades, ${data.suspicious_found} suspicious, ${data.sars_generated} SARs filed`);
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const collectFee = async () => {
    try {
      await apiCall('post', '/insurance/collect-fee?trade_value=10000');
      toast.success('Stability fee collected');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  const STATUS_COLORS = { NORMAL: '#00F298', WARNING: '#F59E0B', HALTED: '#EF4444', NOMINAL: '#00F298', DEGRADED: '#F59E0B' };

  return (
    <div data-testid="hardening-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Institutional Hardening</h1>
            <p className="text-sm text-slate-400 mt-1">Sybil resistance, dynamic breakers, decentralized oracles, insurance treasury</p>
          </div>
          <Badge className="text-xs px-3 py-1" style={{ background: `${STATUS_COLORS[dashboard?.system_health]}15`, color: STATUS_COLORS[dashboard?.system_health], border: `1px solid ${STATUS_COLORS[dashboard?.system_health]}30` }}>
            System: {dashboard?.system_health || 'UNKNOWN'}
          </Badge>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Insurance Fund', value: `$${(treasury?.balance || 0).toLocaleString()}`, icon: Landmark, color: '#00F298' },
          { label: 'SAR Reports', value: dashboard?.sar_reports_count || 0, icon: Eye, color: '#EF4444' },
          { label: 'ZK Identities', value: dashboard?.zk_identities || 0, icon: Lock, color: '#8B5CF6' },
          { label: 'Open Disputes', value: dashboard?.open_disputes || 0, icon: Gavel, color: '#F59E0B' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">{s.label}</p><p className="text-xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{s.value}</p></div>
              <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}><s.icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} /></div>
            </div>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="breakers" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 flex-wrap">
          <TabsTrigger value="breakers" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Volatility Breakers</TabsTrigger>
          <TabsTrigger value="identity" className="rounded-lg data-[state=active]:bg-white/10 text-xs">ZK Identity</TabsTrigger>
          <TabsTrigger value="insurance" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Insurance</TabsTrigger>
          <TabsTrigger value="sar" className="rounded-lg data-[state=active]:bg-white/10 text-xs">SAR Monitor</TabsTrigger>
          <TabsTrigger value="custody" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Custody Chain</TabsTrigger>
          <TabsTrigger value="debt" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Debt Market</TabsTrigger>
        </TabsList>

        {/* Volatility Breakers */}
        <TabsContent value="breakers" className="space-y-4">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" />Asset-Class Dynamic Breakers</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/10">
                  {['Asset', 'Tier', 'Price', '24h Change', 'Max Dev', 'Proximity', 'Vol. Fee', 'Status'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">{h}</th>)}
                </tr></thead>
                <tbody>
                  {breakers.map(b => (
                    <tr key={b.symbol} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm font-medium">{b.symbol}</td>
                      <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] border-white/10">{b.tier_label}</Badge></td>
                      <td className="px-4 py-2.5 text-sm">${b.current_price > 1 ? b.current_price?.toFixed(2) : b.current_price?.toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-sm">{b.current_change_pct}%</td>
                      <td className="px-4 py-2.5 text-sm">{b.max_deviation_pct}%</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(b.proximity_to_breaker_pct, 100)}%`, background: b.status === 'HALTED' ? '#EF4444' : b.status === 'WARNING' ? '#F59E0B' : '#00F298' }} />
                          </div>
                          <span className="text-xs text-slate-400">{b.proximity_to_breaker_pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{(b.volatility_adjusted_fee * 100).toFixed(2)}%</td>
                      <td className="px-4 py-2.5"><Badge style={{ background: `${STATUS_COLORS[b.status]}15`, color: STATUS_COLORS[b.status] }} className="text-[10px]">{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ZK Identity */}
        <TabsContent value="identity" className="space-y-4">
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-purple-400" />Your ZK Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Identity Hash</p>
                <p className="text-xs font-mono text-emerald-400 break-all">{identity?.identity_hash || 'Not linked'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Linked Wallets</p>
                <div className="space-y-1">
                  {(identity?.linked_wallets || []).map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Link2 className="w-3 h-3 text-slate-500" />
                      <span className="font-mono text-slate-300">{w?.slice(0, 20)}...</span>
                      {i === 0 && <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Primary</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Sybil-resistant guard aggregates holdings across all linked wallets to enforce ownership caps per entity, not per wallet.</p>
          </div>
        </TabsContent>

        {/* Insurance Treasury */}
        <TabsContent value="insurance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-xl p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Treasury Balance</p>
              <p className="text-2xl font-medium" style={{ fontFamily: 'Cabinet Grotesk', color: '#00F298' }}>${(treasury?.balance || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Stability fee: {(treasury?.stability_fee_rate || 0.005) * 100}% per trade</p>
            </div>
            <div className="glass-card rounded-xl p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Total Collected</p>
              <p className="text-2xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>${(treasury?.total_collected || 0).toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Claims Paid</p>
              <p className="text-2xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>${(treasury?.total_claims_paid || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Solvency ratio: {treasury?.solvency_ratio || 0}x</p>
            </div>
          </div>
          <Button data-testid="collect-fee-btn" onClick={collectFee} variant="outline" className="rounded-xl border-white/10 text-xs">Simulate Fee Collection ($10K trade)</Button>
        </TabsContent>

        {/* SAR Monitor */}
        <TabsContent value="sar" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2"><Eye className="w-4 h-4 text-red-400" />Suspicious Activity Reports</h3>
            <Button data-testid="run-sar-scan" onClick={runSARScan} variant="outline" className="rounded-xl border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs">
              <Radio className="w-3 h-3 mr-1" />Run Wash Trading Scan
            </Button>
          </div>
          <div className="glass-card rounded-xl divide-y divide-white/5">
            {sars.length === 0 ? <p className="p-6 text-center text-slate-500 text-sm">No SARs filed. Run a scan to detect suspicious patterns.</p> : sars.map(s => (
              <div key={s.id} className="p-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="text-[10px]" style={{ background: s.risk_level === 'HIGH' ? '#EF444415' : '#F59E0B15', color: s.risk_level === 'HIGH' ? '#EF4444' : '#F59E0B' }}>{s.risk_level}</Badge>
                    <Badge variant="outline" className="text-[10px] border-white/10">{s.pattern?.replace(/_/g, ' ')}</Badge>
                    {s.auto_generated && <Badge variant="outline" className="text-[10px] border-blue-500/20 text-blue-400">Auto-Generated</Badge>}
                  </div>
                  <p className="text-sm text-slate-300">{s.detail}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-white/10">{s.status}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Custody Chain */}
        <TabsContent value="custody" className="space-y-4">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium flex items-center gap-2"><FileCheck className="w-4 h-4 text-cyan-400" />Logistics Custody Handovers</h3></div>
            <div className="divide-y divide-white/5">
              {handovers.map(h => (
                <div key={h.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{h.asset_symbol} — {h.quantity?.toLocaleString()} units</span>
                      <Badge variant="outline" className="text-[10px] border-white/10">Grade {h.pickup_grade}</Badge>
                    </div>
                    <Badge style={{ background: h.status === 'in_transit' ? '#F59E0B15' : '#00F29815', color: h.status === 'in_transit' ? '#F59E0B' : '#00F298' }} className="text-[10px]">{h.status?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Transporter: {h.transporter_id}</span>
                    <span>Sig: {h.signature_valid ? <span className="text-emerald-400">HSM Verified</span> : <span className="text-red-400">Invalid</span>}</span>
                    <span>Liability: {h.liability_holder}</span>
                  </div>
                  {/* Chain of custody */}
                  <div className="mt-2 flex items-center gap-2">
                    {(h.chain_of_custody || []).map((c, i) => (
                      <React.Fragment key={i}>
                        <div className="px-2 py-1 rounded bg-white/5 text-[10px]">
                          <span className="text-slate-400">{c.stage}:</span> <span className="text-slate-300">{c.actor} (Grade {c.grade})</span>
                        </div>
                        {i < (h.chain_of_custody?.length || 0) - 1 && <span className="text-slate-600">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
              {handovers.length === 0 && <p className="p-6 text-center text-slate-500 text-sm">No custody handovers recorded</p>}
            </div>
          </div>
        </TabsContent>

        {/* Debt Market */}
        <TabsContent value="debt" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium mb-3">Secondary Debt Market</h3>
              <p className="text-xs text-slate-400 mb-2">Pre-harvest loans become transferable when producer reputation exceeds {debtMarket?.threshold_reputation || 80} points</p>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-white/5 text-sm"><span className="text-slate-400">Transferable Loans</span><span>{debtMarket?.transferable_loans?.length || 0}</span></div>
                <div className="flex justify-between py-1 text-sm"><span className="text-slate-400">Total Transfers</span><span>{debtMarket?.total_transfers || 0}</span></div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium mb-3">Recent Transfers</h3>
              {(debtMarket?.recent_transfers || []).length === 0 ? (
                <p className="text-xs text-slate-500">No debt transfers yet. Loans become transferable at reputation &ge; 80.</p>
              ) : (debtMarket?.recent_transfers || []).map(t => (
                <div key={t.id} className="py-2 border-b border-white/5 last:border-0 text-xs">
                  <span className="text-slate-300">{t.from_user_name}</span> <span className="text-slate-500">→</span> <span className="text-slate-300">{t.to_user_email}</span>
                  <span className="text-slate-500 ml-2">{t.asset_symbol} ({t.quantity})</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
