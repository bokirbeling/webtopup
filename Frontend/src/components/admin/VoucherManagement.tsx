import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Calendar, Users, TrendingUp } from 'lucide-react';

interface Voucher {
  id: string;
  code: string;
  type: 'admin' | 'affiliate' | 'reseller';
  created_by: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_usage: number | null;
  current_usage: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  applies_to: {
    min_amount?: number;
    categories?: string[];
    products?: string[];
  };
  metadata: {
    description?: string;
    commission_cut?: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface VoucherFormData {
  code: string;
  type: 'admin' | 'affiliate' | 'reseller';
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  max_usage: string;
  valid_until: string;
  min_amount: string;
  description: string;
}

const API_BASE = '/api';

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [formData, setFormData] = useState<VoucherFormData>({
    code: '',
    type: 'admin',
    discount_type: 'percentage',
    discount_value: '',
    max_usage: '',
    valid_until: '',
    min_amount: '',
    description: ''
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      const response = await fetch(`${API_BASE}/vouchers/list`);
      const data = await response.json();
      setVouchers(data.vouchers || []);
    } catch (error) {
      console.error('Failed to fetch vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      code: formData.code.toUpperCase(),
      type: formData.type,
      discount_type: formData.discount_type,
      discount_value: formData.discount_type === 'percentage' 
        ? parseInt(formData.discount_value) * 100 // Convert to basis points
        : parseInt(formData.discount_value) * 100, // Convert to minor units
      max_usage: formData.max_usage ? parseInt(formData.max_usage) : null,
      valid_until: formData.valid_until || null,
      applies_to: {
        min_amount: formData.min_amount ? parseInt(formData.min_amount) * 100 : undefined
      },
      metadata: {
        description: formData.description
      }
    };

    try {
      const url = editingVoucher 
        ? `${API_BASE}/vouchers/${editingVoucher.id}`
        : `${API_BASE}/vouchers/create`;
      
      const method = editingVoucher ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchVouchers();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save voucher');
      }
    } catch (error) {
      console.error('Failed to save voucher:', error);
      alert('Failed to save voucher');
    }
  };

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setFormData({
      code: voucher.code,
      type: voucher.type,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_type === 'percentage'
        ? (voucher.discount_value / 100).toString()
        : (voucher.discount_value / 100).toString(),
      max_usage: voucher.max_usage?.toString() || '',
      valid_until: voucher.valid_until ? voucher.valid_until.split('T')[0] : '',
      min_amount: voucher.applies_to.min_amount 
        ? (voucher.applies_to.min_amount / 100).toString() 
        : '',
      description: voucher.metadata.description || ''
    });
    setShowForm(true);
  };

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      const response = await fetch(`${API_BASE}/vouchers/${voucher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !voucher.is_active })
      });

      if (response.ok) {
        await fetchVouchers();
      }
    } catch (error) {
      console.error('Failed to toggle voucher:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voucher?')) return;

    try {
      const response = await fetch(`${API_BASE}/vouchers/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchVouchers();
      }
    } catch (error) {
      console.error('Failed to delete voucher:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'admin',
      discount_type: 'percentage',
      discount_value: '',
      max_usage: '',
      valid_until: '',
      min_amount: '',
      description: ''
    });
    setEditingVoucher(null);
    setShowForm(false);
  };

  const formatDiscount = (voucher: Voucher) => {
    if (voucher.discount_type === 'percentage') {
      return `${voucher.discount_value / 100}%`;
    }
    return `Rp ${(voucher.discount_value / 100).toLocaleString('id-ID')}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'No expiry';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading vouchers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Voucher Management</h1>
            <p className="text-slate-400 mt-1">Create and manage promo codes</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition"
          >
            <Plus size={20} />
            Create Voucher
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/10 rounded-xl">
                <TrendingUp className="text-cyan-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Vouchers</p>
                <p className="text-2xl font-black text-white">{vouchers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Eye className="text-green-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Active</p>
                <p className="text-2xl font-black text-white">
                  {vouchers.filter(v => v.is_active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Users className="text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Affiliate</p>
                <p className="text-2xl font-black text-white">
                  {vouchers.filter(v => v.type === 'affiliate').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Calendar className="text-orange-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Usage</p>
                <p className="text-2xl font-black text-white">
                  {vouchers.reduce((sum, v) => sum + v.current_usage, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-black text-white mb-6">
              {editingVoucher ? 'Edit Voucher' : 'Create New Voucher'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Voucher Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  placeholder="WELCOME10"
                  required
                  disabled={!!editingVoucher}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'admin' | 'affiliate' | 'reseller' })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="affiliate">Affiliate</option>
                  <option value="reseller">Reseller</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Discount Type
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (Rp)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(Rp)'}
                </label>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  placeholder={formData.discount_type === 'percentage' ? '10' : '20000'}
                  required
                  min="1"
                  max={formData.discount_type === 'percentage' ? '100' : undefined}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Max Usage (optional)
                </label>
                <input
                  type="number"
                  value={formData.max_usage}
                  onChange={(e) => setFormData({ ...formData, max_usage: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  placeholder="100"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Valid Until (optional)
                </label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Min Amount (Rp, optional)
                </label>
                <input
                  type="number"
                  value={formData.min_amount}
                  onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  placeholder="10000"
                  min="0"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Welcome discount for new users"
                  rows={2}
                />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition"
                >
                  {editingVoucher ? 'Update Voucher' : 'Create Voucher'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vouchers List */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-300">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-300">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-300">Discount</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-300">Usage</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-300">Valid Until</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-300">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {vouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-slate-900/30 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-white">{voucher.code}</p>
                        {voucher.metadata.description && (
                          <p className="text-xs text-slate-400 mt-1">{voucher.metadata.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        voucher.type === 'admin' 
                          ? 'bg-purple-500/10 text-purple-400' 
                          : voucher.type === 'affiliate'
                          ? 'bg-orange-500/10 text-orange-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {voucher.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-cyan-400">{formatDiscount(voucher)}</p>
                      {voucher.applies_to.min_amount && (
                        <p className="text-xs text-slate-400 mt-1">
                          Min: Rp {(voucher.applies_to.min_amount / 100).toLocaleString('id-ID')}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">
                        {voucher.current_usage} / {voucher.max_usage || '∞'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-300">{formatDate(voucher.valid_until)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(voucher)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition ${
                          voucher.is_active
                            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {voucher.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                        {voucher.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(voucher)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-cyan-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(voucher.id)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
