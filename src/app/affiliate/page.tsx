'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  TrendingUp,
  Award,
  Wallet,
  ShoppingBag,
  Store,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ChevronRight,
  UserCheck,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { formatRupees, formatIndianNumber } from '@/lib/currency';

interface DistributorData {
  distributor: {
    id: string;
    distributorCode: string;
    businessName: string;
    districtName: string;
    phone: string;
    status: string;
    balanceRupees: number;
    joinedAt: string;
  };
  metrics: {
    monthUnits: number;
    monthRevenue: number;
    monthEarnings: number;
    targetUnits: number;
    achievementPercent: number;
    availableBalance: number;
    pendingPayoutAmount: number;
    totalEarningsAllTime: number;
  };
  sales: any[];
  payouts: any[];
  retailers: any[];
  products: any[];
}

export default function DistributorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DistributorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'retailers' | 'payouts' | 'products'>('overview');

  // Form states for New Sale
  const [selectedRetailer, setSelectedRetailer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [units, setUnits] = useState('100');
  const [notes, setNotes] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);
  const [saleMessage, setSaleMessage] = useState('');

  // Form states for New Retailer
  const [showAddRetailer, setShowAddRetailer] = useState(false);
  const [retailerName, setRetailerName] = useState('');
  const [retailerPhone, setRetailerPhone] = useState('');
  const [retailerBusiness, setRetailerBusiness] = useState('');

  // Form states for Payout
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMessage, setPayoutMessage] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/distributor/dashboard');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.products?.length > 0 && !selectedProduct) {
          setSelectedProduct(json.products[0].id);
        }
        if (json.retailers?.length > 0 && !selectedRetailer) {
          setSelectedRetailer(json.retailers[0].id);
        }
      } else {
        setError(json.error || 'Failed to load dashboard');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' });
    router.push('/login');
  };

  // Submit Sale with Instant Incentive Calculation
  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSale(true);
    setSaleMessage('');

    try {
      const res = await fetch('/api/distributor/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: selectedRetailer || null,
          productId: selectedProduct,
          units: parseInt(units, 10),
          notes,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSaleMessage(json.message);
        setUnits('100');
        setNotes('');
        await fetchDashboard();
      } else {
        setSaleMessage(`Error: ${json.error || 'Failed to record sale'}`);
      }
    } catch (err) {
      setSaleMessage('Network error submitting sale.');
    } finally {
      setSubmittingSale(false);
    }
  };

  // Add Retailer
  const handleAddRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/distributor/retailers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: retailerName,
          phone: retailerPhone,
          businessName: retailerBusiness,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddRetailer(false);
        setRetailerName('');
        setRetailerPhone('');
        setRetailerBusiness('');
        await fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Payout Request
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPayout(true);
    setPayoutMessage('');

    try {
      const res = await fetch('/api/distributor/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payoutAmount }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPayoutMessage(json.message);
        setPayoutAmount('');
        await fetchDashboard();
      } else {
        setPayoutMessage(`Error: ${json.error || 'Payout request failed'}`);
      }
    } catch (err) {
      setPayoutMessage('Network error');
    } finally {
      setSubmittingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400 font-semibold">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading NAIO Partner Portal...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-slate-300 mb-4">{error || 'Unable to load dashboard'}</p>
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

  const { distributor, metrics, sales, payouts, retailers, products } = data;
  const activeProd = products.find((p) => p.id === selectedProduct) || products[0];
  const unitRate = activeProd ? activeProd.activeIncentiveRate : 15;
  const currentUnitsNum = parseInt(units || '0', 10);
  const projectedEarning = currentUnitsNum * unitRate;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Header Navigation */}
      <header className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-900/30">
            <Package className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">NAIO PARTNER</h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {distributor.businessName} • {distributor.districtName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <span className="block text-xs font-semibold text-slate-300">{distributor.distributorCode}</span>
            <span className="text-[10px] text-emerald-400 font-medium">{distributor.status}</span>
          </div>
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Welcome & District Identification Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-emerald-400">Distributor Portal</span>
            <h2 className="text-2xl font-black text-white tracking-tight">Welcome, {distributor.businessName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              District: <span className="text-slate-200 font-medium">{distributor.districtName}</span> • Code: <span className="text-slate-200 font-medium">{distributor.distributorCode}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/30">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Available Balance</span>
              <span className="text-xl font-black text-emerald-400">{formatRupees(metrics.availableBalance)}</span>
            </div>
          </div>
        </div>

        {/* Executive KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Units Sold */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase">This Month Units</span>
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-white block">{formatIndianNumber(metrics.monthUnits)}</span>
            <span className="text-[11px] text-slate-500 block">Sales Revenue: {formatRupees(metrics.monthRevenue)}</span>
          </div>

          {/* Monthly Earnings */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase">Your Earnings</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-emerald-400 block">{formatRupees(metrics.monthEarnings)}</span>
            <span className="text-[11px] text-slate-500 block">All-Time: {formatRupees(metrics.totalEarningsAllTime)}</span>
          </div>

          {/* Monthly Target Progress */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase">Monthly Target</span>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{metrics.achievementPercent}%</span>
              <span className="text-xs text-slate-400">{metrics.monthUnits} / {metrics.targetUnits} units</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.achievementPercent)}%` }}
              />
            </div>
          </div>

          {/* Pending Payout */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase">Pending Payout</span>
              <Wallet className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-2xl font-black text-amber-400 block">{formatRupees(metrics.pendingPayoutAmount)}</span>
            <span className="text-[11px] text-slate-500 block">Withdrawal requests in review</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'Record Sale & Overview', icon: PlusCircle },
            { id: 'sales', label: 'Sales History', icon: ShoppingBag },
            { id: 'retailers', label: 'My Retailers', icon: Store },
            { id: 'payouts', label: 'Wallet & Payouts', icon: Wallet },
            { id: 'products', label: 'Products & Incentives', icon: Package },
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

        {/* TAB 1: RECORD SALE & OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Sales Entry Form (Mobile-first Android UX) */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-400" /> Record Product Sale
                </h3>
                <span className="text-xs text-slate-400">Mobile Sales Entry</span>
              </div>

              {saleMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                    saleMessage.startsWith('Error')
                      ? 'bg-red-950/60 border-red-500/40 text-red-300'
                      : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {saleMessage.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{saleMessage}</span>
                </div>
              )}

              <form onSubmit={handleRecordSale} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Retailer */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                      Target Retailer Channel
                    </label>
                    <select
                      value={selectedRetailer}
                      onChange={(e) => setSelectedRetailer(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                    >
                      {retailers.length === 0 && <option value="">Direct / No Retailer Selected</option>}
                      {retailers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.businessName || r.name} ({r.district || 'Assam'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Product */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                      NAIO Product SKU *
                    </label>
                    <select
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:border-emerald-500 focus:outline-none font-semibold text-emerald-300"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ₹{p.activeIncentiveRate}/unit incentive
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Units Input */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                      Quantity Sold (Units) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base font-bold text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Instant Calculation Preview */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Instant Incentive Preview</span>
                    <span className="text-xl font-black text-emerald-400">
                      {currentUnitsNum} × ₹{unitRate} = {formatRupees(projectedEarning)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Directly added to payable balance on submission</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Batch / Order Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional order notes or invoice reference"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingSale}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {submittingSale ? 'Recording Sale...' : `Submit Sale & Earn ${formatRupees(projectedEarning)}`}
                </button>
              </form>
            </div>

            {/* Recent Sales Summary Sidebar */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-base">Recent Sales</h3>

              {sales.length === 0 ? (
                <p className="text-xs text-slate-500">No sales recorded yet. Use the form to log your first sale.</p>
              ) : (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {sales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>{sale.product?.name || 'NAIO Product'}</span>
                        <span className="text-emerald-400">+{formatRupees(sale.incentiveAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{sale.units} units @ ₹{sale.perUnitIncentiveRate}/unit</span>
                        <span>{new Date(sale.soldAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SALES HISTORY */}
        {activeTab === 'sales' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base">Sales & Incentive Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Reference Code</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Retailer</th>
                    <th className="p-3">Product SKU</th>
                    <th className="p-3">Units</th>
                    <th className="p-3">Rate</th>
                    <th className="p-3">Sales Value</th>
                    <th className="p-3 text-right">Incentive Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-emerald-400">{s.referenceCode}</td>
                      <td className="p-3">{new Date(s.soldAt).toLocaleDateString('en-IN')}</td>
                      <td className="p-3">{s.retailer?.businessName || s.retailer?.name || 'Direct'}</td>
                      <td className="p-3 font-medium text-white">{s.product?.sku}</td>
                      <td className="p-3 font-bold">{s.units}</td>
                      <td className="p-3">₹{s.perUnitIncentiveRate}/u</td>
                      <td className="p-3">{formatRupees(s.saleAmount)}</td>
                      <td className="p-3 text-right font-black text-emerald-400">+{formatRupees(s.incentiveAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RETAILERS */}
        {activeTab === 'retailers' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">District Retail Channel Network</h3>
                <p className="text-xs text-slate-400">Manage retailers receiving NAIO products in {distributor.districtName}</p>
              </div>
              <button
                onClick={() => setShowAddRetailer(!showAddRetailer)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
              >
                + Add Retailer
              </button>
            </div>

            {showAddRetailer && (
              <form onSubmit={handleAddRetailer} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase text-emerald-400">New Retailer Registration</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Contact Name"
                    value={retailerName}
                    onChange={(e) => setRetailerName(e.target.value)}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Business / Store Name"
                    value={retailerBusiness}
                    onChange={(e) => setRetailerBusiness(e.target.value)}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={retailerPhone}
                    onChange={(e) => setRetailerPhone(e.target.value)}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Save Retailer
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {retailers.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-sm block">{r.businessName || r.name}</span>
                  <span className="text-xs text-slate-400 block">{r.name} • {r.phone || 'No phone'}</span>
                  <span className="text-[10px] text-emerald-400 block">{r.district || distributor.districtName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: WALLET & PAYOUTS */}
        {activeTab === 'payouts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-base">Request Payout</h3>

              {payoutMessage && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400">
                  {payoutMessage}
                </div>
              )}

              <form onSubmit={handleRequestPayout} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Available Balance: {formatRupees(distributor.balanceRupees)}
                  </label>
                  <input
                    type="number"
                    step="100"
                    required
                    max={distributor.balanceRupees}
                    placeholder="Enter amount in ₹"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base font-bold text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingPayout || distributor.balanceRupees <= 0}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  {submittingPayout ? 'Submitting Request...' : 'Submit Payout Request'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-base">Payout Request Ledger</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-3">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="p-3 font-bold text-white">{formatRupees(p.amount)}</td>
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
                        <td className="p-3 text-slate-400">{p.transactionReference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PRODUCTS & INCENTIVE RATES */}
        {activeTab === 'products' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base">NAIO Products & Configured Incentive Rates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((p) => (
                <div key={p.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider block">{p.sku}</span>
                  <h4 className="font-bold text-white text-base">{p.name}</h4>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-400">MRP: ₹{p.mrp}</span>
                    <span className="text-base font-black text-emerald-400">₹{p.activeIncentiveRate} / unit</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block italic">{p.campaignName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
