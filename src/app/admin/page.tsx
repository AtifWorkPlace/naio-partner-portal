'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Award,
  Wallet,
  Building2,
  Package,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogOut,
  RefreshCw,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { formatRupees, formatIndianNumber } from '@/lib/currency';

interface AdminDashboardData {
  kpis: {
    totalDistributors: number;
    activeDistributors: number;
    pendingDistributors: number;
    totalUnitsSold: number;
    totalSalesValue: number;
    totalIncentivesValue: number;
    pendingPayoutsValue: number;
    paidPayoutsValue: number;
  };
  districtPerformance: any[];
  topDistributors: any[];
  productPerformance: any[];
  recentSales: any[];
  payouts: any[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'distributors' | 'products' | 'payouts' | 'reversals'>('overview');

  // Distributors tab states
  const [distributorList, setDistributorList] = useState<any[]>([]);
  const [districtList, setDistrictList] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState('');

  // Products tab states
  const [productList, setProductList] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newMrp, setNewMrp] = useState('');
  const [newBuyPrice, setNewBuyPrice] = useState('');
  const [newRate, setNewRate] = useState('15');

  // Rate edit modal
  const [editingProdId, setEditingProdId] = useState('');
  const [editRateVal, setEditRateVal] = useState('15');

  // Reversal states
  const [revSaleId, setRevSaleId] = useState('');
  const [revUnits, setRevUnits] = useState('10');
  const [revReason, setRevReason] = useState('Product Damaged / Returned');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load executive admin data');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributors = async () => {
    try {
      const res = await fetch('/api/admin/distributors');
      const json = await res.json();
      if (json.success) {
        setDistributorList(json.distributors);
        setDistrictList(json.districts);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      const json = await res.json();
      if (json.success) {
        setProductList(json.products);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchDistributors();
    fetchProducts();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' });
    router.push('/login');
  };

  // Update Distributor Status (Approve / Suspend / Reactivate)
  const handleUpdateDistributorStatus = async (distributorId: string, status: string) => {
    setActionMsg('');
    try {
      const res = await fetch('/api/admin/distributors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributorId, status }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMsg(json.message);
        await fetchAdminData();
        await fetchDistributors();
      }
    } catch (err) {
      setActionMsg('Error updating distributor status');
    }
  };

  // Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newSku,
          name: newName,
          mrp: newMrp,
          distributorPrice: newBuyPrice,
          incentiveRate: newRate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddProduct(false);
        setNewSku('');
        setNewName('');
        setNewMrp('');
        setNewBuyPrice('');
        await fetchProducts();
        await fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Product Incentive Rate
  const handleUpdateIncentiveRate = async (productId: string) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          amountPerUnit: parseFloat(editRateVal),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingProdId('');
        await fetchProducts();
        await fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Payout Status (Approve / Pay / Reject)
  const handleUpdatePayoutStatus = async (payoutId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutId,
          status,
          transactionReference: `TXN-${Date.now().toString().slice(-6)}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Process Return Reversal
  const handleProcessReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/reversals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: revSaleId,
          unitsReturned: parseInt(revUnits, 10),
          reason: revReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMsg(json.message);
        setRevSaleId('');
        await fetchAdminData();
      } else {
        setActionMsg(`Error: ${json.error}`);
      }
    } catch (err) {
      setActionMsg('Failed to process reversal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400 font-semibold">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading Executive NAIO Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-slate-300 mb-4">{error || 'Unable to load admin data'}</p>
        <button
          onClick={handleLogout}
          aria-label="Logout button"
          className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white hover:bg-slate-800"
        >
          Sign Out & Try Again
        </button>
      </div>
    );
  }

  const { kpis, districtPerformance, topDistributors, productPerformance, recentSales, payouts } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Admin Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-900/30">
            <Package className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">NAIO EXECUTIVE PORTAL</h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              NAIO Foods • Assam & National Operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminData}
            title="Refresh Data"
            aria-label="Refresh Data"
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            title="Sign Out"
            aria-label="Sign Out"
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {actionMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Executive KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-xs font-semibold uppercase text-slate-400 block">Total Distributors</span>
            <span className="text-2xl font-black text-white block">{kpis.totalDistributors}</span>
            <span className="text-[11px] text-emerald-400 font-bold block">{kpis.activeDistributors} Active • {kpis.pendingDistributors} Pending</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-xs font-semibold uppercase text-slate-400 block">Total Units Sold</span>
            <span className="text-2xl font-black text-emerald-400 block">{formatIndianNumber(kpis.totalUnitsSold)}</span>
            <span className="text-[11px] text-slate-400 block">Sales Value: {formatRupees(kpis.totalSalesValue)}</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-xs font-semibold uppercase text-slate-400 block">Total Incentives</span>
            <span className="text-2xl font-black text-teal-400 block">{formatRupees(kpis.totalIncentivesValue)}</span>
            <span className="text-[11px] text-slate-400 block">Unit-Based Distribution Cost</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-xs font-semibold uppercase text-slate-400 block">Pending Payouts</span>
            <span className="text-2xl font-black text-amber-400 block">{formatRupees(kpis.pendingPayoutsValue)}</span>
            <span className="text-[11px] text-emerald-400 block">Paid: {formatRupees(kpis.paidPayoutsValue)}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'Executive Analytics', icon: TrendingUp },
            { id: 'distributors', label: 'Distributor Management', icon: Users },
            { id: 'products', label: 'Products & Incentives', icon: Package },
            { id: 'payouts', label: 'Payout Requests Ledger', icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: EXECUTIVE ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* District Performance Table */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-base">District Performance Matrix (Assam)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">District</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Distributors</th>
                      <th className="p-3">Units Sold</th>
                      <th className="p-3">Sales Value</th>
                      <th className="p-3 text-right">Incentive Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {districtPerformance.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{d.name}</td>
                        <td className="p-3 text-emerald-400 font-semibold">{d.code}</td>
                        <td className="p-3 font-bold">{d.distributorCount}</td>
                        <td className="p-3 font-black text-white">{formatIndianNumber(d.units)}</td>
                        <td className="p-3">{formatRupees(d.revenue)}</td>
                        <td className="p-3 text-right font-black text-emerald-400">{formatRupees(d.incentives)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Distributors Leaderboard */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-white text-base">Top Performing Distributors</h3>
                <div className="space-y-3">
                  {topDistributors.map((dist, idx) => (
                    <div key={dist.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xs flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <div>
                          <span className="font-bold text-white text-xs block">{dist.businessName}</span>
                          <span className="text-[10px] text-slate-400 block">{dist.code} • {dist.district}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-400 text-xs block">{formatIndianNumber(dist.units)} units</span>
                        <span className="text-[10px] text-slate-400 block">{formatRupees(dist.earnings)} earned</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Performance Matrix */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-white text-base">Product Sales Breakdown</h3>
                <div className="space-y-3">
                  {productPerformance.map((p) => (
                    <div key={p.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white text-xs block">{p.name}</span>
                        <span className="text-[10px] text-emerald-400 font-semibold block">Rate: ₹{p.currentIncentiveRate}/unit</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-white text-xs block">{formatIndianNumber(p.units)} units</span>
                        <span className="text-[10px] text-slate-400 block">Revenue: {formatRupees(p.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DISTRIBUTOR MANAGEMENT */}
        {activeTab === 'distributors' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <h3 className="font-bold text-white text-base">Distributor Onboarding & Approval Queue</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Distributor Code</th>
                    <th className="p-3">Name / Business</th>
                    <th className="p-3">Email / Phone</th>
                    <th className="p-3">District</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {distributorList.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-emerald-400">{d.distributorCode}</td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{d.businessName}</span>
                        <span className="text-[10px] text-slate-400 block">{d.user?.name}</span>
                      </td>
                      <td className="p-3">
                        <span className="block">{d.user?.email}</span>
                        <span className="text-[10px] text-slate-400 block">{d.phone || d.user?.phone}</span>
                      </td>
                      <td className="p-3">{d.districtName || 'Unassigned'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            d.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : d.status === 'PENDING'
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              : 'bg-red-950 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {d.status !== 'ACTIVE' && (
                          <button
                            onClick={() => handleUpdateDistributorStatus(d.id, 'ACTIVE')}
                            className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase rounded-lg hover:bg-emerald-400"
                          >
                            Approve
                          </button>
                        )}
                        {d.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleUpdateDistributorStatus(d.id, 'SUSPENDED')}
                            className="px-3 py-1 bg-red-950 border border-red-500/40 text-red-300 font-bold text-[10px] uppercase rounded-lg hover:bg-red-900"
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTS & INCENTIVE CONFIGURATION */}
        {activeTab === 'products' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">NAIO Catalog & Per-Unit Incentive Configurator</h3>
                <p className="text-xs text-slate-400">Configure ₹10 or ₹15 per unit incentives per product SKU</p>
              </div>
              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
              >
                + Add Product SKU
              </button>
            </div>

            {showAddProduct && (
              <form onSubmit={handleAddProduct} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase text-emerald-400">Create New NAIO Product</h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="SKU (e.g. OYSTER-200G)"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Product Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                  <input
                    type="number"
                    required
                    placeholder="MRP (₹)"
                    value={newMrp}
                    onChange={(e) => setNewMrp(e.target.value)}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Distributor Price (₹)"
                    value={newBuyPrice}
                    onChange={(e) => setNewBuyPrice(e.target.value)}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Incentive Rate (₹/unit)"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-emerald-400 font-bold"
                  />
                </div>
                <button type="submit" className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">
                  Save Product
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {productList.map((p) => {
                const activeRule = p.incentiveRules?.find((r: any) => r.active) || p.incentiveRules?.[0];
                const currentRate = activeRule ? activeRule.amountPerUnit : 15;
                const isEditing = editingProdId === p.id;

                return (
                  <div key={p.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider block">{p.sku}</span>
                    <h4 className="font-bold text-white text-base">{p.name}</h4>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>MRP: ₹{p.mrp} • Distributor Price: ₹{p.distributorPrice}</div>
                      <div className="text-emerald-400 font-bold text-sm pt-1">
                        Active Incentive: ₹{currentRate} / unit
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="number"
                          value={editRateVal}
                          onChange={(e) => setEditRateVal(e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-bold"
                        />
                        <button
                          onClick={() => handleUpdateIncentiveRate(p.id)}
                          className="px-3 py-1 bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase rounded-lg"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingProdId('')}
                          className="px-2 py-1 bg-slate-900 text-slate-400 text-[10px] rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingProdId(p.id);
                          setEditRateVal(currentRate.toString());
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-all"
                      >
                        Configure Incentive Rate
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: PAYOUTS LEDGER */}
        {activeTab === 'payouts' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base">Distributor Payout Request Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Distributor</th>
                    <th className="p-3">District</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Requested At</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{p.distributor?.businessName || p.user?.name}</td>
                      <td className="p-3">{p.distributor?.districtName || 'Assam'}</td>
                      <td className="p-3 font-black text-emerald-400">{formatRupees(p.amount)}</td>
                      <td className="p-3">{p.paymentMethod || 'Bank Transfer'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            p.status === 'PAID' || p.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : p.status === 'PENDING'
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              : 'bg-red-950 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="p-3 text-right space-x-2">
                        {p.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdatePayoutStatus(p.id, 'PAID')}
                              className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase rounded-lg hover:bg-emerald-400"
                            >
                              Approve & Mark Paid
                            </button>
                            <button
                              onClick={() => handleUpdatePayoutStatus(p.id, 'REJECTED')}
                              className="px-3 py-1 bg-red-950 border border-red-500/40 text-red-300 font-bold text-[10px] uppercase rounded-lg"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
