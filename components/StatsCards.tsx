
import React from 'react';
import { SpendingSummary } from '../types';

interface StatsCardsProps {
  summary: SpendingSummary;
}

const StatsCards: React.FC<StatsCardsProps> = ({ summary }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const isOverBudget = summary.remainingBalance < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Daily Total */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-colors">
        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Tổng chi hôm nay</span>
        <span className="text-2xl font-bold text-red-600">{formatCurrency(summary.dailyTotal)}</span>
      </div>

      {/* Monthly Budget */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-colors">
        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Ngân sách tháng</span>
        <span className="text-2xl font-bold text-emerald-600">
          {formatCurrency(summary.monthlyBudget)}
        </span>
      </div>

      {/* Monthly Spent */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-colors">
        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Tổng chi tháng này</span>
        <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(summary.monthlyTotal)}</span>
      </div>

      {/* Remaining Balance */}
      <div className={`p-6 rounded-2xl shadow-sm border flex flex-col transition-colors ${
        isOverBudget 
          ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900' 
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
      }`}>
        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Số dư còn lại</span>
        <span className={`text-2xl font-bold ${isOverBudget ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
          {formatCurrency(summary.remainingBalance)}
        </span>
      </div>

      {/* Category Breakdown (Now separate below) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:col-span-4 transition-colors">
        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">Phân bổ chi tiêu (Tháng)</span>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Object.entries(summary.byCategory).map(([cat, val]) => (
            <div key={cat} className="flex flex-col min-w-max border-r border-slate-100 dark:border-slate-800 pr-4 last:border-0">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">{cat}</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(val as number)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
