import React, { useState, useMemo } from 'react';
import { Users, CreditCard, AlertCircle, CheckCircle, TrendingUp, ChevronRight, Activity, Smile, Gift, Trophy, Sparkles, GraduationCap, Calendar, X, Utensils, Bus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { ViewState, StatCardProps, Student, Transaction, SchoolFeeRecord, ActivityLog } from '../types';

interface DashboardProps {
  schoolName: string;
  directorName: string;
  students: Student[];
  transactions: Transaction[];
  feeRecords: SchoolFeeRecord[];
  historyLogs: ActivityLog[];
  onNavigate?: (view: ViewState) => void;
  setScolarityFilter?: (mode: 'all' | 'late' | 'paid') => void;
}

const StatCard: React.FC<{
  title: string;
  value: string;
  trend?: string;
  icon: React.ReactNode;
  bgClass: string;
  textClass: string;
  iconBgClass: string;
  onClick?: () => void;
}> = ({ title, value, trend, icon, bgClass, textClass, iconBgClass, onClick }) => {
  const getPremiumClass = (bg: string) => {
    if (bg.includes('blue')) return 'card-premium-pattern card-premium-blue';
    if (bg.includes('rose')) return 'card-premium-pattern card-premium-rose';
    if (bg.includes('amber') || bg.includes('orange')) return 'card-premium-pattern card-premium-orange';
    if (bg.includes('emerald') || bg.includes('green')) return 'card-premium-pattern card-premium-green';
    if (bg.includes('purple') || bg.includes('violet')) return 'card-premium-pattern card-premium-purple';
    return 'card-premium-pattern card-premium-indigo';
  };

  return (
    <div 
      onClick={onClick} 
      className={`${getPremiumClass(bgClass)} p-5 rounded-xl transition-all duration-200 group ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="inline-flex items-center text-[10px] font-semibold opacity-90">
                <TrendingUp size={11} className="inline mr-1" />
                {trend} ce mois
              </span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm text-white border border-white/20 transition-colors shrink-0">
          {React.cloneElement(icon as React.ReactElement, { size: 18 })}
        </div>
      </div>
    </div>
  );
};

const CustomDot = (props: any) => {
  const { cx, cy, stroke, index } = props;
  if (index === 3) {
    return (
      <circle cx={cx} cy={cy} r={5} fill={stroke} stroke="#fff" strokeWidth={2} />
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ schoolName, directorName, students, transactions, feeRecords, historyLogs, onNavigate = (_view: ViewState) => {}, setScolarityFilter = (_mode: 'all' | 'late' | 'paid') => {} }) => {
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const COLORS = ['#3B82F6', '#FF5A5F', '#FFB800', '#10B981', '#A78BFA', '#F472B6', '#6366F1'];
  const DONUT_COLORS = ['#8b5cf6', '#ec4899', '#eab308', '#3B82F6', '#10B981', '#FF5A5F'];

  // Obtention de la date actuelle pour l'affichage
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedDate = today.charAt(0).toUpperCase() + today.slice(1);

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' CFA';
  };

  const getInstallmentData = (val: any) => {
    if (typeof val === 'number') {
      return { amount: val, date: '', method: '' };
    }
    return {
      amount: val?.amount || 0,
      date: val?.date || '',
      method: val?.method || ''
    };
  };

  // --- CALCULATED STATS ---
  const totalStudents = students.length;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const newStudentsThisMonth = useMemo(() => {
    return students.filter(s => {
      if (!s.joinDate) return false;
      const d = new Date(s.joinDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [students, currentMonth, currentYear]);

  const studentTrend = newStudentsThisMonth > 0 ? `+${newStudentsThisMonth}` : '';

  const monthlyRevenue = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  const prevMonthRevenue = useMemo(() => {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'income' && d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions, prevMonth, prevMonthYear]);

  const revenueTrend = useMemo(() => {
    if (monthlyRevenue === 0 && prevMonthRevenue === 0) return '';
    if (prevMonthRevenue === 0) return '+100%';
    const diff = ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;
    return `${diff >= 0 ? '+' : ''}${Math.round(diff)}%`;
  }, [monthlyRevenue, prevMonthRevenue]);

  const lateFeesCount = feeRecords.filter(r => r.remainingGlobal > 0).length;

  const avgAttendance = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.attendance, 0) / students.length)
    : 0;

  const monthlyRevenueBreakdown = useMemo(() => {
    let scolarite = 0;
    let cantine = 0;
    let transport = 0;
    let autre = 0;

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const cat = t.category.trim();
        const desc = t.description.toLowerCase();

        if (cat === 'Scolarité' || desc.includes('scolarit')) {
          scolarite += t.amount;
        } else if (cat === 'Cantine' || desc.includes('cantin')) {
          cantine += t.amount;
        } else if (cat === 'Transport' || cat === 'Car' || desc.includes('transport') || desc.includes('car ') || desc.includes('bus')) {
          transport += t.amount;
        } else {
          autre += t.amount;
        }
      }
    });

    return { scolarite, cantine, transport, autre };
  }, [transactions, currentMonth, currentYear]);

  const scolariteStats = useMemo(() => {
    const totalPaid = feeRecords.reduce((acc, curr) => acc + curr.totalPaid, 0);
    const totalExpected = feeRecords.reduce((acc, curr) => acc + curr.netDue, 0);
    const totalRemaining = totalExpected - totalPaid;
    const recoveryRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
    return { totalPaid, totalExpected, totalRemaining, recoveryRate };
  }, [feeRecords]);

  const scolaritePayments = useMemo(() => {
    const payments: Array<{
      id: string;
      studentName: string;
      class: string;
      installmentKey: string;
      amount: number;
      date: string;
      method: string;
    }> = [];

    feeRecords.forEach(record => {
      Object.entries(record.installments).forEach(([key, val]) => {
        const { amount, date, method } = getInstallmentData(val);
        if (amount > 0) {
          payments.push({
            id: `${record.id}-${key}`,
            studentName: record.studentName,
            class: record.class,
            installmentKey: key.toUpperCase(),
            amount,
            date: date || '',
            method: method || 'Mobile Money'
          });
        }
      });
    });

    return payments
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, 8); // Keep up to 8 items since it scrolls now
  }, [feeRecords]);

  const [financialPeriod, setFinancialPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');

  const dynamicRevenueData = useMemo(() => {
    if (financialPeriod === 'DAILY') {
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      return days.map((day, i) => {
        let revenue = 0;
        let expense = 0;
        transactions.forEach(t => {
          const d = new Date(t.date);
          const dayOfWeek = (d.getDay() + 6) % 7;
          if (d.getFullYear() === currentYear && dayOfWeek === i) {
            if (t.type === 'income') revenue += t.amount;
            else expense += t.amount;
          }
        });
        return { name: day, revenue, expense };
      });
    }
    
    if (financialPeriod === 'WEEKLY') {
      const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      return weeks.map((w, i) => {
        let revenue = 0;
        let expense = 0;
        transactions.forEach(t => {
          const d = new Date(t.date);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            const weekIdx = Math.min(3, Math.floor((d.getDate() - 1) / 7));
            if (weekIdx === i) {
              if (t.type === 'income') revenue += t.amount;
              else expense += t.amount;
            }
          }
        });
        return { name: w, revenue, expense };
      });
    }

    if (financialPeriod === 'YEARLY') {
      const years = [currentYear - 2, currentYear - 1, currentYear];
      return years.map(y => {
        let revenue = 0;
        let expense = 0;
        transactions.forEach(t => {
          const d = new Date(t.date);
          if (d.getFullYear() === y) {
            if (t.type === 'income') revenue += t.amount;
            else expense += t.amount;
          }
        });
        return { name: String(y), revenue, expense };
      });
    }

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return months.map((m, i) => {
      let revenue = 0;
      let expense = 0;
      transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === currentYear && d.getMonth() === i) {
          if (t.type === 'income') revenue += t.amount;
          else expense += t.amount;
        }
      });
      return { name: m, revenue, expense };
    });
  }, [transactions, currentYear, currentMonth, financialPeriod]);

  const hasFinancialData = useMemo(() => {
    return dynamicRevenueData.some(d => d.revenue > 0 || d.expense > 0);
  }, [dynamicRevenueData]);

  const studentDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    students.forEach(s => {
      dist[s.grade] = (dist[s.grade] || 0) + 1;
    });
    const total = students.length;
    return Object.entries(dist)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [students]);

  const aggregatedStudentDistribution = useMemo(() => {
    if (studentDistribution.length <= 3) return studentDistribution;
    const top2 = studentDistribution.slice(0, 2);
    const othersCount = studentDistribution.slice(2).reduce((sum, item) => sum + item.value, 0);
    const total = students.length;
    const othersPercentage = total > 0 ? Math.round((othersCount / total) * 100) : 0;
    return [
      ...top2,
      { name: 'Autres', value: othersCount, percentage: othersPercentage }
    ];
  }, [studentDistribution, students.length]);

  const recentActivity = historyLogs.slice(0, 8); // Keep up to 8 items since it scrolls now

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} j`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Playful Welcome Banner with Floating Chick Mascot */}
      <div className="bg-slate-50 border border-slate-150/70 dark:bg-zinc-900 dark:border-zinc-850 rounded-xl p-4 md:py-4.5 md:px-8 relative overflow-hidden transition-all shadow-sm shrink-0">
        {/* Soft Colored Orbs */}
        <div className="absolute right-[20%] top-[-20%] w-72 h-72 rounded-full bg-blue-400/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute left-[30%] bottom-[-20%] w-72 h-72 rounded-full bg-rose-400/10 blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 max-w-full md:max-w-[55%] space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-450 rounded-xl text-[10px] font-bold uppercase tracking-wider">
            <Calendar size={11} />
            {formattedDate}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-850 dark:text-white leading-tight">
              Bonjour, {directorName} 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed max-w-xl">
              L'activité bat son plein aujourd'hui à l'établissement <span className="font-bold text-slate-800 dark:text-white">{schoolName}</span>. Les statistiques d'apprentissage sont au vert !
            </p>
          </div>
        </div>

        {/* Mascot Image positioned neatly in bottom-right (fully contained) */}
        <div className="absolute right-8 bottom-2 top-2 w-72 md:w-[24rem] hidden md:flex items-center justify-center pointer-events-none">
          <img 
            src="/school-kid-banner.png" 
            alt="Mascotte GESCO" 
            className="max-h-full object-contain drop-shadow-lg transform hover:scale-105 hover:rotate-3 transition-transform duration-500" 
          />
        </div>
      </div>

      {/* Playful Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <StatCard 
          title="Total Élèves" 
          value={totalStudents.toString()} 
          trend={studentTrend} 
          icon={<GraduationCap size={18} />} 
          bgClass="bg-blue-500/10" 
          textClass="text-blue-600 dark:text-blue-450" 
          iconBgClass="bg-blue-500/10 dark:bg-blue-500/20" 
          onClick={() => onNavigate(ViewState.STUDENTS)}
        />
        <StatCard 
          title="Revenus (Mois)" 
          value={`${monthlyRevenue.toLocaleString()} F`} 
          trend={revenueTrend} 
          icon={<CreditCard size={18} />} 
          bgClass="bg-rose-500/10" 
          textClass="text-rose-600 dark:text-rose-450" 
          iconBgClass="bg-rose-500/10 dark:bg-rose-500/20" 
          onClick={() => setIsRevenueModalOpen(true)}
        />
        <StatCard 
          title="Frais en retard" 
          value={lateFeesCount.toString()} 
          trend="" 
          icon={<AlertCircle size={18} />} 
          bgClass="bg-amber-500/10" 
          textClass="text-amber-600 dark:text-amber-450" 
          iconBgClass="bg-amber-500/10 dark:bg-amber-500/20" 
          onClick={() => {
            setScolarityFilter('late');
            onNavigate(ViewState.SCOLARITY);
          }}
        />
        <StatCard 
          title="Taux de présence" 
          value={`${avgAttendance}%`} 
          trend="" 
          icon={<Smile size={18} />} 
          bgClass="bg-emerald-500/10" 
          textClass="text-emerald-600 dark:text-emerald-450" 
          iconBgClass="bg-emerald-500/10 dark:bg-emerald-500/20" 
        />
      </div>

      {/* Scolarity Summary Card */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 transition-colors shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          <h3 className="text-[10px] font-bold text-slate-450 dark:text-zinc-400 uppercase tracking-wider">Situation Scolarité Globale</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">Total Attendu (Annuel)</p>
            <p className="text-lg font-bold text-slate-900 dark:text-zinc-100 mt-1 tracking-tight">{formatMoney(scolariteStats.totalExpected)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">Total Encaissé</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-450 mt-1 tracking-tight">{formatMoney(scolariteStats.totalPaid)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">Reste à Recouvrer</p>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-450 mt-1 tracking-tight">{formatMoney(scolariteStats.totalRemaining)}</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-400 dark:text-zinc-500">Taux de Recouvrement</span>
              <span className="text-blue-600 dark:text-blue-450">{scolariteStats.recoveryRate}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(scolariteStats.recoveryRate, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Charts & Lists side-by-side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Financial Chart */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 transition-colors flex flex-col min-h-[300px] md:h-[360px] md:col-span-4 justify-between">
          <div className="flex items-center justify-between mb-3 shrink-0 pb-2 border-b border-slate-50 dark:border-zinc-800/50">
            <div className="flex gap-2 items-end max-w-full">
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((period) => {
                const label = period === 'DAILY' ? 'JOURNALIER' :
                              period === 'WEEKLY' ? 'HEBDOMADAIRE' :
                              period === 'MONTHLY' ? 'MENSUEL' : 'ANNUEL';
                return (
                  <button
                    key={period}
                    onClick={() => setFinancialPeriod(period)}
                    className={`pb-1 text-[8px] sm:text-[9px] font-black tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      financialPeriod === period
                        ? 'text-slate-800 dark:text-zinc-150 border-b-2 border-rose-500'
                        : 'text-slate-400 dark:text-zinc-500 hover:text-slate-650'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full mt-2 flex flex-col items-center justify-center">
            {hasFinancialData ? (
              <ResponsiveContainer width="100%" height="100%" debounce={1}>
                <AreaChart data={dynamicRevenueData} margin={{ top: 10, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" strokeOpacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 9 }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 9 }} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: '#18181b', color: '#fff', fontSize: '10px' }}
                    formatter={(value: number) => [`${value.toLocaleString()} CFA`, '']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" name="Revenus" dot={<CustomDot stroke="#8B5CF6" />} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#8B5CF6' }} />
                  <Area type="monotone" dataKey="expense" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" name="Dépenses" dot={<CustomDot stroke="#F59E0B" />} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#F59E0B' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <TrendingUp size={24} className="text-slate-350 dark:text-zinc-650 mb-2 opacity-60" />
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Aucune transaction</p>
                <p className="text-[9px] text-slate-450 dark:text-zinc-600 mt-0.5">Aucune donnée financière enregistrée pour cette période.</p>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 text-[9px] font-bold mt-2 pt-2 border-t border-slate-50 dark:border-zinc-800/50 shrink-0">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span> Revenus
            </span>
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Dépenses
            </span>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 transition-colors flex flex-col min-h-[300px] md:h-[360px] md:col-span-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-2 shrink-0">Répartition par Niveau</h3>
          {students.length > 0 ? (
            <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-between">
              <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%" debounce={1}>
                  <PieChart>
                    <Pie
                      data={aggregatedStudentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={68}
                      fill="#8884d8"
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {aggregatedStudentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#18181b', color: '#fff', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Premium Legend Layout */}
              <div className="mt-4 flex justify-around w-full shrink-0 border-t border-slate-100 dark:border-zinc-800/80 pt-4">
                {aggregatedStudentDistribution.slice(0, 3).map((item, index) => {
                  const color = DONUT_COLORS[index % DONUT_COLORS.length];
                  return (
                    <div key={item.name} className="flex flex-col items-center">
                      <span className="text-lg font-black text-slate-850 dark:text-zinc-100 leading-none">
                        {item.percentage}<span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 align-super">%</span>
                      </span>
                      <span className="flex items-center gap-1 mt-1 text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <Users size={24} className="text-slate-350 dark:text-zinc-650 mb-2 opacity-60" />
              <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Aucun élève</p>
              <p className="text-[9px] text-slate-450 dark:text-zinc-600 mt-0.5">Aucun élève n'est encore enregistré pour cette année scolaire.</p>
            </div>
          )}
        </div>

        {/* Bottom Section: Activity & Payments side-by-side or stacked vertically */}
        <div className="flex flex-col gap-4 min-h-[300px] md:h-[360px] md:col-span-5">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 transition-colors flex-1 min-h-0 flex flex-col overflow-hidden">
            <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-2.5 flex items-center gap-1.5 shrink-0">
              <Activity size={14} className="text-blue-500"/> Activités Récentes
            </h3>
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {recentActivity.length > 0 ? (
                recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-zinc-950 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-100 dark:hover:border-zinc-800">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        log.type === 'create' ? 'bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400' :
                        log.type === 'delete' ? 'bg-red-50 text-red-500 dark:bg-red-955/20 dark:text-red-400' :
                        log.type === 'warning' ? 'bg-orange-50 text-orange-600 dark:bg-orange-955/20 dark:text-orange-400' :
                        'bg-blue-50 text-blue-600 dark:bg-blue-955/20 dark:text-blue-400'
                      }`}>
                      <Sparkles size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-850 dark:text-zinc-200 truncate">{log.details}</p>
                      <p className="text-[8px] text-slate-400 dark:text-zinc-500 font-semibold mt-0.5">Il y a {timeAgo(log.timestamp)} • {log.module}</p>
                      <span className="inline-block mt-1 text-[8px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-lg max-w-full truncate">{log.user}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-[10px] italic text-center py-4">Aucune activité récente.</p>
              )}
            </div>
          </div>

          {/* Recent Scolarity Payments */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 transition-colors flex-1 min-h-0 flex flex-col overflow-hidden">
            <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-2.5 flex items-center gap-1.5 shrink-0">
              <CreditCard size={14} className="text-green-500"/> Derniers Versements Scolarité
            </h3>
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {scolaritePayments.length > 0 ? (
                scolaritePayments.map((pmt) => (
                  <div key={pmt.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-zinc-950 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-100 dark:hover:border-zinc-800">
                    <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-450 flex items-center justify-center shrink-0">
                      <Gift size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1.5">
                        <p className="text-[10px] font-bold text-slate-850 dark:text-zinc-200 truncate">{pmt.studentName}</p>
                        <span className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md shrink-0">{pmt.class}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[8px] text-slate-400 dark:text-zinc-500 font-semibold">
                          {pmt.installmentKey} • via {pmt.method}
                        </p>
                        <p className="text-[10px] font-bold text-green-600 dark:text-green-450 tabular-nums">
                          +{pmt.amount.toLocaleString()} F
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-[10px] italic text-center py-4">Aucun versement enregistré.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* MONTHLY REVENUE BREAKDOWN MODAL */}
      {isRevenueModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[999] flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-zinc-850 p-6 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <div className="space-y-1">
                          <h2 className="text-xl font-black text-slate-850 dark:text-white flex items-center gap-2">
                              <CreditCard className="text-rose-500" size={24} /> Détail des revenus
                          </h2>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              Mois en cours (${(currentMonth + 1).toString().padStart(2, '0')}/${currentYear})
                          </p>
                      </div>
                      <button 
                          onClick={() => setIsRevenueModalOpen(false)}
                          className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                          <X size={18} />
                      </button>
                  </div>

                  <div className="space-y-4">
                      {/* Scolarité */}
                      <div className="flex justify-between items-center p-4 bg-blue-50/50 dark:bg-blue-955/10 rounded-xl border border-blue-100/50 dark:border-blue-900/20">
                          <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-blue-500 text-white rounded-xl shadow-sm"><GraduationCap size={18} /></div>
                              <div>
                                  <h4 className="font-bold text-gray-800 dark:text-white text-sm">Frais de Scolarité</h4>
                                  <p className="text-[10px] text-gray-400 font-medium">Droits d'inscription & scolarité</p>
                              </div>
                          </div>
                          <span className="font-black text-blue-600 dark:text-blue-450 text-right text-sm tabular-nums">
                              {formatMoney(monthlyRevenueBreakdown.scolarite)}
                          </span>
                      </div>

                      {/* Cantine */}
                      <div className="flex justify-between items-center p-4 bg-orange-50/50 dark:bg-orange-955/10 rounded-xl border border-orange-100/50 dark:border-orange-900/20">
                          <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-sm"><Utensils size={18} /></div>
                              <div>
                                  <h4 className="font-bold text-gray-800 dark:text-white text-sm">Service de Cantine</h4>
                                  <p className="text-[10px] text-gray-400 font-medium">Abonnements repas midi</p>
                              </div>
                          </div>
                          <span className="font-black text-orange-600 dark:text-orange-450 text-right text-sm tabular-nums">
                              {formatMoney(monthlyRevenueBreakdown.cantine)}
                          </span>
                      </div>

                      {/* Transport */}
                      <div className="flex justify-between items-center p-4 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                          <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-sm"><Bus size={18} /></div>
                              <div>
                                  <h4 className="font-bold text-gray-800 dark:text-white text-sm">Abonnement Transport</h4>
                                  <p className="text-[10px] text-gray-400 font-medium">Service de navette / car</p>
                              </div>
                          </div>
                          <span className="font-black text-indigo-600 dark:text-indigo-400 text-right text-sm tabular-nums">
                              {formatMoney(monthlyRevenueBreakdown.transport)}
                          </span>
                      </div>

                      {/* Autres */}
                      <div className="flex justify-between items-center p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-100/50 dark:border-emerald-900/20">
                          <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-sm"><Sparkles size={18} /></div>
                              <div>
                                  <h4 className="font-bold text-gray-800 dark:text-white text-sm">Autres Recettes</h4>
                                  <p className="text-[10px] text-gray-400 font-medium">Subventions, activités ext.</p>
                              </div>
                          </div>
                          <span className="font-black text-emerald-600 dark:text-emerald-450 text-right text-sm tabular-nums">
                              {formatMoney(monthlyRevenueBreakdown.autre)}
                          </span>
                      </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-zinc-850 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total Revenus</span>
                      <span className="text-base font-black text-rose-600 dark:text-rose-455 tabular-nums">
                          {formatMoney(monthlyRevenue)}
                      </span>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;