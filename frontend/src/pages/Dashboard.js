import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import {
  Wallet, TrendingUp, ShoppingBag, Leaf, AlertTriangle, ArrowUpRight,
  ArrowDownRight, Activity
} from 'lucide-react';

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

export default function Dashboard() {
  const { apiCall, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, market, trades] = await Promise.all([
        apiCall('get', '/dashboard/stats'),
        apiCall('get', '/dashboard/market-data'),
        apiCall('get', '/trades/recent?limit=10'),
      ]);
      setStats(statsData);
      setMarketData(market);
      setRecentTrades(trades);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Portfolio Value', value: `$${(stats?.portfolio_value || 0).toLocaleString()}`, icon: Wallet, color: '#00F298' },
    { label: 'Total Trades', value: stats?.trade_count || 0, icon: TrendingUp, color: '#3B82F6' },
    { label: 'Open Orders', value: stats?.open_orders || 0, icon: ShoppingBag, color: '#F59E0B' },
    { label: 'Carbon Balance', value: `${(stats?.carbon_balance || 0).toLocaleString()} tCO2e`, icon: Leaf, color: '#00F298' },
  ];

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      {/* Header */}
      <motion.div {...fadeUp}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 glass-card rounded-xl px-4 py-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Market</span>
            <span className="text-xs font-medium text-emerald-400">Active</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <div
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
              className="glass-card rounded-xl p-5 hover:-translate-y-0.5 transition-transform duration-300"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-2">{stat.label}</p>
                  <p className="text-xl font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{stat.value}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: `${stat.color}15` }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Price Chart */}
        <motion.div
          className="lg:col-span-2 glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Carbon Credit Price (CARBON)</h3>
            <span className="text-xs text-slate-500">Last 30 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marketData.find(m => m.symbol === 'CARBON')?.price_history || []}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F298" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00F298" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={v => `$${v.toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={d => new Date(d).toLocaleDateString()}
                  formatter={(v) => [`$${v.toFixed(2)}`, 'Price']}
                />
                <Area type="monotone" dataKey="price" stroke="#00F298" fill="url(#colorPrice)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Volume Chart */}
        <motion.div
          className="glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <h3 className="text-sm font-medium mb-4">Trading Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(marketData.find(m => m.symbol === 'CARBON')?.price_history || []).slice(-15)}>
                <XAxis
                  dataKey="date"
                  tickFormatter={d => new Date(d).toLocaleDateString('en', { day: 'numeric' })}
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v) => [v.toLocaleString(), 'Volume']}
                />
                <Bar dataKey="volume" fill="#00F298" opacity={0.6} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row: Market Overview + Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Market Overview */}
        <motion.div
          className="glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h3 className="text-sm font-medium mb-4">Market Overview</h3>
          <div className="space-y-3">
            {marketData.map(asset => (
              <div key={asset.symbol} data-testid={`market-${asset.symbol.toLowerCase()}`} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium" style={{ background: '#14223A', color: '#00F298' }}>
                    {asset.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{asset.name}</p>
                    <p className="text-xs text-slate-500">{asset.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${asset.current_price?.toFixed(asset.current_price > 1 ? 2 : 4)}</p>
                  <div className={`flex items-center gap-1 text-xs ${asset.price_change_24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {asset.price_change_24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(asset.price_change_24h || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Trades */}
        <motion.div
          className="glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <h3 className="text-sm font-medium mb-4">Recent Market Trades</h3>
          <div className="space-y-2">
            {recentTrades.slice(0, 8).map(trade => (
              <div key={trade.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${trade.status === 'settled' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                  <span className="text-sm font-medium">{trade.asset_symbol}</span>
                  <span className="text-xs text-slate-500">{trade.quantity} units</span>
                </div>
                <div className="text-right">
                  <p className="text-sm">${trade.total?.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">
                    {trade.timestamp ? new Date(trade.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            ))}
            {recentTrades.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No recent trades</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
