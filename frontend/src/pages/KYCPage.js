import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileCheck, AlertTriangle, Eye, X, Shield } from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPES = [
  { value: 'id_document', label: 'Government ID', desc: 'Passport, National ID, or Driver License' },
  { value: 'proof_of_address', label: 'Proof of Address', desc: 'Utility bill or bank statement (< 3 months)' },
  { value: 'business_registration', label: 'Business Registration', desc: 'Certificate of incorporation' },
  { value: 'passport', label: 'Passport', desc: 'International passport' },
];
const STATUS_COLORS = { pending_review: '#F59E0B', approved: '#00F298', rejected: '#EF4444' };

export default function KYCPage() {
  const { apiCall } = useAuth();
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('id_document');
  const fileInputRef = useRef(null);

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try {
      const data = await apiCall('get', '/kyc/status');
      setKycStatus(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return; }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/kyc/upload?document_type=${selectedType}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('e4n_token')}` },
          body: formData,
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Upload failed');
      }
      toast.success('Document uploaded successfully');
      loadStatus();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  return (
    <div data-testid="kyc-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: 'Cabinet Grotesk' }}>KYC Verification</h1>
        <p className="text-sm text-slate-400 mt-1">Upload documents to verify your identity and increase your trading limits</p>
      </motion.div>

      {/* Progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-medium">Verification Progress</h3>
          </div>
          <span className="text-2xl font-medium" style={{ fontFamily: 'Cabinet Grotesk', color: '#00F298' }}>{kycStatus?.completion_percentage || 0}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${kycStatus?.completion_percentage || 0}%`, background: '#00F298' }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>KYC Tier: {kycStatus?.kyc_tier || 0}</span>
          <span>Status: <span style={{ color: kycStatus?.compliance_status === 'verified' ? '#00F298' : '#F59E0B' }}>{kycStatus?.compliance_status}</span></span>
        </div>
      </motion.div>

      {/* Upload Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4">Upload Document</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {DOC_TYPES.map(dt => (
            <button
              key={dt.value}
              data-testid={`kyc-type-${dt.value}`}
              onClick={() => setSelectedType(dt.value)}
              className={`p-3 rounded-xl text-left transition-all ${selectedType === dt.value ? 'glass-card-active' : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]'}`}
            >
              <p className="text-sm font-medium">{dt.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{dt.desc}</p>
            </button>
          ))}
        </div>
        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-emerald-500/30 transition-colors">
          <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-2">Drag & drop or click to upload</p>
          <p className="text-xs text-slate-500 mb-4">JPEG, PNG, WebP, or PDF (max 10MB)</p>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleUpload} className="hidden" data-testid="kyc-file-input" />
          <Button data-testid="kyc-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ background: '#00F298', color: '#060B12' }} className="rounded-xl">
            {uploading ? 'Uploading...' : 'Select File'}
          </Button>
        </div>
      </motion.div>

      {/* Documents List */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-medium">Submitted Documents</h3>
        </div>
        <div className="divide-y divide-white/5">
          {(kycStatus?.documents || []).map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <FileCheck className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">{doc.document_type?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-500">{doc.original_filename} - {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                </div>
              </div>
              <Badge style={{ background: `${STATUS_COLORS[doc.status]}15`, color: STATUS_COLORS[doc.status], border: `1px solid ${STATUS_COLORS[doc.status]}30` }} className="text-xs">
                {doc.status?.replace(/_/g, ' ')}
              </Badge>
            </div>
          ))}
          {(kycStatus?.documents || []).length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">No documents uploaded yet</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
