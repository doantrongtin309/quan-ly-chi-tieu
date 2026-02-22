
import React from 'react';
import { SpendingEntry } from '../types';

interface CalendarViewProps {
  entries: SpendingEntry[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ entries, currentDate, setCurrentDate }) => {
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '';
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      maximumFractionDigits: 0 
    }).format(amount).replace('₫', '');
  };

  const getDailyTotal = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return entries
      .filter(e => e.date === dateStr)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const isDarkMode = document.documentElement.classList.contains('dark');

  const days = [];
  // Days from previous month for padding
  const paddingDays = startDay === 0 ? 6 : startDay - 1;
  for (let i = 0; i < paddingDays; i++) {
    days.push(<div key={`empty-${i}`} className={`h-20 sm:h-24 border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}></div>);
  }

  // Days of current month
  for (let d = 1; d <= totalDays; d++) {
    const total = getDailyTotal(d);
    const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
    
    days.push(
      <div key={d} className={`h-20 sm:h-24 p-1 sm:p-2 border flex flex-col transition-colors ${isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'} ${isToday ? (isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50/30') : (isDarkMode ? 'bg-slate-900' : 'bg-white')}`}>
        <span className={`text-[10px] sm:text-xs font-bold mb-1 ${isToday ? 'text-blue-500 bg-blue-500/10 w-5 h-5 flex items-center justify-center rounded-full' : 'text-slate-400 dark:text-slate-500'}`}>
          {d}
        </span>
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {total > 0 && (
            <span className="text-[9px] sm:text-[11px] font-bold text-red-600 dark:text-red-500 text-center break-all leading-tight">
              {formatCurrency(total)}
            </span>
          )}
        </div>
      </div>
    );
  }

  const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

  return (
    <div className={`rounded-2xl shadow-sm border overflow-hidden animate-in fade-in duration-300 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
      <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <h3 className="font-bold">{monthNames[month]} {year}</h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button onClick={nextMonth} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
      
      <div className={`grid grid-cols-7 border-b ${isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
          <div key={day} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7">
        {days}
      </div>
    </div>
  );
};

export default CalendarView;
