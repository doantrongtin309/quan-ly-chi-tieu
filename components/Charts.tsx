
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { SpendingEntry, Category } from '../types';

interface ChartsProps {
  entries: SpendingEntry[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

const Charts: React.FC<ChartsProps> = ({ entries }) => {
  // Process daily data
  const dailyData = entries.reduce((acc: any[], entry) => {
    const date = entry.date;
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.total += entry.amount;
    } else {
      acc.push({ date, total: entry.amount });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7);

  // Process category data
  const categoryData = Object.values(Category).map(cat => ({
    name: cat,
    value: entries.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
  })).filter(d => d.value > 0);

  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-80 transition-colors">
        <h3 className="text-lg font-bold mb-4 dark:text-slate-100">Chi tiêu 7 ngày gần nhất</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="date" tick={{fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b'}} />
            <YAxis tick={{fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b'}} />
            <Tooltip 
              formatter={(value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫'}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                color: isDarkMode ? '#f1f5f9' : '#0f172a'
              }}
            />
            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-80 transition-colors">
        <h3 className="text-lg font-bold mb-4 dark:text-slate-100">Cơ cấu chi tiêu</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫'}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                color: isDarkMode ? '#f1f5f9' : '#0f172a'
              }}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Charts;
