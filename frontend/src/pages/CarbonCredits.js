import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Leaf, ShieldCheck, Plus, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  verified: '#00F298', pending: '#F59E0B', issued: '#3B82F6', retired: '#8E9EAD',
};
const PROJECT_TYPES = ['forestry', 'renewable_energy', 'methane_capture', 'energy_efficiency', 'blue_carbon', 'other'];
const REGIONS = ['EU', 'US', 'APAC', 'AFRICA', 'LATAM'];

export default function CarbonCredits() {
  const { apiCall, user } = useAuth();
  const [credits, setCredits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Create form
  const [form, setForm] = useState({
    project_name: '', project_type: 'forestry', quantity_tonnes: '',
    vintage_year: new Date().getFullYear(), region: 'EU', methodology: '', description: ''
  });

  // Exchange form
  const [exchangeCredit, setExchangeCredit] = useState(null);
  const [exchangeQty, setExchangeQty] = useState('');
  const [exchangePrice, setExchangePrice] = useState('');

  useEffect(() => { loadData(); }, [filterRegion, filterStatus]);

  const loadData = async () => {
    try {
      let url = '/carbon-credits?';
      if (filterRegion) url += `region=${filterRegion}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      const [creditsData, statsData] = await Promise.all([
        apiCall('get', url),
        apiCall('get', '/carbon-credits/stats'),
      ]);
      setCredits(creditsData);
      setStats(statsData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiCall('post', '/carbon-credits', {
        ...form,
        quantity_tonnes: parseFloat(form.quantity_tonnes),
        vintage_year: parseInt(form.vintage_year),
      });
      toast.success('Carbon credit project submitted');
      setShowCreate(false);
      setForm({ project_name: '', project_type: 'forestry', quantity_tonnes: '', vintage_year: new Date().getFullYear(), region: 'EU', methodology: '', description: '' });
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const handleVerify = async (creditId) => {
    try {
      await apiCall('put', `/carbon-credits/${creditId}/verify`);
      toast.success('Carbon credit verified');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const handleRetire = async (creditId) => {
    try {
      await apiCall('post', `/carbon-credits/${creditId}/retire`);
      toast.success('Carbon credit retired');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const handleExchange = async () => {
    if (!exchangeCredit || !exchangeQty || !exchangePrice) return;
    try {
      await apiCall('post', '/carbon-credits/exchange', {
        credit_id: exchangeCredit.id,
        quantity_tonnes: parseFloat(exchangeQty),
        price_per_tonne: parseFloat(exchangePrice),
        settlement_token: 'USD',
      });
      toast.success('Carbon credit exchange completed');
      setExchangeCredit(null);
      setExchangeQty('');
      setExchangePrice('');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const regionChartData = (stats?.by_region || []).map(r => ({ name: r.region, value: r.total_tonnes }));
  const typeChartData = (stats?.by_type || []).map(t => ({ name: t.type?.replace(/_/g, ' '), value: t.total_tonnes }));
  const PIE_COLORS = ['#00F298', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div data-testid="carbon-credits-page" className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>
            Carbon Credits
          </h1>
          <p className="text-sm text-slate-400 mt-1">Measure, Report, Verify & Exchange</p>
        </div>
        <Button
          data-testid="create-credit-btn"
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-xl text-sm"
          style={{ background: '#00F298', color: '#060B12' }}
        >
          <Plus className="w-4 h-4" />
          Issue New Credit
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Credits', value: stats?.total_credits || 0 },
          { label: 'Total Tonnes', value: `${((stats?.total_tonnes || 0) / 1000).toFixed(0)}k tCO2e` },
          { label: 'Retired', value: `${((stats?.total_retired_tonnes || 0) / 1000).toFixed(0)}k tCO2e` },
          { label: 'Offset Rate', value: `${stats?.total_tonnes ? ((stats.total_retired_tonnes / stats.total_tonnes) * 100).toFixed(1) : 0}%` },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1">{s.label}</p>
            <p className="text-lg font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-medium mb-4">By Region</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={regionChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                  {regionChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} formatter={v => `${v.toLocaleString()} tCO2e`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {regionChartData.map((r, i) => (
              <div key={r.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {r.name}
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-medium mb-4">By Project Type</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} formatter={v => `${v.toLocaleString()} tCO2e`} />
                <Bar dataKey="value" fill="#00F298" opacity={0.7} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card-active rounded-xl p-6">
          <h3 className="text-sm font-medium mb-4" style={{ fontFamily: 'Cabinet Grotesk' }}>Issue New Carbon Credit</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Project Name</label>
              <Input data-testid="credit-project-name" value={form.project_name} onChange={e => setForm({...form, project_name: e.target.value})} required className="glass-input bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Project Type</label>
              <Select value={form.project_type} onValueChange={v => setForm({...form, project_type: v})}>
                <SelectTrigger className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0B111A] border-white/10">
                  {PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Quantity (tCO2e)</label>
              <Input data-testid="credit-quantity" type="number" value={form.quantity_tonnes} onChange={e => setForm({...form, quantity_tonnes: e.target.value})} required className="glass-input bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Region</label>
              <Select value={form.region} onValueChange={v => setForm({...form, region: v})}>
                <SelectTrigger className="glass-input bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0B111A] border-white/10">
                  {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Vintage Year</label>
              <Input type="number" value={form.vintage_year} onChange={e => setForm({...form, vintage_year: e.target.value})} className="glass-input bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Methodology</label>
              <Input value={form.methodology} onChange={e => setForm({...form, methodology: e.target.value})} placeholder="e.g. REDD+, Gold Standard" className="glass-input bg-white/5 border-white/10 text-white placeholder:text-slate-600" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button data-testid="submit-credit-btn" type="submit" style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl">Submit for Verification</Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl border-white/10 text-slate-400 hover:bg-white/5">Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Exchange Dialog */}
      {exchangeCredit && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card-active rounded-xl p-6">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" /> Exchange: {exchangeCredit.project_name}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Available: {exchangeCredit.available_tonnes?.toFixed(0)} tCO2e</label>
              <Input data-testid="exchange-qty" type="number" value={exchangeQty} onChange={e => setExchangeQty(e.target.value)} placeholder="Quantity" className="glass-input bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Price per tonne (USD)</label>
              <Input data-testid="exchange-price" type="number" value={exchangePrice} onChange={e => setExchangePrice(e.target.value)} placeholder="0.00" className="glass-input bg-white/5 border-white/10 text-white" />
            </div>
            <div className="flex items-end gap-2">
              <Button data-testid="execute-exchange-btn" onClick={handleExchange} style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl">Execute Exchange</Button>
              <Button variant="outline" onClick={() => setExchangeCredit(null)} className="rounded-xl border-white/10 text-slate-400 hover:bg-white/5">Cancel</Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger data-testid="filter-region" className="w-40 glass-input bg-white/5 border-white/10 text-white text-sm">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent className="bg-[#0B111A] border-white/10">
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger data-testid="filter-status" className="w-40 glass-input bg-white/5 border-white/10 text-white text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-[#0B111A] border-white/10">
            <SelectItem value="all">All Statuses</SelectItem>
            {['verified', 'pending', 'issued', 'retired'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Credits Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Project', 'Type', 'Region', 'Quantity', 'Available', 'Status', 'Price', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {credits.map((credit, i) => (
                <tr key={credit.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{credit.project_name}</p>
                    <p className="text-xs text-slate-500">{credit.methodology}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{credit.project_type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs border-white/10 text-slate-300">{credit.region}</Badge></td>
                  <td className="px-4 py-3 text-sm">{credit.quantity_tonnes?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{credit.available_tonnes?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: `${STATUS_COLORS[credit.status]}15`, color: STATUS_COLORS[credit.status] }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[credit.status] }} />
                      {credit.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">${credit.price_per_tonne?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {user?.role === 'regulator' && credit.status === 'pending' && (
                        <button data-testid={`verify-${credit.id}`} onClick={() => handleVerify(credit.id)} className="px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                          <ShieldCheck className="w-3 h-3 inline mr-1" />Verify
                        </button>
                      )}
                      {credit.status === 'verified' && credit.available_tonnes > 0 && (
                        <>
                          <button data-testid={`exchange-${credit.id}`} onClick={() => { setExchangeCredit(credit); setExchangePrice(credit.price_per_tonne?.toString()); }} className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                            <ArrowRightLeft className="w-3 h-3 inline mr-1" />Exchange
                          </button>
                          <button data-testid={`retire-${credit.id}`} onClick={() => handleRetire(credit.id)} className="px-2 py-1 rounded text-xs bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 transition-colors">
                            <RefreshCw className="w-3 h-3 inline mr-1" />Retire
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {credits.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">No carbon credits found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
