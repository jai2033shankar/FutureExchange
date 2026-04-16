import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, MailOpen, Star, StarOff, Inbox, Send, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATE_COLORS = {
  trade_executed: '#00F298', order_filled: '#00F298', welcome: '#3B82F6',
  kyc_approved: '#00F298', kyc_rejected: '#EF4444', carbon_credit_verified: '#06B6D4',
  carbon_credit_retired: '#8B5CF6', compliance_alert: '#F59E0B', security_mfa_enabled: '#8B5CF6',
  large_trade_alert: '#EF4444', settlement_complete: '#00F298',
};

export default function EmailInbox() {
  const { apiCall } = useAuth();
  const [emails, setEmails] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [folder, setFolder] = useState('inbox');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadEmails(); }, [folder]);

  const loadEmails = async () => {
    try {
      const data = await apiCall('get', `/emails?folder=${folder}`);
      setEmails(data.emails || []);
      setUnreadCount(data.unread_count || 0);
      setTotalCount(data.total_count || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const openEmail = async (email) => {
    try {
      const data = await apiCall('get', `/emails/${email.id}`);
      setSelectedEmail(data);
      loadEmails();
    } catch (e) { console.error(e); }
  };

  const toggleStar = async (emailId, e) => {
    e.stopPropagation();
    try {
      await apiCall('put', `/emails/${emailId}/star`);
      loadEmails();
    } catch {}
  };

  const sendTestEmails = async () => {
    try {
      const data = await apiCall('post', '/emails/test-send');
      toast.success(data.message);
      loadEmails();
    } catch (e) { toast.error(e.message); }
  };

  const markAllRead = async () => {
    try {
      await apiCall('post', '/emails/mark-all-read');
      toast.success('All emails marked as read');
      loadEmails();
    } catch {}
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  const folders = [
    { key: 'inbox', label: 'Inbox', icon: Inbox, count: totalCount },
    { key: 'unread', label: 'Unread', icon: Mail, count: unreadCount },
    { key: 'starred', label: 'Starred', icon: Star, count: null },
  ];

  return (
    <div data-testid="email-inbox-page" className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>Email Notifications</h1>
          <p className="text-sm text-slate-400 mt-1">Simulated email alerts for critical exchange events</p>
        </div>
        <div className="flex gap-2">
          <Button data-testid="send-test-emails-btn" onClick={sendTestEmails} style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl flex items-center gap-2 text-sm">
            <Send className="w-4 h-4" />Send Test Emails
          </Button>
          {unreadCount > 0 && (
            <Button data-testid="mark-all-read-emails" onClick={markAllRead} variant="outline" className="rounded-xl border-white/10 text-slate-400 hover:bg-white/5 text-sm">
              Mark All Read
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Folder sidebar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-3">
          {folders.map(f => (
            <button key={f.key} data-testid={`folder-${f.key}`} onClick={() => { setFolder(f.key); setSelectedEmail(null); }}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-all ${folder === f.key ? 'bg-white/5 text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'}`}>
              <div className="flex items-center gap-2">
                <f.icon className="w-4 h-4" strokeWidth={1.5} />
                <span>{f.label}</span>
              </div>
              {f.count !== null && f.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400">{f.count}</span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Email list / detail */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-3 glass-card rounded-xl overflow-hidden">
          {selectedEmail ? (
            /* Email detail view */
            <div className="p-5">
              <button data-testid="back-to-list" onClick={() => setSelectedEmail(null)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4">
                <ArrowLeft className="w-4 h-4" />Back to list
              </button>
              <div className="mb-4">
                <h2 className="text-lg font-medium mb-2">{selectedEmail.subject}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>From: <span className="text-slate-300">{selectedEmail.from}</span></span>
                  <span>To: <span className="text-slate-300">{selectedEmail.to}</span></span>
                  <span>{selectedEmail.created_at ? new Date(selectedEmail.created_at).toLocaleString() : ''}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedEmail.body}</p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400" style={{ borderColor: `${TEMPLATE_COLORS[selectedEmail.template]}30`, color: TEMPLATE_COLORS[selectedEmail.template] }}>
                  {selectedEmail.template?.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">
                  {selectedEmail.status}
                </Badge>
              </div>
            </div>
          ) : (
            /* Email list */
            <div className="divide-y divide-white/5">
              {emails.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm mb-3">No emails yet</p>
                  <p className="text-xs text-slate-600 mb-4">Click "Send Test Emails" to simulate critical event notifications</p>
                </div>
              ) : (
                emails.map(email => (
                  <button key={email.id} data-testid={`email-${email.id}`} onClick={() => openEmail(email)}
                    className={`flex items-start gap-3 w-full text-left p-4 hover:bg-white/[0.02] transition-colors ${!email.read ? 'bg-white/[0.015]' : ''}`}>
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      {email.read ? <MailOpen className="w-4 h-4 text-slate-600" /> : <Mail className="w-4 h-4 text-emerald-400" />}
                      <button onClick={(e) => toggleStar(email.id, e)} className="p-0.5">
                        {email.starred ? <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> : <StarOff className="w-3 h-3 text-slate-600" />}
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-sm truncate ${!email.read ? 'font-medium text-white' : 'text-slate-300'}`}>{email.subject}</p>
                        <span className="text-[10px] text-slate-500 flex-shrink-0">{email.created_at ? new Date(email.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{email.body?.slice(0, 100)}...</p>
                      <div className="mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${TEMPLATE_COLORS[email.template] || '#8E9EAD'}10`, color: TEMPLATE_COLORS[email.template] || '#8E9EAD' }}>
                          {email.template?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
