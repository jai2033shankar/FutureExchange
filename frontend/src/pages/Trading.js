import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, ShoppingCart, X, CandlestickChart as CandleIcon } from 'lucide-react';
import { toast } from 'sonner';
import CandlestickChart from '@/components/CandlestickChart';

export default function Trading() {
  const { apiCall } = useAuth();
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('CARBON');
  const [priceHistory, setPriceHistory] = useState([]);
  const [candlestickData, setCandlestickData] = useState([]);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [orders, setOrders] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Order form
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('limit');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAssets(); }, []);
  useEffect(() => { if (selectedAsset) loadAssetData(); }, [selectedAsset]);

  const loadAssets = async () => {
    try {
      const data = await apiCall('get', '/assets');
      setAssets(data.filter(a => a.symbol !== 'USD'));
    } catch {} finally { setLoading(false); }
  };

  const loadAssetData = async () => {
    try {
      const [history, book, trades, myOrders, candles] = await Promise.all([
        apiCall('get', `/assets/${selectedAsset}/price-history?days=30`),
        apiCall('get', `/orders/book/${selectedAsset}`),
        apiCall('get', `/trades/recent?symbol=${selectedAsset}&limit=15`),
        apiCall('get', '/orders'),
        apiCall('get', `/assets/${selectedAsset}/candlestick?limit=60`),
      ]);
      setPriceHistory(history);
      setCandlestickData(candles);
      setOrderBook(book);
      setRecentTrades(trades);
      setOrders(myOrders);
      // Set default price
      if (history.length > 0 && !price) {
        setPrice(history[history.length - 1].price.toString());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!quantity || (orderType === 'limit' && !price)) return;
    setSubmitting(true);
    try {
      await apiCall('post', '/orders', {
        asset_symbol: selectedAsset,
        order_type: orderType,
        side,
        quantity: parseFloat(quantity),
        price: orderType === 'limit' ? parseFloat(price) : null,
        settlement_token: 'USD',
      });
      toast.success(`${side.toUpperCase()} order placed for ${quantity} ${selectedAsset}`);
      setQuantity('');
      loadAssetData();
    } catch (e) {
      toast.error(e.message);
    } finally { setSubmitting(false); }
  };

  const cancelOrder = async (orderId) => {
    try {
      await apiCall('delete', `/orders/${orderId}`);
      toast.success('Order cancelled');
      loadAssetData();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const currentAsset = assets.find(a => a.symbol === selectedAsset) || {};
  const currentPrice = currentAsset.current_price || currentAsset.base_price || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="trading-page" className="space-y-4">
      {/* Asset Selector Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {assets.map(asset => (
            <button
              key={asset.symbol}
              data-testid={`asset-btn-${asset.symbol.toLowerCase()}`}
              onClick={() => { setSelectedAsset(asset.symbol); setPrice(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                selectedAsset === asset.symbol
                  ? 'bg-white/5 border border-emerald-500/20 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <span className="font-medium">{asset.symbol}</span>
              <span className={`text-xs ${(asset.price_change_24h || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${currentPrice > 1 ? asset.current_price?.toFixed(2) : asset.current_price?.toFixed(4)}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main Trading Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart + Order Book */}
        <div className="lg:col-span-3 space-y-4">
          {/* Price Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass-card rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-medium" style={{ fontFamily: 'Cabinet Grotesk' }}>
                    {currentAsset.name || selectedAsset}
                  </h2>
                  <span className="text-2xl font-medium">${currentPrice > 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(4)}</span>
                  <span className={`flex items-center text-sm ${(currentAsset.price_change_24h || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(currentAsset.price_change_24h || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(currentAsset.price_change_24h || 0).toFixed(2)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">24h Volume: {(currentAsset.volume_24h || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="h-64 md:h-80">
              <CandlestickChart data={candlestickData} height={280} />
            </div>
            {/* Volume chart beneath */}
            <div className="h-16 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={candlestickData.slice(-30)}>
                  <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                  <YAxis tick={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0B111A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} formatter={v => [v.toLocaleString(), 'Volume']} labelFormatter={() => ''} />
                  <Bar dataKey="volume" radius={[2, 2, 0, 0]}>
                    {candlestickData.slice(-30).map((entry, i) => (
                      <rect key={i} fill={entry.close >= entry.open ? 'rgba(0,242,152,0.3)' : 'rgba(239,68,68,0.3)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Order Book + Recent Trades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order Book */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium mb-3">Order Book</h3>
              <div className="space-y-1">
                <div className="flex text-[10px] uppercase tracking-wider text-slate-500 pb-1 border-b border-white/5">
                  <span className="flex-1">Price</span>
                  <span className="flex-1 text-right">Qty</span>
                  <span className="flex-1 text-right">Total</span>
                </div>
                {/* Asks (sells) - top */}
                {(orderBook.asks || []).slice(0, 5).reverse().map((ask, i) => (
                  <div key={i} className="flex text-xs py-1">
                    <span className="flex-1 text-red-400">${ask.price?.toFixed(4)}</span>
                    <span className="flex-1 text-right text-slate-400">{ask.quantity}</span>
                    <span className="flex-1 text-right text-slate-500">${ask.total?.toFixed(2)}</span>
                  </div>
                ))}
                <div className="py-1 border-y border-white/5 text-center">
                  <span className="text-sm font-medium" style={{ color: '#00F298' }}>${currentPrice > 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(4)}</span>
                </div>
                {/* Bids (buys) - bottom */}
                {(orderBook.bids || []).slice(0, 5).map((bid, i) => (
                  <div key={i} className="flex text-xs py-1">
                    <span className="flex-1 text-emerald-400">${bid.price?.toFixed(4)}</span>
                    <span className="flex-1 text-right text-slate-400">{bid.quantity}</span>
                    <span className="flex-1 text-right text-slate-500">${bid.total?.toFixed(2)}</span>
                  </div>
                ))}
                {orderBook.bids?.length === 0 && orderBook.asks?.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No orders in book</p>
                )}
              </div>
            </motion.div>

            {/* Recent Trades */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium mb-3">Recent Trades</h3>
              <div className="space-y-1">
                <div className="flex text-[10px] uppercase tracking-wider text-slate-500 pb-1 border-b border-white/5">
                  <span className="flex-1">Price</span>
                  <span className="flex-1 text-right">Amount</span>
                  <span className="flex-1 text-right">Time</span>
                </div>
                {recentTrades.map(trade => (
                  <div key={trade.id} className="flex text-xs py-1">
                    <span className="flex-1 text-slate-300">${trade.price?.toFixed(4)}</span>
                    <span className="flex-1 text-right text-slate-400">{trade.quantity?.toFixed(2)}</span>
                    <span className="flex-1 text-right text-slate-500">
                      {trade.timestamp ? new Date(trade.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))}
                {recentTrades.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No recent trades</p>}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Order Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-medium mb-4">Place Order</h3>

          {/* Buy/Sell Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              data-testid="buy-toggle"
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                side === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.02] text-slate-400 border border-white/5'
              }`}
            >
              Buy
            </button>
            <button
              data-testid="sell-toggle"
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                side === 'sell' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/[0.02] text-slate-400 border border-white/5'
              }`}
            >
              Sell
            </button>
          </div>

          <form onSubmit={handleSubmitOrder} className="space-y-4">
            {/* Order Type */}
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Order Type</label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger data-testid="order-type-select" className="glass-input bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B111A] border-white/10">
                  <SelectItem value="limit">Limit</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price */}
            {orderType === 'limit' && (
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Price (USD)</label>
                <Input
                  data-testid="order-price-input"
                  type="number"
                  step="any"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="glass-input bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Quantity ({selectedAsset})</label>
              <Input
                data-testid="order-quantity-input"
                type="number"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                className="glass-input bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>

            {/* Total */}
            {quantity && price && (
              <div className="py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total</span>
                  <span className="font-medium">${(parseFloat(quantity) * parseFloat(price || currentPrice)).toFixed(2)} USD</span>
                </div>
              </div>
            )}

            <Button
              data-testid="submit-order-btn"
              type="submit"
              disabled={submitting || !quantity}
              className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                side === 'buy'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-black btn-glow'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {submitting ? 'Placing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedAsset}`}
            </Button>
          </form>

          {/* My Orders */}
          <div className="mt-6">
            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">My Open Orders</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {orders.filter(o => o.status === 'open' && o.asset_symbol === selectedAsset).map(order => (
                <div key={order.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/[0.02] text-xs">
                  <div>
                    <span className={order.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                      {order.side.toUpperCase()}
                    </span>
                    <span className="text-slate-400 ml-2">{order.quantity} @ ${order.price?.toFixed(4)}</span>
                  </div>
                  <button onClick={() => cancelOrder(order.id)} className="p-1 hover:bg-white/5 rounded">
                    <X className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              ))}
              {orders.filter(o => o.status === 'open' && o.asset_symbol === selectedAsset).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-2">No open orders</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
