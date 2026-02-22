
import React, { useState, useEffect } from 'react';
import { SpendingEntry, Category, SpendingSummary } from './types';
import { parseSpendingInput } from './services/geminiService';
import StatsCards from './components/StatsCards';
import Charts from './components/Charts';
import CalendarView from './components/CalendarView';

const App: React.FC = () => {
  const [entries, setEntries] = useState<SpendingEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRetroactive, setIsRetroactive] = useState(false);
  const [retroDate, setRetroDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'sheets'>('dashboard');
  const [historySubTab, setHistorySubTab] = useState<'calendar' | 'list'>('calendar');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [webhookUrl, setWebhookUrl] = useState<string>(localStorage.getItem('spending_webhook_url') || '');
  
  const [viewDate, setViewDate] = useState(new Date());

  // Budget State
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const saved = localStorage.getItem('spending_monthly_budget');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('spending_dark_mode') === 'true');

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'month' | 'year'>('month');
  const [selectedExportMonth, setSelectedExportMonth] = useState(new Date().getMonth() + 1);
  const [selectedExportYear, setSelectedExportYear] = useState(new Date().getFullYear());

  // Custom Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'single' | 'all';
    id?: string;
  }>({ show: false, type: 'single' });

  useEffect(() => {
    const saved = localStorage.getItem('spending_entries');
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load entries", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('spending_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('spending_monthly_budget', monthlyBudget.toString());
  }, [monthlyBudget]);

  // Sync Dark Mode with DOM
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('spending_dark_mode', isDarkMode.toString());
  }, [isDarkMode]);

  const handleSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt không hỗ trợ giọng nói.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => prev ? `${prev}, ${transcript}` : transcript);
    };
    recognition.start();
  };

  const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  const handleAddSpending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const parts = inputText.split(',').map(p => p.trim()).filter(p => p.length > 0);
      const targetDate = isRetroactive ? retroDate : new Date().toISOString().split('T')[0];
      const results = await Promise.all(parts.map(async (part) => {
        const parsed = await parseSpendingInput(part);
        return { id: generateId(), date: targetDate, amount: parsed.amount, category: parsed.category, description: parsed.description, originalText: part };
      }));
      setEntries(prev => [...results, ...prev]);
      setInputText('');
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      alert("Lỗi xử lý AI");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteExport = () => {
    let filtered = entries;
    if (exportType === 'month') {
      const monthStr = `${selectedExportYear}-${String(selectedExportMonth).padStart(2, '0')}`;
      filtered = entries.filter(e => e.date.startsWith(monthStr));
    } else {
      filtered = entries.filter(e => e.date.startsWith(`${selectedExportYear}`));
    }
    if (filtered.length === 0) return alert("Không có dữ liệu");
    
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    let csv = "\uFEFFNgày,Mô tả,Danh mục,Số tiền\n";
    filtered.forEach(e => csv += `${e.date},${e.description},${e.category},${e.amount}\n`);
    csv += `\nTổng cộng,,,${total}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_cao_${exportType}.csv`;
    link.click();
    setShowExportModal(false);
  };

  const confirmDelete = () => {
    if (deleteConfirm.type === 'single' && deleteConfirm.id) {
      setEntries(prev => prev.filter(e => e.id !== deleteConfirm.id));
    } else if (deleteConfirm.type === 'all') {
      setEntries([]);
    }
    setDeleteConfirm({ show: false, type: 'single' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  const summary: SpendingSummary = (() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthlyTotal = entries.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0);
    
    return {
      dailyTotal: entries.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0),
      monthlyTotal,
      monthlyBudget,
      remainingBalance: monthlyBudget - monthlyTotal,
      byCategory: entries.filter(e => e.date.startsWith(thisMonth)).reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {} as Record<Category, number>)
    };
  })();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col items-center p-4 pb-24 lg:p-8`}>
      <header className="w-full max-w-5xl flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Chi tiêu AI</h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-sm`}>Tự động phân loại & quản lý tài chính</p>
        </div>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-yellow-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          title={isDarkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
        >
          <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
        </button>
      </header>

      <main className="w-full max-w-5xl">
        <section className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-2xl shadow-sm border mb-8`}>
          <form onSubmit={handleAddSpending}>
            <div className="relative mb-4">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ví dụ: 35k ăn sáng, 115k cafe..."
                className={`w-full pl-12 pr-32 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 placeholder-slate-500 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
                <button type="button" onClick={handleSpeech} className={`w-10 h-10 flex items-center justify-center rounded-full ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400'}`}>
                  <i className="fa-solid fa-microphone-lines text-lg"></i>
                </button>
              </div>
              <button type="submit" disabled={isProcessing || !inputText.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300">
                {isProcessing ? '...' : 'Thêm'}
              </button>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-400 italic">* Nhấn Microphone để nói. Nhiều khoản dùng dấu phẩy.</p>
              <button type="button" onClick={() => setIsRetroactive(!isRetroactive)} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${isRetroactive ? (isDarkMode ? 'bg-blue-900/30 border-blue-800 text-blue-400' : 'bg-blue-50 text-blue-700') : (isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white')}`}>
                <i className="fa-solid fa-clock-rotate-left mr-2"></i>Ghi bù
              </button>
            </div>
            {isRetroactive && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">CHỌN NGÀY:</span>
                <input type="date" value={retroDate} onChange={(e) => setRetroDate(e.target.value)} className={`px-3 py-1.5 border rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`} />
              </div>
            )}
          </form>
        </section>

        {activeTab === 'dashboard' && (
          <>
            <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-4 rounded-2xl shadow-sm border mb-8 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-piggy-bank"></i>
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Ngân sách tháng này</h4>
                  <p className="text-xs text-slate-400 italic">Số tiền vốn dự định tiêu trong tháng</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input 
                  type="number" 
                  value={monthlyBudget || ''} 
                  onChange={(e) => setMonthlyBudget(parseInt(e.target.value, 10) || 0)}
                  placeholder="Nhập số tiền..."
                  className={`flex-1 md:w-48 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
                <span className="font-bold text-slate-400">₫</span>
              </div>
            </div>
            <StatsCards summary={summary} />
            <Charts entries={entries} />
          </>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className={`flex p-1 rounded-xl shadow-sm border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <button onClick={() => setHistorySubTab('calendar')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${historySubTab === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Lịch tháng</button>
                <button onClick={() => setHistorySubTab('list')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${historySubTab === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Danh sách chi tiết</button>
              </div>
              <button onClick={() => setShowExportModal(true)} className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2">
                <i className="fa-solid fa-file-excel"></i>Xuất sang Excel
              </button>
            </div>
            {historySubTab === 'calendar' ? (
              <CalendarView entries={entries} currentDate={viewDate} setCurrentDate={setViewDate} />
            ) : (
              <section className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} rounded-2xl shadow-sm border overflow-hidden`}>
                <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <h3 className="font-bold text-lg uppercase tracking-tight">Chi tiết chi tiêu ({viewDate.getMonth() + 1}/{viewDate.getFullYear()})</h3>
                  <button onClick={() => setDeleteConfirm({ show: true, type: 'all' })} className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1">Xóa tất cả</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className={`text-[11px] font-bold uppercase tracking-widest border-b ${isDarkMode ? 'bg-slate-800/50 text-slate-500 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      <tr>
                        <th className="px-6 py-4">NGÀY</th>
                        <th className="px-6 py-4">MÔ TẢ</th>
                        <th className="px-6 py-4">DANH MỤC</th>
                        <th className="px-6 py-4 text-right">SỐ TIỀN</th>
                        <th className="px-6 py-4 text-center">XÓA</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {entries.filter(e => e.date.startsWith(viewDate.toISOString().slice(0, 7))).length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Chưa có dữ liệu.</td></tr>
                      ) : (
                        <>
                          {entries.filter(e => e.date.startsWith(viewDate.toISOString().slice(0, 7))).sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
                            <tr key={entry.id} className={`${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors`}>
                              <td className="px-6 py-4 text-sm whitespace-nowrap">{entry.date}</td>
                              <td className="px-6 py-4 text-sm font-medium">{entry.description}{entry.originalText && <span className="block text-[10px] text-slate-500 italic font-normal">"{entry.originalText}"</span>}</td>
                              <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>{entry.category}</span></td>
                              <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(entry.amount)}</td>
                              <td className="px-6 py-4 text-center">
                                <button onClick={() => setDeleteConfirm({ show: true, type: 'single', id: entry.id })} className="w-10 h-10 inline-flex items-center justify-center text-slate-300 hover:text-red-500 rounded-full transition-colors"><i className="fa-solid fa-trash-can text-lg"></i></button>
                              </td>
                            </tr>
                          ))}
                          <tr className={`font-bold border-t-2 ${isDarkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <td colSpan={3} className="px-6 py-5 text-sm text-right uppercase tracking-wider">Tổng cộng tháng:</td>
                            <td className="px-6 py-5 text-lg text-red-600 text-right whitespace-nowrap">{formatCurrency(entries.filter(e => e.date.startsWith(viewDate.toISOString().slice(0, 7))).reduce((sum, e) => sum + e.amount, 0))}</td>
                            <td></td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'sheets' && (
          <section className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-100 text-slate-600'} p-8 rounded-2xl shadow-sm border`}>
            <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Cài đặt & Hướng dẫn</h3>
            <p>Ứng dụng lưu dữ liệu tại trình duyệt web này.</p>
            <div className={`mt-6 p-4 rounded-xl border mb-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Cách quản lý tài chính:</h4>
              <ul className="list-disc ml-5 text-sm space-y-1">
                <li>Thiết lập "Ngân sách tháng" ở màn hình chính để theo dõi số vốn hiện có.</li>
                <li>Mỗi khi thêm khoản chi, hệ thống tự động trừ vào ngân sách.</li>
                <li>Theo dõi "Số dư còn lại" để tránh chi tiêu quá đà.</li>
              </ul>
            </div>
            <label className="block text-sm font-bold mb-2 uppercase">Webhook URL</label>
            <input type="text" value={webhookUrl} onChange={(e) => { setWebhookUrl(e.target.value); localStorage.setItem('spending_webhook_url', e.target.value); }} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} placeholder="https://..." />
          </section>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className={`${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'} rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200`}>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><i className="fa-solid fa-triangle-exclamation"></i></div>
              <h3 className="text-xl font-bold mb-2">Xác nhận xóa?</h3>
              <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-sm mb-6`}>{deleteConfirm.type === 'single' ? "Bạn có chắc chắn muốn xóa mục chi tiêu này không?" : "Hành động này sẽ xóa toàn bộ dữ liệu. Bạn chắc chứ?"}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm({ show: false, type: 'single' })} className={`flex-1 py-3 font-bold rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>Hủy</button>
                <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all">Xác nhận</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'} rounded-2xl shadow-2xl w-full max-w-md p-6`}>
            <h3 className="text-xl font-bold mb-6">Xuất báo cáo Excel</h3>
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} flex p-1 rounded-xl mb-6`}>
              <button onClick={() => setExportType('month')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${exportType === 'month' ? (isDarkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}>Tháng</button>
              <button onClick={() => setExportType('year')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${exportType === 'year' ? (isDarkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}>Năm</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {exportType === 'month' && (
                <select value={selectedExportMonth} onChange={(e) => setSelectedExportMonth(Number(e.target.value))} className={`px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
                  {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                </select>
              )}
              <select value={selectedExportYear} onChange={(e) => setSelectedExportYear(Number(e.target.value))} className={`px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'} ${exportType === 'year' ? 'col-span-2' : ''}`}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>Năm {y}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowExportModal(false)} className={`flex-1 py-3 font-bold ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'} rounded-xl transition-colors`}>Hủy</button>
              <button onClick={handleExecuteExport} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all">Tải về Excel</button>
            </div>
          </div>
        </div>
      )}

      <nav className={`fixed bottom-0 left-0 right-0 border-t p-3 flex justify-around items-center z-50 shadow-lg transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-blue-500' : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}>
          <i className="fa-solid fa-chart-pie text-xl"></i><span className="text-[10px] font-bold">Tổng quan</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-blue-500' : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}>
          <i className="fa-solid fa-calendar-alt text-xl"></i><span className="text-[10px] font-bold">Lịch sử</span>
        </button>
        <button onClick={() => setActiveTab('sheets')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'sheets' ? 'text-blue-500' : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}>
          <i className="fa-solid fa-gear text-xl"></i><span className="text-[10px] font-bold">Cài đặt</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
