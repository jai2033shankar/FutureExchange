import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

const CATEGORY_COLORS = { food: '#F59E0B', energy: '#3B82F6', water: '#06B6D4', carbon: '#00F298', settlement: '#8E9EAD' };

export default function Portfolio() {
  const { apiCall } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [portfolioData, riskData] = await Promise.all([
        apiCall('get', '/portfolio'),
        apiCall('get', '/risk/score'),
      ]);
      setPortfolio(portfolioData);
      setRisk(riskData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const pieData = (portfolio?.holdings || [])
    .filter(h => h.value > 0)
    .map(h => ({ name: h.symbol, value: h.value }));
  const PIE_COLORS = ['#00F298', '#3B82F6', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];

  const riskColor = risk?.risk_level === 'low' ? '#00F298' : risk?.risk_level === 'medium' ? '#F59E0B' : '#EF4444';

  return (
    <div data-testid="portfolio-page" className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Portfolio</h1>
        <p className="text-sm text-slate-400 mt-1">Wallet balances and holdings overview</p>
      </motion.div>

      {/* Portfolio Value + Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-2">Total Portfolio Value</p>
              <p className="text-3xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>
                ${(portfolio?.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#00F29815' }}>
              <Wallet className="w-5 h-5" style={{ color: '#00F298' }} strokeWidth={1.5} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">{(portfolio?.holdings || []).length} assets held</span>
          </div>
        </motion.div>

        {/* Allocation Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-medium mb-2">Allocation</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={v => `$${v.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {d.name}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Risk Score */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-medium mb-4">Risk Assessment</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke={riskColor} strokeWidth="3"
                  strokeDasharray={`${risk?.risk_score || 0}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-medium" style={{ color: riskColor }}>{risk?.risk_score || 0}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium capitalize" style={{ color: riskColor }}>{risk?.risk_level || 'N/A'} Risk</p>
              <p className="text-xs text-slate-500 mt-1">Based on {risk?.factors?.trade_history || 0} trades</p>
            </div>
          </div>
          <div className="space-y-2">
            {(risk?.recommendations || []).map((rec, i) => (
              <p key={i} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: riskColor }} />
                {rec}
              </p>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Holdings Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-medium">Holdings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Asset', 'Category', 'Quantity', 'Price', 'Value', '24h Change'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(portfolio?.holdings || []).map((holding, i) => (
                <tr key={holding.symbol} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors" style={{ animationDelay: `${i * 0.02}s` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium" style={{ background: `${CATEGORY_COLORS[holding.category] || '#8E9EAD'}15`, color: CATEGORY_COLORS[holding.category] || '#8E9EAD' }}>
                        {holding.symbol?.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{holding.name}</p>
                        <p className="text-xs text-slate-500">{holding.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 capitalize">{holding.category}</td>
                  <td className="px-4 py-3 text-sm">{holding.quantity?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">${holding.price > 1 ? holding.price?.toFixed(2) : holding.price?.toFixed(4)}</td>
                  <td className="px-4 py-3 text-sm font-medium">${holding.value?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-sm ${(holding.change_24h || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(holding.change_24h || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(holding.change_24h || 0).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
              {(portfolio?.holdings || []).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">No holdings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Recent Trades */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">Recent Trade Activity</h3>
        <div className="space-y-2">
          {(portfolio?.recent_trades || []).slice(0, 10).map(trade => (
            <div key={trade.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${trade.status === 'settled' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                <div>
                  <span className="text-sm font-medium">{trade.asset_symbol}</span>
                  <span className="text-xs text-slate-500 ml-2">{trade.quantity} units @ ${trade.price?.toFixed(4)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm">${trade.total?.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">{trade.timestamp ? new Date(trade.timestamp).toLocaleDateString() : ''}</p>
              </div>
            </div>
          ))}
          {(portfolio?.recent_trades || []).length === 0 && <p className="text-sm text-slate-500 text-center py-4">No recent trades</p>}
        </div>
      </motion.div>
    </div>
  );
}
