import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Flame, Eye, Rocket, ArrowUpRight, ArrowDownRight, Leaf, Globe, Vote, Copy, BarChart2, Activity } from 'lucide-react';
import { toast } from 'sonner';

const CAT_ICONS = { trade: ArrowUpRight, prediction: TrendingUp, carbon: Leaf, bridge: Globe, governance: Vote, copy_trade: Copy };
const SIGNAL_COLORS = { hot: '#EF4444', warm: '#F59E0B', cold: '#3B82F6', bullish: '#00F298', bearish: '#EF4444', neutral: '#8E9EAD' };
const REACTION_ICONS = { fire: Flame, rocket: Rocket, eyes: Eye };

export default function SocialFeed() {
  const { apiCall } = useAuth();
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [trending, setTrending] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [selectedTrader, setSelectedTrader] = useState(null);
  const [feedCat, setFeedCat] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadFeed(); }, [feedCat]);

  const loadData = async () => {
    try {
      const [s, l, t, sent] = await Promise.all([
        apiCall('get', '/social/feed/stats'),
        apiCall('get', '/social/leaderboard'),
        apiCall('get', '/social/trending'),
        apiCall('get', '/social/sentiment'),
      ]);
      setStats(s); setLeaderboard(l); setTrending(t); setSentiment(sent);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadFeed = async () => {
    try {
      const catParam = feedCat !== 'all' ? `?category=${feedCat}&limit=40` : '?limit=40';
      setFeed(await apiCall('get', `/social/feed${catParam}`));
    } catch (e) { console.error(e); }
  };

  const handleCopyTrade = async (traderId) => {
    try {
      const result = await apiCall('post', '/social/copy-trade', { trader_id: traderId, allocation_pct: 10 });
      toast.success(`Now copying ${result.trader_name} with $${result.allocation_usd}`);
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  return (
    <div data-testid="social-feed-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Social Trading</h1>
        <p className="text-sm text-slate-400 mt-1">Live activity feed, top traders, trending assets, and copy trading</p>
      </motion.div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Sentiment', value: stats.market_sentiment?.toUpperCase(), sub: `${stats.sentiment_score}%`, color: SIGNAL_COLORS[stats.market_sentiment] || '#8E9EAD' },
            { label: 'Active Traders', value: stats.active_traders_24h, sub: 'last 24h', color: '#3B82F6' },
            { label: 'Feed Events', value: stats.last_24h, sub: 'last 24h', color: '#F59E0B' },
            { label: 'Volume', value: `$${(stats.total_volume_24h / 1000).toFixed(0)}K`, sub: '24h', color: '#00F298' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-1">{s.label}</p>
              <p className="text-xl font-medium" style={{ fontFamily: 'Cabinet Grotesk', color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      )}

      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
          <TabsTrigger value="feed" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Live Feed</TabsTrigger>
          <TabsTrigger value="leaderboard" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Top Traders ({leaderboard.length})</TabsTrigger>
          <TabsTrigger value="trending" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Trending</TabsTrigger>
          <TabsTrigger value="sentiment" className="rounded-lg data-[state=active]:bg-white/10 text-xs">Sentiment</TabsTrigger>
        </TabsList>

        {/* Live Feed Tab */}
        <TabsContent value="feed">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 space-y-2">
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-2">
                {['all', 'trade', 'prediction', 'carbon', 'bridge', 'governance'].map(c => (
                  <button key={c} onClick={() => setFeedCat(c)} className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${feedCat === c ? 'bg-white/10 text-white border border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    {c === 'all' ? 'All' : c} {c !== 'all' && stats?.by_category?.[c] ? `(${stats.by_category[c]})` : ''}
                  </button>
                ))}
              </div>
              {/* Feed Items */}
              <div className="space-y-1.5">
                {feed.map((item, i) => {
                  const CatIcon = CAT_ICONS[item.category] || Activity;
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                      className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/[0.03] transition-all">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${item.color}15`, color: item.color }}>
                        {item.avatar_initials || <CatIcon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{item.display_name}</span>
                          {item.role === 'institutional' && <Badge className="text-[8px] bg-blue-500/10 text-blue-400 border-0">Inst</Badge>}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{item.action}</p>
                      </div>
                      {item.pnl_impact != null && (
                        <span className={`text-xs font-medium ${item.pnl_impact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {item.pnl_impact >= 0 ? '+' : ''}${item.pnl_impact.toLocaleString()}
                        </span>
                      )}
                      {/* Reactions */}
                      <div className="flex items-center gap-2">
                        {item.reactions && Object.entries(item.reactions).filter(([, v]) => v > 0).map(([k, v]) => {
                          const RIcon = REACTION_ICONS[k];
                          return RIcon ? <span key={k} className="flex items-center gap-0.5 text-[10px] text-slate-500"><RIcon className="w-3 h-3" />{v}</span> : null;
                        })}
                      </div>
                      <span className="text-[10px] text-slate-600 flex-shrink-0">{timeAgo(item.timestamp)}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            {/* Sidebar: Mini Leaderboard */}
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Top Traders</h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((t, i) => (
                    <div key={t.id} className="flex items-center gap-2 py-1.5">
                      <span className="text-[10px] font-bold text-slate-500 w-4">{i + 1}</span>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold" style={{ background: '#14223A', color: '#00F298' }}>{t.avatar_initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{t.display_name}</p>
                        <p className="text-[10px] text-slate-500">{t.style}</p>
                      </div>
                      <span className={`text-[10px] font-medium ${t.stats?.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.stats?.pnl >= 0 ? '+' : ''}${(t.stats?.pnl / 1000).toFixed(1)}K
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Hot Assets</h3>
                {trending.filter(t => t.signal === 'hot').slice(0, 3).map(t => (
                  <div key={t.symbol} className="flex items-center justify-between py-1.5">
                    <span className="text-xs font-medium">{t.symbol}</span>
                    <div className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-red-400" />
                      <span className="text-[10px] text-slate-400">{t.momentum_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {leaderboard.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`glass-card rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 ${selectedTrader?.id === t.id ? 'border-emerald-500/20' : ''}`}
                  onClick={() => setSelectedTrader(t)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: i < 3 ? '#F59E0B15' : '#14223A', color: i < 3 ? '#F59E0B' : '#00F298' }}>
                        {i < 3 ? ['1st', '2nd', '3rd'][i] : t.avatar_initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium">{t.display_name}</h3>
                          {t.role === 'institutional' && <Badge className="text-[8px] bg-blue-500/10 text-blue-400 border-0">Inst</Badge>}
                        </div>
                        <p className="text-[10px] text-slate-500">{t.style}</p>
                      </div>
                    </div>
                    <Button data-testid={`copy-${t.id}`} size="sm" onClick={(e) => { e.stopPropagation(); handleCopyTrade(t.id); }}
                      className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
                      <Copy className="w-3 h-3 mr-1" />Copy
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div><p className="text-[10px] text-slate-400">P&L</p><p className={`text-sm font-medium ${t.stats?.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.stats?.pnl >= 0 ? '+' : ''}${t.stats?.pnl?.toLocaleString()}</p></div>
                    <div><p className="text-[10px] text-slate-400">Win Rate</p><p className="text-sm font-medium">{t.stats?.win_rate}%</p></div>
                    <div><p className="text-[10px] text-slate-400">Trades</p><p className="text-sm font-medium">{t.stats?.trades}</p></div>
                    <div><p className="text-[10px] text-slate-400">Sharpe</p><p className="text-sm font-medium">{t.stats?.sharpe}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.badges?.map(b => <Badge key={b} variant="outline" className="text-[9px] border-white/10 text-slate-400">{b}</Badge>)}
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Trader Detail */}
            <div>
              {selectedTrader ? (
                <div className="glass-card-active rounded-xl p-5 space-y-4 sticky top-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: '#14223A', color: '#00F298' }}>{selectedTrader.avatar_initials}</div>
                    <div>
                      <h3 className="text-sm font-medium">{selectedTrader.display_name}</h3>
                      <p className="text-[10px] text-slate-500">{selectedTrader.style} | {selectedTrader.copiers} copiers</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{selectedTrader.bio}</p>
                  {/* Equity Curve */}
                  {selectedTrader.equity_curve?.length > 0 && (
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedTrader.equity_curve}>
                          <XAxis dataKey="date" tick={false} axisLine={false} />
                          <YAxis tick={false} axisLine={false} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} formatter={v => [`$${v?.toLocaleString()}`, 'Equity']} />
                          <Line type="monotone" dataKey="value" stroke="#00F298" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Open Positions</p>
                    {selectedTrader.top_positions?.map(p => (
                      <div key={p.asset} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[9px] ${p.side === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{p.side}</Badge>
                          <span className="text-xs">{p.asset}</span>
                        </div>
                        <span className={`text-xs font-medium ${p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${p.pnl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="glass-card rounded-xl p-8 text-center">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Select a trader to view profile</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Trending Tab */}
        <TabsContent value="trending">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.map((t, i) => (
              <motion.div key={t.symbol} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>{t.symbol}</h3>
                    <p className="text-xs text-slate-500">{t.name}</p>
                  </div>
                  <Badge className="text-[10px]" style={{ background: `${SIGNAL_COLORS[t.signal]}15`, color: SIGNAL_COLORS[t.signal] }}>
                    {t.signal === 'hot' && <Flame className="w-3 h-3 mr-0.5" />}{t.signal}
                  </Badge>
                </div>
                <div className="h-16 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={t.sparkline}>
                      <Line type="monotone" dataKey="price" stroke={t.change_24h >= 0 ? '#00F298' : '#EF4444'} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400">Momentum</span><div className="h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${t.momentum_score}%`, background: SIGNAL_COLORS[t.signal] }} /></div></div>
                  <div className="text-right"><span className="text-slate-400">24h</span><p className={`font-medium ${t.change_24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.change_24h >= 0 ? '+' : ''}{t.change_24h?.toFixed(2)}%</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] text-slate-500">
                  <div><span className="block">Buy Pressure</span><span className="text-emerald-400 font-medium">{(t.buy_pressure * 100).toFixed(0)}%</span></div>
                  <div><span className="block">Whale Trades</span><span className="font-medium">{t.whale_trades}</span></div>
                  <div><span className="block">Top Holders</span><span className="font-medium">{t.top_traders_holding}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Sentiment Tab */}
        <TabsContent value="sentiment">
          {sentiment && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-medium mb-4">Asset Sentiment</h3>
                <div className="space-y-3">
                  {sentiment.assets?.map(a => (
                    <div key={a.symbol} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{a.symbol}</span>
                          <Badge className="text-[9px]" style={{ background: `${SIGNAL_COLORS[a.signal]}15`, color: SIGNAL_COLORS[a.signal] }}>{a.signal}</Badge>
                        </div>
                        <span className="text-[10px] text-slate-500">{a.social_mentions} mentions</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'rgba(239,68,68,0.15)' }}>
                        <div className="h-full rounded-full" style={{ width: `${a.buy_pressure * 100}%`, background: '#00F298' }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span className="text-emerald-400">Buy {(a.buy_pressure * 100).toFixed(0)}%</span>
                        <span className="text-red-400">Sell {(a.sell_pressure * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-medium mb-4">Prediction Market Sentiment</h3>
                <div className="space-y-3">
                  {sentiment.predictions?.map(p => (
                    <div key={p.category} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-sm capitalize">{p.category.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-slate-500">{p.markets} markets</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16 text-right"><span className="text-xs font-medium">{(p.avg_yes_price * 100).toFixed(0)}%</span></div>
                        <Badge className="text-[9px] w-16 justify-center" style={{ background: `${SIGNAL_COLORS[p.signal]}15`, color: SIGNAL_COLORS[p.signal] }}>{p.signal}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
