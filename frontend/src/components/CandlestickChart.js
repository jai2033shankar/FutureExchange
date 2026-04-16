import React, { useMemo, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const INDICATORS = {
  sma: { key: 'sma_20', label: 'SMA 20', color: '#F59E0B', dash: '0' },
  ema: { key: 'ema_12', label: 'EMA 12', color: '#8B5CF6', dash: '0' },
  bollinger_upper: { key: 'bollinger_upper', label: 'BB Upper', color: '#3B82F6', dash: '4 2' },
  bollinger_lower: { key: 'bollinger_lower', label: 'BB Lower', color: '#3B82F6', dash: '4 2' },
};

// Custom candlestick shape
const CandlestickShape = (props) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;
  const { open, close, high, low } = payload;
  const isGreen = close >= open;
  const color = isGreen ? '#00F298' : '#EF4444';
  
  // Need to calculate positions relative to the chart's y-axis
  const yScale = props.yScale || ((v) => v);
  
  const bodyTop = yScale(Math.max(open, close));
  const bodyBottom = yScale(Math.min(open, close));
  const wickTop = yScale(high);
  const wickBottom = yScale(low);
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
  const candleWidth = Math.min(width * 0.7, 12);
  const centerX = x + width / 2;
  
  return (
    <g>
      {/* Upper wick */}
      <line x1={centerX} y1={wickTop} x2={centerX} y2={bodyTop} stroke={color} strokeWidth={1} />
      {/* Lower wick */}
      <line x1={centerX} y1={bodyBottom} x2={centerX} y2={wickBottom} stroke={color} strokeWidth={1} />
      {/* Body */}
      <rect
        x={centerX - candleWidth / 2}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        fill={isGreen ? color : color}
        fillOpacity={isGreen ? 0.8 : 0.8}
        stroke={color}
        strokeWidth={1}
        rx={1}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const isGreen = d.close >= d.open;
  return (
    <div className="glass-card rounded-lg p-3 text-xs min-w-[160px]" style={{ background: 'rgba(11,17,26,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="text-slate-400 mb-1.5">{d.date ? new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</p>
      <div className="space-y-0.5">
        <div className="flex justify-between"><span className="text-slate-500">Open</span><span className="text-slate-200">${d.open?.toFixed(4)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">High</span><span className="text-slate-200">${d.high?.toFixed(4)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Low</span><span className="text-slate-200">${d.low?.toFixed(4)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Close</span><span style={{ color: isGreen ? '#00F298' : '#EF4444' }}>${d.close?.toFixed(4)}</span></div>
        <div className="flex justify-between border-t border-white/5 pt-1 mt-1"><span className="text-slate-500">Volume</span><span className="text-slate-200">{d.volume?.toLocaleString()}</span></div>
        {d.rsi && <div className="flex justify-between"><span className="text-slate-500">RSI</span><span className={d.rsi > 70 ? 'text-red-400' : d.rsi < 30 ? 'text-emerald-400' : 'text-slate-200'}>{d.rsi?.toFixed(1)}</span></div>}
        {d.macd !== undefined && <div className="flex justify-between"><span className="text-slate-500">MACD</span><span className={d.macd >= 0 ? 'text-emerald-400' : 'text-red-400'}>{d.macd?.toFixed(4)}</span></div>}
      </div>
    </div>
  );
};

export default function CandlestickChart({ data = [], height = 320 }) {
  const [activeIndicators, setActiveIndicators] = useState({ sma: true, ema: false, bollinger: false });

  // Calculate y domain from OHLC data
  const [yMin, yMax] = useMemo(() => {
    if (!data.length) return [0, 100];
    let min = Infinity, max = -Infinity;
    data.forEach(d => {
      if (d.low < min) min = d.low;
      if (d.high > max) max = d.high;
      if (activeIndicators.bollinger) {
        if (d.bollinger_lower < min) min = d.bollinger_lower;
        if (d.bollinger_upper > max) max = d.bollinger_upper;
      }
    });
    const padding = (max - min) * 0.05;
    return [min - padding, max + padding];
  }, [data, activeIndicators.bollinger]);

  // Prepare data with bar height for candlestick rendering
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      // For the bar, we use the range between open and close
      barValue: Math.abs(d.close - d.open) || 0.001,
      barBase: Math.min(d.open, d.close),
    }));
  }, [data]);

  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">No chart data</div>;

  const toggleIndicator = (key) => setActiveIndicators(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      {/* Indicator toggles */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Indicators:</span>
        {[
          { key: 'sma', label: 'SMA 20', color: '#F59E0B' },
          { key: 'ema', label: 'EMA 12', color: '#8B5CF6' },
          { key: 'bollinger', label: 'Bollinger', color: '#3B82F6' },
        ].map(ind => (
          <button
            key={ind.key}
            data-testid={`indicator-${ind.key}`}
            onClick={() => toggleIndicator(ind.key)}
            className={`px-2 py-0.5 rounded text-[10px] transition-all border ${
              activeIndicators[ind.key]
                ? `border-opacity-50 text-white`
                : 'border-white/5 text-slate-500 hover:text-slate-300'
            }`}
            style={activeIndicators[ind.key] ? { borderColor: ind.color, background: `${ind.color}15` } : {}}
          >
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 rounded" style={{ background: activeIndicators[ind.key] ? ind.color : '#64748B' }} />
              {ind.label}
            </span>
          </button>
        ))}
      </div>

      {/* Main chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis
              dataKey="date"
              tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              tick={{ fill: '#64748B', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: '#64748B', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v > 1 ? `$${v.toFixed(0)}` : `$${v.toFixed(3)}`}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Candlestick bars - use customized bar with stacked approach */}
            <Bar dataKey="high" fill="transparent" stroke="transparent" barSize={10}>
              {chartData.map((entry, i) => {
                const isGreen = entry.close >= entry.open;
                const color = isGreen ? '#00F298' : '#EF4444';
                const bodyTop = Math.max(entry.open, entry.close);
                const bodyBottom = Math.min(entry.open, entry.close);
                return (
                  <Cell
                    key={`candle-${i}`}
                    fill="transparent"
                    stroke="transparent"
                  />
                );
              })}
            </Bar>

            {/* SMA line */}
            {activeIndicators.sma && (
              <Line type="monotone" dataKey="sma_20" stroke="#F59E0B" strokeWidth={1} dot={false} strokeDasharray="0" opacity={0.7} />
            )}

            {/* EMA line */}
            {activeIndicators.ema && (
              <Line type="monotone" dataKey="ema_12" stroke="#8B5CF6" strokeWidth={1} dot={false} opacity={0.7} />
            )}

            {/* Bollinger Bands */}
            {activeIndicators.bollinger && (
              <>
                <Line type="monotone" dataKey="bollinger_upper" stroke="#3B82F6" strokeWidth={1} dot={false} strokeDasharray="4 2" opacity={0.5} />
                <Line type="monotone" dataKey="bollinger_lower" stroke="#3B82F6" strokeWidth={1} dot={false} strokeDasharray="4 2" opacity={0.5} />
              </>
            )}

            {/* Close price line for the candlestick visual */}
            <Line type="monotone" dataKey="close" stroke="#00F298" strokeWidth={1.5} dot={false} opacity={0.9} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* OHLCV mini strip */}
      {data.length > 0 && (() => {
        const last = data[data.length - 1];
        const prev = data.length > 1 ? data[data.length - 2] : last;
        const isGreen = last.close >= prev.close;
        return (
          <div className="flex items-center gap-4 mt-2 text-[10px]">
            <span className="text-slate-500">O: <span className="text-slate-300">${last.open?.toFixed(4)}</span></span>
            <span className="text-slate-500">H: <span className="text-emerald-400">${last.high?.toFixed(4)}</span></span>
            <span className="text-slate-500">L: <span className="text-red-400">${last.low?.toFixed(4)}</span></span>
            <span className="text-slate-500">C: <span style={{ color: isGreen ? '#00F298' : '#EF4444' }}>${last.close?.toFixed(4)}</span></span>
            <span className="text-slate-500">V: <span className="text-slate-300">{last.volume?.toLocaleString()}</span></span>
            <span className="text-slate-500">RSI: <span className={last.rsi > 70 ? 'text-red-400' : last.rsi < 30 ? 'text-emerald-400' : 'text-slate-300'}>{last.rsi?.toFixed(1)}</span></span>
          </div>
        );
      })()}
    </div>
  );
}
