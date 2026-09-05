'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Award,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Package,
  Store,
  Wallet,
  Users,
  MapPin,
  ChevronRight,
  IndianRupee,
} from 'lucide-react';
import { formatRupees } from '@/lib/currency';

export default function LandingPage() {
  const [selectedProduct, setSelectedProduct] = useState<'oyster' | 'dried'>('oyster');
  const [unitsCount, setUnitsCount] = useState<number>(100);

  const rate = selectedProduct === 'oyster' ? 15 : 10;
  const estimatedEarnings = unitsCount * rate;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Banner / Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-4 lg:px-12 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <Package className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                NAIO PARTNER
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                NAIO FOODS DISTRIBUTOR PLATFORM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Distributor Login
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center gap-2"
            >
              Apply as Partner <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-4 lg:px-12 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> NAIO Foods Assam Partner Program
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            SELL. EARN. <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">GROW.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Empowering district distributors across Assam with automated unit-based incentives on fresh produce & processed food distribution. Direct payments, real-time sales attribution, and clear growth targets.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-base font-bold rounded-xl transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3"
            >
              Become a Distributor <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Partner Portal Sign In
            </Link>
          </div>

          {/* Key Value Highlights */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="block text-2xl font-bold text-emerald-400">₹15 / unit</span>
              <span className="text-xs text-slate-400">Incentive on Fresh Oyster Mushrooms</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="block text-2xl font-bold text-teal-400">₹10 / unit</span>
              <span className="text-xs text-slate-400">Incentive on Processed Products</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="block text-2xl font-bold text-emerald-400">11 Districts</span>
              <span className="text-xs text-slate-400">Assam Territory Coverage</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="block text-2xl font-bold text-teal-400">Direct Payouts</span>
              <span className="text-xs text-slate-400">Bank & UPI Settlement</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Incentive Calculator Section */}
      <section className="py-16 bg-slate-900/40 border-y border-slate-800/50 px-4 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Incentive Calculator</h2>
            <p className="text-sm text-slate-400">See how much you can earn based on your monthly retail sales volume.</p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Select Product Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedProduct('oyster')}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                      selectedProduct === 'oyster'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Fresh Oyster (₹15/unit)
                  </button>
                  <button
                    onClick={() => setSelectedProduct('dried')}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                      selectedProduct === 'dried'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Dried / Powder (₹10/unit)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Monthly Units Sold: {unitsCount}</label>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={unitsCount}
                  onChange={(e) => setUnitsCount(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-3"
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-950 to-teal-950/80 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-semibold text-slate-400 block">Calculated Distributor Earning</span>
                <span className="text-3xl font-black text-emerald-400">{formatRupees(estimatedEarnings)}</span>
                <span className="text-xs text-slate-500 block mt-1">
                  ({unitsCount} units × ₹{rate} per unit incentive)
                </span>
              </div>
              <Link
                href="/register"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap"
              >
                Start Earning Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Step Workflow */}
      <section className="py-20 px-4 lg:px-12 max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">HOW IT WORKS</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">5 Simple Steps to Grow With NAIO</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center">
              1
            </div>
            <h3 className="font-bold text-white text-base">Join NAIO Partner</h3>
            <p className="text-xs text-slate-400">Apply with your district and business details to receive your unique Distributor ID.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center">
              2
            </div>
            <h3 className="font-bold text-white text-base">Distribute NAIO</h3>
            <p className="text-xs text-slate-400">Supply fresh oyster mushrooms and processed products to retailers in your district.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center">
              3
            </div>
            <h3 className="font-bold text-white text-base">Record Sales</h3>
            <p className="text-xs text-slate-400">Submit unit sales through the mobile-friendly portal in seconds.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center">
              4
            </div>
            <h3 className="font-bold text-white text-base">Earn Incentives</h3>
            <p className="text-xs text-slate-400">Receive automatic per-unit incentives (₹10/₹15) directly into your partner wallet.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center">
              5
            </div>
            <h3 className="font-bold text-white text-base">Get Paid</h3>
            <p className="text-xs text-slate-400">Request payout directly to your bank account or UPI with transparent status tracking.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-900 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} NAIO Foods. All rights reserved. NAIO Partner Platform.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Assam, India</span>
            <span>•</span>
            <Link href="/login" className="hover:text-emerald-400">Admin Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}