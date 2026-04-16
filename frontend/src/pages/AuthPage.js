import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Eye, EyeOff, Leaf, Shield, Zap } from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('retail');
  const [organization, setOrganization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = isLogin
      ? await login(email, password)
      : await register(email, password, name, role, organization);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#060B12' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1688141585146-1fb4a1358c87?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGRhcmslMjBnZW9tZXRyaWN8ZW58MHx8fHwxNzc2MzIwNDIwfDA&ixlib=rb-4.1.0&q=85)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#00F298' }}>
              <ArrowLeftRight className="w-6 h-6" style={{ color: '#060B12' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>E4N</h1>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Exchange for Necessities</p>
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-medium text-white mb-6" style={{ fontFamily: 'Cabinet Grotesk' }}>
            The future of sustainable commodity exchange
          </h2>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Trade essential goods, exchange carbon credits, and drive social impact through
            deterministic, instant-settlement, tokenized markets.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Leaf, label: 'Carbon Credits', desc: 'Verify & exchange' },
              { icon: Zap, label: 'Instant Settlement', desc: 'Atomic execution' },
              { icon: Shield, label: 'Compliance', desc: 'Region-aware rules' },
            ].map((f, i) => (
              <div key={i} className="glass-card rounded-xl p-4">
                <f.icon className="w-5 h-5 mb-2" style={{ color: '#00F298' }} strokeWidth={1.5} />
                <p className="text-xs font-medium text-white">{f.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#00F298' }}>
              <ArrowLeftRight className="w-5 h-5" style={{ color: '#060B12' }} />
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: 'Cabinet Grotesk' }}>E4N</span>
          </div>

          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-xl font-medium mb-1" style={{ fontFamily: 'Cabinet Grotesk' }}>
              {isLogin ? 'Sign in to E4N' : 'Create your account'}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {isLogin ? 'Access the exchange platform' : 'Join the exchange ecosystem'}
            </p>

            {error && (
              <div data-testid="auth-error" className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Full Name</label>
                    <Input
                      data-testid="register-name-input"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      required={!isLogin}
                      className="glass-input bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Role</label>
                    <select
                      data-testid="register-role-select"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-md glass-input bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:outline-none"
                    >
                      <option value="retail" className="bg-gray-900">Retail Trader</option>
                      <option value="institutional" className="bg-gray-900">Institutional</option>
                    </select>
                  </div>
                  {role === 'institutional' && (
                    <div>
                      <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Organization</label>
                      <Input
                        data-testid="register-org-input"
                        value={organization}
                        onChange={e => setOrganization(e.target.value)}
                        placeholder="Company name"
                        className="glass-input bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Email</label>
                <Input
                  data-testid="auth-email-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="glass-input bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Password</label>
                <div className="relative">
                  <Input
                    data-testid="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="glass-input bg-white/5 border-white/10 text-white placeholder:text-slate-600 pr-10 focus:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                data-testid="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-medium text-sm btn-glow transition-all"
                style={{ background: '#00F298', color: '#060B12' }}
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                data-testid="auth-toggle-btn"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>

            {isLogin && (
              <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Demo Accounts</p>
                <div className="space-y-1">
                  {[
                    { email: 'retail_user_1@e4n.com', pwd: 'Test@123', label: 'Retail' },
                    { email: 'inst_buyer_1@e4n.com', pwd: 'Test@123', label: 'Institutional' },
                    { email: 'regulator_1@e4n.com', pwd: 'Admin@123', label: 'Regulator' },
                  ].map(demo => (
                    <button
                      key={demo.email}
                      data-testid={`demo-${demo.label.toLowerCase()}-btn`}
                      onClick={() => { setEmail(demo.email); setPassword(demo.pwd); }}
                      className="block w-full text-left px-2 py-1 rounded text-xs text-slate-400 hover:text-emerald-400 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-slate-500">{demo.label}:</span> {demo.email}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
