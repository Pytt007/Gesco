import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { Search, Clock, ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Info, PlusCircle, Trash2, FileEdit } from 'lucide-react';

interface HistoryProps {
  logs: ActivityLog[];
}

const History: React.FC<HistoryProps> = ({ logs }) => {
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Dimanche
  
  // Ajustement pour commencer la semaine le Lundi (1) au lieu de Dimanche (0)
  const startingBlankDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Navigation Mois
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Vérifie si une date a des événements dans l'historique global
  const hasEvents = (day: number) => {
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return logs.some(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate.toDateString() === dateToCheck.toDateString();
    });
  };

  // Filtrage des données pour la date SÉLECTIONNÉE
  const filteredHistory = logs.filter(item => {
    const itemDate = new Date(item.timestamp);
    const isSameDate = itemDate.toDateString() === selectedDate.toDateString();
    
    const matchesSearch = 
      item.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    return isSameDate && matchesSearch;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 whenever filters change
  const handleDateSelect = (date: Date) => { setSelectedDate(date); setCurrentPage(1); };
  const handleSearch = (term: string) => { setSearchTerm(term); setCurrentPage(1); };

  const getIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'create': return <PlusCircle size={18} className="text-green-600 dark:text-green-400" />;
      case 'delete': return <Trash2 size={18} className="text-red-600 dark:text-red-400" />;
      case 'update': return <FileEdit size={18} className="text-blue-600 dark:text-blue-400" />;
      case 'warning': return <AlertTriangle size={18} className="text-orange-600 dark:text-orange-400" />;
      default: return <Info size={18} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const getBadgeColor = (module: string) => {
    switch (module) {
      case 'Finance': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Scolarité': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'RH': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Système': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'Communication': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'Cantine': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="h-full flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 transition-colors">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          Historique d'activité de l'établissement
        </h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input 
            type="text"
            placeholder="Filtrer cette date..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-950 text-xs font-semibold text-gray-900 dark:text-white placeholder-slate-500 outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        {/* Calendar Section */}
        <div className="lg:w-80 shrink-0">
           <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 p-5 transition-colors">
              {/* Calendar Controls */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer">
                  <ChevronLeft size={16} />
                </button>
                <h3 className="text-sm font-extrabold text-slate-850 dark:text-white">
                  {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer">
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Week Days */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-[10px] font-bold text-slate-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Blank days */}
                {Array.from({ length: startingBlankDays }).map((_, i) => (
                  <div key={`blank-${i}`} className="aspect-square"></div>
                ))}
                
                {/* Days of Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                   const day = i + 1;
                   const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                   const isSelected = date.toDateString() === selectedDate.toDateString();
                   const isToday = date.toDateString() === new Date().toDateString();
                   const hasActivity = hasEvents(day);

                   return (
                     <button
                        key={day}
                        onClick={() => handleDateSelect(date)}
                        className={`
                          relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all cursor-pointer
                          ${isSelected 
                            ? 'bg-blue-600 text-white shadow-premium-sm-lg scale-105 z-10 font-bold' 
                            : 'text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-zinc-900/60'
                          }
                          ${isToday && !isSelected ? 'border border-blue-500/80 text-blue-500' : ''}
                        `}
                     >
                        {day}
                        {hasActivity && (
                          <span className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></span>
                        )}
                     </button>
                   );
                })}
              </div>
           </div>
        </div>

        {/* Activity List Section */}
        <div className="flex-1 min-h-[400px]">
           <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 p-6 h-full flex flex-col transition-colors">
              <div className="mb-5 pb-4 border-b border-slate-200/60 dark:border-zinc-850 flex justify-between items-center">
                 <div>
                   <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                     <CalendarIcon size={16} className="text-slate-400" />
                     Événements du {selectedDate.getDate()} {months[selectedDate.getMonth()]}
                   </h3>
                   <p className="text-[10px] font-bold text-slate-400 mt-1">
                      {filteredHistory.length} action{filteredHistory.length > 1 ? 's' : ''} répertoriée{filteredHistory.length > 1 ? 's' : ''}
                   </p>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                {filteredHistory.length > 0 ? (
                  paginatedHistory.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-850/70 hover:border-blue-500/30 hover:shadow-premium-sm transition-all duration-200 group">
                      <div>
                         <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-premium-sm border border-slate-200/60/50 dark:border-zinc-850">
                            {getIcon(item.type)}
                         </div>
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                            <h4 className="text-xs font-bold text-slate-850 dark:text-white">{item.action}</h4>
                            <span className="text-[9px] font-bold tabular-nums text-slate-400 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-lg border border-slate-200/60/60 dark:border-zinc-850/85">
                              {formatTime(item.timestamp)}
                            </span>
                         </div>
                         <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed mb-3">{item.details}</p>
                         
                         {(item.oldValue !== undefined || item.newValue !== undefined) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 mb-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-slate-200/60/70 dark:border-zinc-850 text-[10px] font-mono leading-normal">
                               {item.oldValue !== undefined && (
                                  <div className="text-slate-500">
                                     <span className="font-bold text-red-500/80 uppercase tracking-wider block mb-1">Ancienne valeur :</span>
                                     <div className="break-all whitespace-pre-wrap max-h-24 overflow-y-auto p-2 bg-red-50/20 dark:bg-red-950/10 border border-red-100/50 dark:border-red-900/20 rounded-lg">{item.oldValue || '—'}</div>
                                  </div>
                               )}
                               {item.newValue !== undefined && (
                                  <div className="text-slate-600 dark:text-slate-350">
                                     <span className="font-bold text-green-600 dark:text-green-400 uppercase tracking-wider block mb-1">Nouvelle valeur :</span>
                                     <div className="break-all whitespace-pre-wrap max-h-24 overflow-y-auto p-2 bg-green-50/20 dark:bg-green-950/10 border border-green-100/50 dark:border-green-900/20 rounded-lg">{item.newValue || '—'}</div>
                                  </div>
                               )}
                            </div>
                         )}
                         
                         <div className="flex flex-wrap items-center gap-3 text-[10px]">
                            <span className={`px-2 py-0.5 rounded-lg font-bold ${getBadgeColor(item.module)}`}>
                              {item.module}
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                               <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] text-slate-600 dark:text-slate-300 font-black">
                                 {item.user.charAt(0).toUpperCase()}
                               </div>
                               {item.user}
                            </span>
                         </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                     <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-zinc-950 flex items-center justify-center mb-3">
                        <Clock size={24} className="opacity-50" />
                     </div>
                     <p className="text-xs font-bold text-slate-850 dark:text-white">Aucun événement</p>
                     <p className="text-[10px] text-slate-400 mt-1">Il n'y a pas d'activité enregistrée pour cette date.</p>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 dark:border-zinc-850 mt-4">
                  <span className="text-[10px] font-bold text-slate-400">
                    Page {currentPage} / {totalPages} — {filteredHistory.length} entrées
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200/60 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronLeft size={14} className="text-slate-500" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200/60 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronRight size={14} className="text-slate-500" />
                    </button>
                  </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default History;
