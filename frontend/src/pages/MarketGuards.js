import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Shield, AlertTriangle, Scale, Leaf, Landmark, Radio, Gavel } from 'lucide-react';
import { toast } from 'sonner';

export default function MarketGuards() {
  const { apiCall } = useAuth();
  const [whaleAlerts, setWhaleAlerts] = useState([]);
  const [rfqOrders, setRfqOrders] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [esgRecords, setEsgRecords] = useState(null);
  const [loans, setLoans] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [alerts, rfq, disp, esg, loanData] = await Promise.all([
        apiCall('get', '/guards/whale-alerts'),
        apiCall('get', '/rfq/orders'),
        apiCall('get', '/disputes'),
        apiCall('get', '/esg/records'),
        apiCall('get', '/credit/pre-harvest/all'),
      ]);
      setWhaleAlerts(alerts);
      setRfqOrders(rfq);
      setDisputes(disp);
      setEsgRecords(esg);
      setLoans(loanData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // RFQ Form
  const [rfqForm, setRfqForm] = useState({ asset_symbol: 'CARBON', side: 'buy', quantity: '', max_slippage_pct: '2.0' });
  const handleRFQ = async (e) => {
    e.preventDefault();
    try {
      const result = await apiCall('post', '/rfq/request', { ...rfqForm, quantity: parseFloat(rfqForm.quantity), max_slippage_pct: parseFloat(rfqForm.max_slippage_pct) });
      if (result.status === 'CIRCUIT_BREAKER_TRIGGERED') { toast.error(`Circuit Breaker: ${result.reason}`); }
      else { toast.success('RFQ submitted to dark pool'); loadData(); }
    } catch (e) { toast.error(e.message); }
  };

  // Dispute Form
  const [disputeForm, setDisputeForm] = useState({ trade_id: '', dispute_type: 'quality', description: '' });
  const handleDispute = async (e) => {
    e.preventDefault();
    try {
      await apiCall('post', '/disputes', disputeForm);
      toast.success('Dispute filed');
      setDisputeForm({ trade_id: '', dispute_type: 'quality', description: '' });
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  // ESG Form
  const [esgForm, setEsgForm] = useState({ distance_km: '500', transport_mode: 'road', weight_tonnes: '10' });
  const handleESG = async (e) => {
    e.preventDefault();
    try {
      const result = await apiCall('post', `/esg/trade-footprint?distance_km=${esgForm.distance_km}&transport_mode=${esgForm.transport_mode}&weight_tonnes=${esgForm.weight_tonnes}`);
      toast.success(`Footprint: ${result.footprint_kg_co2} kg CO2 | Offset: $${result.offset_cost_usd}`);
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  const STATUS_COLORS = { open: '#F59E0B', under_review: '#3B82F6', resolved: '#00F298', BLOCKED: '#EF4444', TAXED: '#F59E0B', CLEAR: '#00F298' };

  return (
    <div data-testid="market-guards-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Market Guards & Institutional Tools</h1>
        <p className="text-sm text-slate-400 mt-1">Anti-hoarding protections, RFQ dark pool, dispute resolution, ESG tracking</p>
      </motion.div>

      <Tabs defaultValue="guards" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
          <TabsTrigger value="guards" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Concentration Guard</TabsTrigger>
          <TabsTrigger value="rfq" className="rounded-lg data-[state=active]:bg-white/10 text-xs">RFQ / Dark Pool</TabsTrigger>
          <TabsTrigger value="loans" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Pre-Harvest</TabsTrigger>
          <TabsTrigger value="disputes" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Disputes</TabsTrigger>
          <TabsTrigger value="esg" className="rounded-lg data-[state=active]:bg-white/10 text-xs">ESG Tracker</TabsTrigger>
        </TabsList>

        {/* Concentration Guard Tab */}
        <TabsContent value="guards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-xl p-5">
              <Shield className="w-5 h-5 text-emerald-400 mb-3" />
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Ownership Cap</p>
              <p className="text-2xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>5%</p>
              <p className="text-xs text-slate-500 mt-1">Max supply per non-sovereign entity</p>
            </div>
            <div className="glass-card rounded-xl p-5">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mb-3" />
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Hoarding Threshold</p>
              <p className="text-2xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>2%</p>
              <p className="text-xs text-slate-500 mt-1">Storage fee applies above threshold</p>
            </div>
            <div className="glass-card rounded-xl p-5">
              <Radio className="w-5 h-5 text-red-400 mb-3" />
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">Whale Alerts</p>
              <p className="text-2xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{whaleAlerts.length}</p>
              <p className="text-xs text-slate-500 mt-1">Large accumulation events detected</p>
            </div>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium">Whale Alert Log</h3></div>
            <div className="divide-y divide-white/5">
              {whaleAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-sm">{alert.asset} — {alert.ownership_pct}% ownership detected</p>
                      <p className="text-xs text-slate-500">{alert.description || `Balance: ${alert.balance?.toLocaleString()}`}</p>
                    </div>
                  </div>
                  <Badge style={{ background: `${STATUS_COLORS[alert.status]}15`, color: STATUS_COLORS[alert.status] }} className="text-xs">{alert.status || 'alert'}</Badge>
                </div>
              ))}
              {whaleAlerts.length === 0 && <p className="p-6 text-center text-slate-500 text-sm">No whale alerts</p>}
            </div>
          </div>
        </TabsContent>

        {/* RFQ / Dark Pool Tab */}
        <TabsContent value="rfq" className="space-y-4">
          <div className="glass-card-active rounded-xl p-6">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Landmark className="w-4 h-4 text-blue-400" />Request for Quote (Orders > $500K)</h3>
            <form onSubmit={handleRFQ} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Asset</label>
                <Select value={rfqForm.asset_symbol} onValueChange={v => setRfqForm({...rfqForm, asset_symbol: v})}>
                  <SelectTrigger className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0B111A] border-white/10">
                    {['CARBON', 'WHEAT', 'RICE', 'KWH', 'H2O'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Quantity</label>
                <Input data-testid="rfq-quantity" type="number" value={rfqForm.quantity} onChange={e => setRfqForm({...rfqForm, quantity: e.target.value})} placeholder="15000" className="glass-input bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Max Slippage %</label>
                <Input type="number" step="0.1" value={rfqForm.max_slippage_pct} onChange={e => setRfqForm({...rfqForm, max_slippage_pct: e.target.value})} className="glass-input bg-white/5 border-white/10 text-white" />
              </div>
              <div className="flex items-end">
                <Button data-testid="rfq-submit-btn" type="submit" style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl w-full">Submit RFQ</Button>
              </div>
            </form>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium">Dark Pool Orders</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/10">
                  {['Asset', 'Side', 'Quantity', 'Notional', 'Quotes', 'Slippage', 'Status'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">{h}</th>)}
                </tr></thead>
                <tbody>
                  {rfqOrders.map(o => (
                    <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm font-medium">{o.asset_symbol}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs ${o.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>{o.side?.toUpperCase()}</span></td>
                      <td className="px-4 py-2.5 text-sm">{o.quantity?.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-sm">${o.notional?.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-sm">{o.quotes?.length || 0}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{o.slippage_estimate}%</td>
                      <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs border-white/10">{o.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Pre-Harvest Tab */}
        <TabsContent value="loans" className="space-y-4">
          {loans && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Active Loans', value: loans.stats?.active_loans || 0 },
                  { label: 'Total Value', value: `$${(loans.stats?.total_value || 0).toLocaleString()}` },
                  { label: 'Avg Rate', value: `${loans.stats?.avg_interest_rate || 0}%` },
                  { label: 'Total Loans', value: loans.stats?.total_loans || 0 },
                ].map(s => (
                  <div key={s.label} className="glass-card rounded-xl p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">{s.label}</p>
                    <p className="text-xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium">Pre-Harvest Financing Loans</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-white/10">
                      {['Borrower', 'Asset', 'Quantity', 'Value', 'Rate', 'Repayment', 'Status'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(loans.loans || []).map(l => (
                        <tr key={l.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 text-sm">{l.borrower_name}</td>
                          <td className="px-4 py-2.5 text-sm">{l.asset_symbol}</td>
                          <td className="px-4 py-2.5 text-sm">{l.quantity?.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-sm">${l.loan_value_usd?.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-sm">{(l.interest_rate * 100).toFixed(1)}%</td>
                          <td className="px-4 py-2.5 text-sm">${l.total_repayment?.toLocaleString()}</td>
                          <td className="px-4 py-2.5"><Badge variant="outline" className={`text-xs ${l.status === 'active' ? 'border-emerald-500/20 text-emerald-400' : 'border-white/10'}`}>{l.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-4">
          <div className="glass-card-active rounded-xl p-6">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Gavel className="w-4 h-4 text-yellow-400" />File New Dispute</h3>
            <form onSubmit={handleDispute} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Trade ID</label>
                <Input data-testid="dispute-trade-id" value={disputeForm.trade_id} onChange={e => setDisputeForm({...disputeForm, trade_id: e.target.value})} placeholder="trade-xxx" className="glass-input bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Type</label>
                <Select value={disputeForm.dispute_type} onValueChange={v => setDisputeForm({...disputeForm, dispute_type: v})}>
                  <SelectTrigger className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0B111A] border-white/10">
                    {['force_majeure', 'quality', 'delivery_failure', 'fraud'].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button data-testid="dispute-submit-btn" type="submit" variant="outline" className="rounded-xl border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 w-full">File Dispute</Button>
              </div>
            </form>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="text-sm font-medium">Active Disputes</h3></div>
            <div className="divide-y divide-white/5">
              {disputes.map(d => (
                <div key={d.id} className="p-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] border-white/10">{d.dispute_type?.replace(/_/g, ' ')}</Badge>
                      {d.paused_in_transit && <Badge className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Paused in Transit</Badge>}
                      {d.assets_frozen && <Badge className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">Assets Frozen</Badge>}
                    </div>
                    <p className="text-sm">{d.description}</p>
                    <p className="text-xs text-slate-500 mt-1">Filed by {d.initiator_name} - {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</p>
                  </div>
                  <Badge style={{ background: `${STATUS_COLORS[d.status]}15`, color: STATUS_COLORS[d.status] }} className="text-xs flex-shrink-0">{d.status}</Badge>
                </div>
              ))}
              {disputes.length === 0 && <p className="p-6 text-center text-slate-500 text-sm">No disputes</p>}
            </div>
          </div>
        </TabsContent>

        {/* ESG Tab */}
        <TabsContent value="esg" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card-active rounded-xl p-6">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Leaf className="w-4 h-4 text-emerald-400" />Calculate Trade Footprint</h3>
              <form onSubmit={handleESG} className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Distance (km)</label>
                  <Input type="number" value={esgForm.distance_km} onChange={e => setEsgForm({...esgForm, distance_km: e.target.value})} className="glass-input bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Transport Mode</label>
                  <Select value={esgForm.transport_mode} onValueChange={v => setEsgForm({...esgForm, transport_mode: v})}>
                    <SelectTrigger className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0B111A] border-white/10">
                      {[['road', 'Road (0.062 kg/t-km)'], ['rail', 'Rail (0.022 kg/t-km)'], ['sea', 'Sea (0.008 kg/t-km)'], ['air', 'Air (0.602 kg/t-km)']].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Weight (tonnes)</label>
                  <Input type="number" value={esgForm.weight_tonnes} onChange={e => setEsgForm({...esgForm, weight_tonnes: e.target.value})} className="glass-input bg-white/5 border-white/10 text-white" />
                </div>
                <Button data-testid="esg-calculate-btn" type="submit" style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl w-full">Calculate Footprint</Button>
              </form>
            </div>
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-sm font-medium mb-4">ESG Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400">Total Footprint</span>
                  <span className="text-sm font-medium" style={{ color: '#00F298' }}>{esgRecords?.total_footprint_tonnes || 0} tCO2e</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400">Total Offset Cost</span>
                  <span className="text-sm font-medium">${esgRecords?.total_offset_cost || 0}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-slate-400">Records</span>
                  <span className="text-sm font-medium">{esgRecords?.records?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
