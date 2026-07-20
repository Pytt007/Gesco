
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { Users, UserPlus, UserMinus, AlertTriangle, TrendingUp, DollarSign, GraduationCap } from 'lucide-react';
import { Student, Transaction } from '../types';

interface StatisticsProps {
  students: Student[];
  transactions: Transaction[];
}

const Statistics: React.FC<StatisticsProps> = ({ students, transactions }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'financial'>('students');
  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  // --- 1. CALCULS KPI ÉLÈVES ---
  const studentKPIs = useMemo(() => {
      const total = students.length;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const newThisMonth = students.filter(s => {
          if (!s.joinDate) return false;
          const d = new Date(s.joinDate);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      const newThisYear = students.filter(s => {
          if (!s.joinDate) return false;
          const d = new Date(s.joinDate);
          return d.getFullYear() === currentYear; // Simplifié pour l'année civile, idéalement année scolaire
      }).length;

      const inactiveCount = students.filter(s => s.status === 'Inactif').length;
      const dropoutRate = total > 0 ? ((inactiveCount / total) * 100).toFixed(1) : '0';

      // Élèves en difficulté (Assiduité < 80% OU Paiement 'En retard')
      const atRiskCount = students.filter(s => s.attendance < 80 || s.feesStatus === 'En retard').length;

      return { total, newThisMonth, newThisYear, inactiveCount, dropoutRate, atRiskCount };
  }, [students]);

  // --- 1.2. CALCULS DE PARITÉ (GENRE) ---
  const genderStats = useMemo(() => {
    // FIX m2 — genre 'undefined' n'est plus compté dans les garçons
    const boysCount = students.filter(s => s.gender === 'Masculin').length;
    const girlsCount = students.filter(s => s.gender === 'Féminin').length;
    const unknownCount = students.filter(s => !s.gender || (s.gender !== 'Masculin' && s.gender !== 'Féminin')).length;
    const total = students.length;
    const boysPercent = total > 0 ? Math.round((boysCount / total) * 100) : 0;
    const girlsPercent = total > 0 ? Math.round((girlsCount / total) * 100) : 0;
    
    const chartData = [
      { name: 'Garçons', value: boysCount, color: '#3B82F6' },
      { name: 'Filles', value: girlsCount, color: '#EC4899' },
      ...(unknownCount > 0 ? [{ name: 'Non renseigné', value: unknownCount, color: '#9CA3AF' }] : [])
    ];
    
    return {
      boysCount,
      girlsCount,
      unknownCount,
      boysPercent,
      girlsPercent,
      chartData
    };
  }, [students]);

  // --- 2. ÉVOLUTION DES INSCRIPTIONS (LINE CHART) ---
  const enrollmentTrend = useMemo(() => {
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      const data = months.map(m => ({ name: m, value: 0 }));
      
      students.forEach(s => {
          if (s.joinDate) {
              const monthIndex = new Date(s.joinDate).getMonth();
              data[monthIndex].value += 1;
          }
      });
      return data;
  }, [students]);

  // --- 3. TOP 10 CLASSES ASSIDUES (BAR CHART) ---
  const topClassesAttendance = useMemo(() => {
      const map = new Map<string, { total: number; count: number }>();
      students.forEach(s => {
          if (!map.has(s.grade)) map.set(s.grade, { total: 0, count: 0 });
          const entry = map.get(s.grade)!;
          entry.total += s.attendance;
          entry.count += 1;
      });

      return Array.from(map.entries())
          .map(([name, data]) => ({ name, attendance: Math.round(data.total / data.count) }))
          .sort((a, b) => b.attendance - a.attendance)
          .slice(0, 10);
  }, [students]);

  // --- 4. RÉPARTITION PAR NIVEAU (PIE CHART) ---
  const distributionData = useMemo(() => {
      const map = new Map<string, number>();
      students.forEach(s => {
          const level = s.grade.split(' ')[0] || 'Autre'; 
          map.set(level, (map.get(level) || 0) + 1);
      });
      return Array.from(map.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
  }, [students]);

  // --- 5. CALCULS FINANCIERS (EXISTANT) ---
  const financialData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const data = months.map(m => ({ name: m, revenue: 0, expense: 0 }));
    transactions.forEach(t => {
        const monthIndex = new Date(t.date).getMonth();
        if (t.type === 'income') data[monthIndex].revenue += t.amount;
        else data[monthIndex].expense += t.amount;
    });
    return data;
  }, [transactions]);

  // --- 6. LISTE ÉLÈVES EN DIFFICULTÉ ---
  const studentsAtRisk = useMemo(() => {
      return students
        .filter(s => s.attendance < 85 || s.feesStatus === 'En retard')
        .sort((a, b) => a.attendance - b.attendance)
        .slice(0, 10); // Top 10 worst
  }, [students]);

  return (
    <div className="space-y-6 h-full flex flex-col font-sans">
       
       {/* TABS Selector */}
       <div className="bg-slate-100 dark:bg-zinc-900 rounded-xl p-1 flex overflow-x-auto shrink-0 border border-gray-200/40 dark:border-zinc-850/80 max-w-md">
          <button 
            onClick={() => setActiveTab('students')} 
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'students' 
                ? 'bg-white dark:bg-slate-800 shadow-premium-sm text-blue-600 dark:text-white' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            Statistiques Élèves
          </button>
          <button 
            onClick={() => setActiveTab('financial')} 
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'financial' 
                ? 'bg-white dark:bg-slate-800 shadow-premium-sm text-blue-600 dark:text-white' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            Statistiques Financières
          </button>
       </div>

       <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
       
       {activeTab === 'students' && (
            <>
              {/* KPI CARDS - STUDENTS */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="card-premium-pattern card-premium-blue p-5 rounded-xl flex justify-between items-start">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Total Inscrits</p>
                        <h3 className="text-xl font-bold tracking-tight">{studentKPIs.total}</h3>
                        <p className="text-[10px] opacity-90 font-bold flex items-center gap-1"><TrendingUp size={11}/> +{studentKPIs.newThisYear} T1</p>
                     </div>
                     <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg"><Users size={16}/></div>
                  </div>

                  <div className="card-premium-pattern card-premium-green p-5 rounded-xl flex justify-between items-start">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Nouveaux (Mois)</p>
                        <h3 className="text-xl font-bold tracking-tight">{studentKPIs.newThisMonth}</h3>
                        <p className="text-[10px] opacity-75 font-medium">Actifs</p>
                     </div>
                     <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg"><UserPlus size={16}/></div>
                  </div>

                  <div className="card-premium-pattern card-premium-indigo p-5 rounded-xl flex justify-between items-start">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Garçons</p>
                        <h3 className="text-xl font-bold tracking-tight">{genderStats.boysCount}</h3>
                        <p className="text-[10px] opacity-75 font-medium">{genderStats.boysPercent}% total</p>
                     </div>
                     <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg"><Users size={16}/></div>
                  </div>

                  <div className="card-premium-pattern card-premium-rose p-5 rounded-xl flex justify-between items-start">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Filles</p>
                        <h3 className="text-xl font-bold tracking-tight">{genderStats.girlsCount}</h3>
                        <p className="text-[10px] opacity-75 font-medium">{genderStats.girlsPercent}% total</p>
                     </div>
                     <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg"><Users size={16}/></div>
                  </div>

                  <div className="card-premium-pattern card-premium-orange p-5 rounded-xl flex justify-between items-start">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Taux d'abandon</p>
                        <h3 className="text-xl font-bold tracking-tight">{studentKPIs.dropoutRate}%</h3>
                        <p className="text-[10px] opacity-90 font-bold">{studentKPIs.inactiveCount} inactifs</p>
                     </div>
                     <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg"><UserMinus size={16}/></div>
                  </div>

                  <div className="card-premium-pattern card-premium-purple p-5 rounded-xl flex justify-between items-start">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">À Risque</p>
                        <h3 className="text-xl font-bold tracking-tight">{studentKPIs.atRiskCount}</h3>
                        <p className="text-[10px] opacity-90 font-bold">Assiduité / Retard</p>
                     </div>
                     <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg"><AlertTriangle size={16}/></div>
                  </div>
               </div>

               {/* CHARTS ROW 1 */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
                  
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 flex flex-col">
                     <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6">Évolution des Inscriptions</h3>
                     {students.length > 0 ? (
                       <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={enrollmentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                   <linearGradient id="colorInscrStats" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                   </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#0f172a', color: '#fff' }} />
                                <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                                <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInscrStats)" name="Inscrits" />
                             </AreaChart>
                          </ResponsiveContainer>
                       </div>
                     ) : (
                       <div className="h-64 w-full flex flex-col items-center justify-center text-center">
                          <TrendingUp size={24} className="text-slate-350 dark:text-zinc-650 mb-2 opacity-60" />
                          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Aucune inscription</p>
                          <p className="text-[9px] text-slate-450 dark:text-zinc-600 mt-0.5 px-4">Enregistrez des élèves pour voir la courbe de croissance.</p>
                       </div>
                     )}
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 flex flex-col">
                     <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6">Répartition par Niveau</h3>
                     {students.length > 0 ? (
                       <div className="h-64 w-full flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie
                                   data={distributionData}
                                   cx="50%"
                                   cy="50%"
                                   innerRadius={50}
                                   outerRadius={75}
                                   fill="#8884d8"
                                   paddingAngle={3}
                                   dataKey="value"
                                   stroke="none"
                                >
                                   {distributionData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                   ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#0f172a', color: '#fff' }} />
                                <Legend verticalAlign="bottom" height={48} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '9px', paddingTop: '6px', lineHeight: '18px' }} />
                             </PieChart>
                          </ResponsiveContainer>
                       </div>
                     ) : (
                       <div className="h-64 w-full flex-1 flex flex-col items-center justify-center text-center">
                          <Users size={24} className="text-slate-350 dark:text-zinc-650 mb-2 opacity-60" />
                          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Aucune répartition</p>
                          <p className="text-[9px] text-slate-450 dark:text-zinc-600 mt-0.5 px-4">Les statistiques par niveau s'afficheront une fois des élèves enregistrés.</p>
                       </div>
                     )}
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 flex flex-col">
                     <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6">Parité des Élèves</h3>
                     {students.length > 0 ? (
                       <div className="h-64 w-full flex-1 relative flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie
                                   data={genderStats.chartData}
                                   cx="50%"
                                   cy="50%"
                                   innerRadius={55}
                                   outerRadius={75}
                                   paddingAngle={3}
                                   dataKey="value"
                                   stroke="none"
                                >
                                   {genderStats.chartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                   ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#0f172a', color: '#fff' }} />
                                <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                             </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-15px]">
                             <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{genderStats.girlsPercent}%</span>
                             <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider mt-1">Filles</span>
                          </div>
                       </div>
                     ) : (
                       <div className="h-64 w-full flex-1 flex flex-col items-center justify-center text-center">
                          <Users size={24} className="text-slate-350 dark:text-zinc-650 mb-2 opacity-60" />
                          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Aucun élève</p>
                          <p className="text-[9px] text-slate-450 dark:text-zinc-600 mt-0.5 px-4">Enregistrez des élèves avec leur genre pour afficher la parité.</p>
                       </div>
                     )}
                  </div>
              </div>

              {/* CHARTS ROW 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6">Top 10 Classes Assidues</h3>
                    {students.length > 0 ? (
                      <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topClassesAttendance} layout="vertical" margin={{ left: 10, right: 10, bottom: 0, top: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
                               <XAxis type="number" domain={[0, 100]} hide />
                               <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} width={65} />
                               <Tooltip 
                                   cursor={{fill: 'transparent'}}
                                   contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#0f172a', color: '#fff' }}
                                   formatter={(value: number) => [`${value}%`, 'Assiduité moyenne']}
                               />
                               <Bar dataKey="attendance" fill="#10B981" radius={[0, 6, 6, 0]} barSize={12} name="Taux (%)">
                                   {topClassesAttendance.map((entry, index) => (
                                       <Cell key={`cell-${index}`} fill={index < 3 ? '#10B981' : '#3B82F6'} />
                                   ))}
                               </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 w-full flex flex-col items-center justify-center text-center">
                         <GraduationCap size={24} className="text-slate-350 dark:text-zinc-650 mb-2 opacity-60" />
                         <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Aucune assiduité</p>
                         <p className="text-[9px] text-slate-450 dark:text-zinc-600 mt-0.5 px-4">Le classement des classes s'affichera une fois des élèves enregistrés.</p>
                      </div>
                    )}
                 </div>

                 <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 overflow-hidden flex flex-col">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                       <AlertTriangle size={18} className="text-orange-500" />
                       Élèves en difficulté
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold mb-4 leading-relaxed">Basé sur l'assiduité (&lt;85%) et les dossiers de paiement en retard.</p>
                    <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                       {studentsAtRisk.length === 0 ? (
                           <div className="text-center text-slate-400 text-xs py-8">Aucun élève à risque identifié.</div>
                       ) : (
                           studentsAtRisk.map(s => (
                               <div key={s.id} className="p-3 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-200/60 dark:border-zinc-850/70 flex justify-between items-center hover:border-slate-700/55 transition-all">
                                   <div>
                                       <p className="font-bold text-slate-800 dark:text-white text-xs">{s.lastName} {s.firstName}</p>
                                       <p className="text-[10px] text-slate-450 dark:text-slate-450 font-semibold mt-0.5">{s.grade}</p>
                                   </div>
                                   <div className="text-right">
                                       {s.attendance < 85 ? (
                                           <span className="block text-xs font-black text-red-500">{s.attendance}% Prés.</span>
                                       ) : (
                                           <span className="block text-xs font-black text-orange-500">Impayé</span>
                                       )}
                                   </div>
                               </div>
                           ))
                       )}
                    </div>
                 </div>
              </div>
            </>
        )}

        {activeTab === 'financial' && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 transition-colors">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6">Évolution Financière (Revenus vs Dépenses)</h3>
              <div className="h-96 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRevStats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpStats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#0f172a', color: '#fff' }} 
                        formatter={(value: number) => [`${value.toLocaleString()} CFA`, '']}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevStats)" name="Revenus" />
                    <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpStats)" name="Dépenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
        )}
        
        </div>
    </div>
  );
};

export default Statistics;
