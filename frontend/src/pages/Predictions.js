import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Predictions() {
  const { apiCall } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [betAmounts, setBetAmounts] = useState({});

  useEffect(() => { loadPredictions(); }, []);

  const loadPredictions = async () => {
    try {
      const data = await apiCall('get', '/predictions');
      setPredictions(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const placeBet = async (predId, position) => {
    const amount = parseFloat(betAmounts[predId] || 0);
    if (amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await apiCall('post', `/predictions/${predId}/bet`, { position, amount });
      toast.success(`Bet placed: ${position.toUpperCase()} for $${amount}`);
      setBetAmounts(prev => ({ ...prev, [predId]: '' }));
      loadPredictions();
    } catch (e) { toast.error(e.message); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const CATEGORY_COLORS = { price: '#00F298', regulation: '#3B82F6', supply: '#F59E0B' };

  return (
    <div data-testid="predictions-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Prediction Markets</h1>
        <p className="text-sm text-slate-400 mt-1">Forecast supply, price, and regulation outcomes</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predictions.map((pred, i) => (
          <motion.div
            key={pred.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider" style={{ borderColor: `${CATEGORY_COLORS[pred.category]}30`, color: CATEGORY_COLORS[pred.category] }}>
                {pred.category}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {pred.end_date}
              </div>
            </div>

            <h3 className="text-sm font-medium mb-3 leading-relaxed">{pred.title}</h3>

            {/* Probability Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400">Yes {pred.yes_probability}%</span>
                <span className="text-red-400">No {pred.no_probability}%</span>
              </div>
              <div className="h-2 rounded-full bg-red-500/20 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pred.yes_probability}%`, background: '#00F298' }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>${(pred.yes_pool || 0).toLocaleString()} pool</span>
                <span>${(pred.no_pool || 0).toLocaleString()} pool</span>
              </div>
            </div>

            {/* Bet Form */}
            <div className="flex gap-2">
              <Input
                data-testid={`bet-amount-${pred.id}`}
                type="number"
                value={betAmounts[pred.id] || ''}
                onChange={e => setBetAmounts(prev => ({ ...prev, [pred.id]: e.target.value }))}
                placeholder="$ Amount"
                className="flex-1 glass-input bg-white/5 border-white/10 text-white text-sm placeholder:text-slate-600"
              />
              <Button
                data-testid={`bet-yes-${pred.id}`}
                onClick={() => placeBet(pred.id, 'yes')}
                size="sm"
                className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs"
              >
                Yes
              </Button>
              <Button
                data-testid={`bet-no-${pred.id}`}
                onClick={() => placeBet(pred.id, 'no')}
                size="sm"
                className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs"
              >
                No
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
              <BarChart2 className="w-3 h-3" />
              {pred.total_bets || 0} bets placed
            </div>
          </motion.div>
        ))}
        {predictions.length === 0 && (
          <div className="md:col-span-2 glass-card rounded-xl p-8 text-center">
            <p className="text-slate-500">No active prediction markets</p>
          </div>
        )}
      </div>
    </div>
  );
}
