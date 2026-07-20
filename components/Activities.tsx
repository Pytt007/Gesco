
import React, { useState, useMemo } from 'react';
import { printHtml } from '../services/printService';
import * as XLSX from '@e965/xlsx';
import { Activity, ActivityRegistration, Student, NotificationType } from '../types';
import { 
  Trophy, 
  Clock, 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Settings, 
  X, 
  Save, 
  AlertCircle,
  UserPlus,
  UserMinus,
  FileSpreadsheet,
  DollarSign,
  TrendingUp,
  Download,
  Banknote,
  Printer
} from 'lucide-react';

interface ActivitiesProps {
  students: Student[];
  activities: Activity[];
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
  addNotification: (type: NotificationType, message: string) => void;
  schoolName: string;
  schoolLogo: string;
  schoolYear: string;
}

const Activities: React.FC<ActivitiesProps> = ({ students, activities, setActivities, addNotification, schoolName, schoolLogo, schoolYear }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'financial'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour les modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // État pour le paiement
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<{activityId: string, studentId: string, currentPaid: number, price: number, studentName: string} | null>(null);
  const [amountToPay, setAmountToPay] = useState('');

  const handlePrintInvoice = (studentName: string, studentClass: string, activityName: string, price: number, amountPaid: number) => {


      const today = new Date().toLocaleDateString('fr-FR');
      // BUG-016 FIX: 8 timestamp digits + 4 random hex chars = no collisions
      const invoiceNumber = `ACT-${Date.now().toString().slice(-8)}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
      const remaining = Math.max(0, price - amountPaid);

      const htmlContent = `
        <html>
          <head>
            <title>Reçu Activité - ${studentName}</title>
            <style>
              body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #2563EB; padding-bottom: 20px; }
              .logo { max-height: 80px; margin-bottom: 15px; display: inline-block; }
              .header h1 { color: #2563EB; margin: 0; font-size: 24px; text-transform: uppercase; margin-bottom: 5px; }
              .header h2 { margin: 5px 0; font-size: 20px; color: #333; font-weight: bold; }
              .header p { margin: 5px 0; font-size: 14px; color: #666; }
              
              .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
              .info-box { width: 45%; }
              .info-label { font-size: 12px; text-transform: uppercase; color: #888; font-weight: bold; }
              .info-value { font-size: 16px; font-weight: bold; margin-top: 5px; }

              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { text-align: left; background-color: #f3f4f6; padding: 12px; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #ddd; }
              td { padding: 12px; border-bottom: 1px solid #eee; }
              
              .totals { margin-top: 30px; border-top: 2px solid #333; padding-top: 20px; }
              .totals-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
              .totals-row.final { font-size: 18px; font-weight: bold; color: #2563EB; }

              .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; }
              .stamp-area { margin-top: 40px; text-align: right; padding-right: 40px; }
              .stamp-box { display: inline-block; width: 150px; height: 80px; border: 2px dashed #ccc; text-align: center; line-height: 80px; color: #ccc; font-weight: bold; transform: rotate(-5deg); }
            </style>
          </head>
          <body>
            <div class="header">
              ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo École" class="logo" />` : ''}
              <h1>REÇU DE PAIEMENT - ACTIVITÉ</h1>
              <h2>${schoolName}</h2>
              <p>Année Scolaire ${schoolYear}</p>
            </div>

            <div class="info-grid">
              <div class="info-box">
                <div class="info-label">Élève</div>
                <div class="info-value">${studentName}</div>
                <div style="margin-top:5px; font-size:14px;">Classe: ${studentClass}</div>
                <div style="margin-top:5px; font-size:14px;">Activité: ${activityName}</div>
              </div>
              <div class="info-box" style="text-align:right;">
                <div class="info-label">Réçu N°</div>
                <div class="info-value">${invoiceNumber}</div>
                <div style="margin-top:5px; font-size:14px;">Date: ${today}</div>
              </div>
            </div>

            <h3>Détail du versement activité effectué</h3>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align:right">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Frais d'inscription à l'activité : ${activityName}</td>
                  <td style="text-align:right">${price.toLocaleString()} CFA</td>
                </tr>
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row">
                <span>Prix de l'activité:</span>
                <span>${price.toLocaleString()} CFA</span>
              </div>
              <div class="totals-row">
                <span>Total Versé à ce jour:</span>
                <span>${amountPaid.toLocaleString()} CFA</span>
              </div>
              <div class="totals-row final">
                <span>Reste à Payer:</span>
                <span>${remaining.toLocaleString()} CFA</span>
              </div>
            </div>

            <div class="stamp-area">
               <div class="stamp-box">CACHET & SIGNATURE</div>
            </div>

            <div class="footer">
              <p>Ce document est une preuve de paiement générée électroniquement.</p>
              <p>Merci de votre confiance.</p>
            </div>
          </body>
        </html>
      `;

      printHtml(htmlContent);
  };

  // État pour confirmation désinscription
  const [studentToUnregister, setStudentToUnregister] = useState<{activityId: string, studentId: string} | null>(null);

  // État pour l'édition / création
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formConfig, setFormConfig] = useState({
     name: '', day: 'Lundi', time: '', instructor: '', spots: '20', price: '0'
  });

  // État pour la gestion (inscriptions)
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  // --- CALCULS FINANCIERS ---
  const financialData = useMemo(() => {
      let totalRevenue = 0;
      let totalPending = 0;
      let totalRegistrations = 0;
      const flatList: Array<ActivityRegistration & { activityName: string, price: number, activityId: string, remaining: number, status: string }> = [];

      activities.forEach(act => {
          act.registrations.forEach(reg => {
              totalRegistrations++;
              totalRevenue += reg.amountPaid;
              const remaining = Math.max(0, act.price - reg.amountPaid);
              totalPending += remaining;
              
              let status = 'Impayé';
              if (remaining === 0) status = 'Soldé';
              else if (reg.amountPaid > 0) status = 'Partiel';

              flatList.push({
                  ...reg,
                  activityName: act.name,
                  price: act.price,
                  activityId: act.id,
                  remaining,
                  status
              });
          });
      });

      return { totalRevenue, totalPending, totalRegistrations, flatList };
  }, [activities]);

  // --- ACTIONS CRUD ---

  const handleOpenForm = (activity?: Activity) => {
      if (activity) {
          setEditingActivity(activity);
          setFormConfig({
              name: activity.name,
              day: activity.day,
              time: activity.time,
              instructor: activity.instructor,
              spots: activity.spots.toString(),
              price: activity.price.toString()
          });
      } else {
          setEditingActivity(null);
          setFormConfig({ name: '', day: 'Lundi', time: '', instructor: '', spots: '20', price: '0' });
      }
      setShowFormModal(true);
  };

  const handleSaveActivity = () => {
      if (!formConfig.name || !formConfig.instructor) return;
      
      const newActivityData = {
          name: formConfig.name,
          day: formConfig.day,
          time: formConfig.time,
          instructor: formConfig.instructor,
          spots: parseInt(formConfig.spots) || 0,
          price: parseInt(formConfig.price) || 0,
      };

      if (editingActivity) {
          setActivities(prev => prev.map(a => a.id === editingActivity.id ? { ...a, ...newActivityData } : a));
      } else {
          const newId = `A${Date.now()}`;
          setActivities(prev => [...prev, { id: newId, ...newActivityData, registrations: [] }]);
      }
      addNotification('success', 'Activité enregistrée.');
      setShowFormModal(false);
  };

  const handleDeleteActivity = () => {
      if (showDeleteConfirm) {
          const activityToDelete = activities.find(a => a.id === showDeleteConfirm);
          const totalPaidForActivity = activityToDelete?.registrations.reduce((sum, r) => sum + r.amountPaid, 0) || 0;
          
          setActivities(prev => prev.filter(a => a.id !== showDeleteConfirm));
          
          if (totalPaidForActivity > 0) {
              addNotification('warning', `Activité supprimée. Attention : ${totalPaidForActivity.toLocaleString()} F CFA de paiements encaissés ont été perdus des KPIs.`);
          } else {
              addNotification('success', 'Activité supprimée.');
          }
          setShowDeleteConfirm(null);
      }
  };

  // --- ACTIONS GESTION INSCRIPTIONS ---

  const handleOpenManage = (activity: Activity) => {
      setCurrentActivity(activity);
      setShowManageModal(true);
      setStudentSearch('');
  };

  const handleRegisterStudent = (studentId: string, studentName: string, studentClass: string) => {
      if (!currentActivity) return;
      
      if (currentActivity.registrations.some(r => r.studentId === studentId)) return;

      // FIX M4 — Vérification de la capacité avant inscription
      if (currentActivity.registrations.length >= currentActivity.spots) {
          addNotification('error', `L'activité "${currentActivity.name}" est complète (${currentActivity.spots} places). Impossible d'inscrire ${studentName}.`);
          return;
      }

      const newRegistration: ActivityRegistration = {
          studentId,
          studentName,
          studentClass,
          amountPaid: 0,
          date: new Date().toISOString().split('T')[0]
      };

      const updatedActivity = {
          ...currentActivity,
          registrations: [...currentActivity.registrations, newRegistration]
      };

      updateActivityState(updatedActivity);
      addNotification('success', 'Élève inscrit avec succès.');
  };

  const confirmUnregister = (activityId: string, studentId: string) => {
      setStudentToUnregister({ activityId, studentId });
  };

  const executeUnregisterStudent = () => {
      if (!studentToUnregister) return;
      
      const { activityId, studentId } = studentToUnregister;
      
      setActivities(prev => prev.map(act => {
          if (act.id === activityId) {
              const updated = {
                  ...act,
                  registrations: act.registrations.filter(r => r.studentId !== studentId)
              };
              // Si c'est l'activité en cours d'édition dans la modale
              if (currentActivity && currentActivity.id === activityId) {
                  setCurrentActivity(updated);
              }
              return updated;
          }
          return act;
      }));

      addNotification('success', 'Élève désinscrit.');
      setStudentToUnregister(null);
  };

  // --- GESTION PAIEMENTS ---

  const openPaymentModal = (activityId: string, studentId: string, currentPaid: number, price: number, studentName: string) => {
      setPaymentData({ activityId, studentId, currentPaid, price, studentName });
      setAmountToPay(currentPaid.toString());
      setPaymentModalOpen(true);
  };

  const handleSavePayment = () => {
      if (!paymentData) return;
      
      const newAmount = parseFloat(amountToPay) || 0;
      
      if (newAmount > paymentData.price) {
          addNotification('error', 'Le montant versé ne peut pas dépasser le prix de l\'activité.');
          return;
      }

      setActivities(prev => prev.map(act => {
          if (act.id === paymentData.activityId) {
              const updated = {
                  ...act,
                  registrations: act.registrations.map(r => 
                      r.studentId === paymentData.studentId ? { ...r, amountPaid: newAmount } : r
                  )
              };
              if (currentActivity && currentActivity.id === paymentData.activityId) {
                  setCurrentActivity(updated);
              }
              return updated;
          }
          return act;
      }));

      addNotification('success', 'Paiement mis à jour.');
      setPaymentModalOpen(false);
  };

  const updateActivityState = (updatedActivity: Activity) => {
      setCurrentActivity(updatedActivity);
      setActivities(prev => prev.map(a => a.id === updatedActivity.id ? updatedActivity : a));
  };

  const handleExportFinancials = () => {
      const data = financialData.flatList.map(item => ({
          "Activité": item.activityName,
          "Élève": item.studentName,
          "Classe": item.studentClass,
          "Date Inscription": item.date,
          "Prix Activité": item.price,
          "Montant Versé": item.amountPaid,
          "Reste à Payer": item.remaining,
          "Statut": item.status
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Activités_Finances");
      XLSX.writeFile(wb, "suivi_financier_activites.xlsx");
      addNotification('success', 'Export Excel généré.');
  };

  // --- RENDERING ---

  const filteredActivities = activities.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.instructor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFinancialList = financialData.flatList.filter(item => 
      item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.studentClass.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      
      {/* KPI CARDS (Always Visible) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
         <div className="card-premium-pattern card-premium-purple p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-bold opacity-80">Total Inscriptions</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1">{financialData.totalRegistrations}</h3>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl"><Users size={24} /></div>
         </div>
         <div className="card-premium-pattern card-premium-green p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-bold opacity-80">Chiffre d'Affaires</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1">{financialData.totalRevenue.toLocaleString()} F</h3>
              <p className="text-xs opacity-75">Encaissé</p>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl"><DollarSign size={24} /></div>
         </div>
         <div className="card-premium-pattern card-premium-orange p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-bold opacity-80">Reste à Percevoir</p>
              <h3 className="text-2xl font-bold tracking-tight mt-1">{financialData.totalPending.toLocaleString()} F</h3>
              <p className="text-xs opacity-75">En attente</p>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl"><TrendingUp size={24} /></div>
         </div>
       </div>

      {/* TABS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-2 flex overflow-x-auto shrink-0">
          <button onClick={() => setActiveTab('list')} className={`flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-white dark:bg-gray-700 shadow text-purple-600 dark:text-white font-bold' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>Liste des Activités</button>
          <button onClick={() => setActiveTab('financial')} className={`flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'financial' ? 'bg-white dark:bg-gray-700 shadow text-purple-600 dark:text-white font-bold' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>Suivi Financier</button>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700">
         <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 whitespace-nowrap">
                 {activeTab === 'list' ? <Trophy size={24} className="text-purple-600" /> : <FileSpreadsheet size={24} className="text-green-600" />}
                 {activeTab === 'list' ? 'Activités Périscolaires' : 'Tableau Financier'}
              </h2>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 hidden sm:block"></div>
              {activeTab === 'list' ? (
                  <button 
                     onClick={() => handleOpenForm()} 
                     className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 shrink-0"
                  >
                     <Plus size={18} />
                     Nouvelle Activité
                  </button>
              ) : (
                  <button 
                     onClick={handleExportFinancials} 
                     className="w-full sm:w-auto px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shrink-0"
                  >
                     <Download size={18} />
                     Exporter Excel
                  </button>
              )}
              <div className="relative flex-1 sm:w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                   type="text" 
                   placeholder={activeTab === 'list' ? "Rechercher une activité..." : "Élève, Activité, Classe..."}
                   className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 dark:text-white transition-all"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
          </div>
      </div>

      {/* CONTENT CONTENT */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
         <div className="overflow-auto flex-1 custom-scrollbar">
             {activeTab === 'list' ? (
                 <table className="w-full min-w-[800px] text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-slate-200/60 dark:border-gray-700 sticky top-0 z-10">
                       <tr>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Activité</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Horaire</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Instructeur</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Tarif</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Remplissage</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                       {filteredActivities.length === 0 ? (
                           <tr><td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400">Aucune activité trouvée.</td></tr>
                       ) : (
                           filteredActivities.map((activity) => {
                              const fillPercentage = (activity.registrations.length / activity.spots) * 100;
                              return (
                                  <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                     <td className="p-5">
                                        <div className="flex items-center gap-3">
                                           <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-sm">
                                              <Trophy size={20} />
                                           </div>
                                           <div>
                                              <p className="font-bold text-gray-800 dark:text-white">{activity.name}</p>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded inline-block mt-1">{activity.day}</p>
                                           </div>
                                        </div>
                                     </td>
                                     <td className="p-5"><div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Clock size={16} className="text-gray-400" />{activity.time}</div></td>
                                     <td className="p-5 text-sm font-medium text-gray-800 dark:text-white">{activity.instructor}</td>
                                     <td className="p-5 text-right"><span className="text-sm font-bold text-gray-800 dark:text-white tabular-nums">{activity.price > 0 ? `${activity.price.toLocaleString()} CFA` : 'Gratuit'}</span></td>
                                     <td className="p-5">
                                        <div className="w-full max-w-[140px]">
                                            <div className="flex justify-between text-xs mb-1.5"><span className="font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1"><Users size={12} /> {activity.registrations.length} / {activity.spots}</span><span className={`${fillPercentage >= 100 ? 'text-red-500' : 'text-green-500'} font-bold`}>{Math.round(fillPercentage)}%</span></div>
                                            <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${fillPercentage >= 100 ? 'bg-red-500' : fillPercentage >= 80 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(fillPercentage, 100)}%` }}></div></div>
                                        </div>
                                     </td>
                                     <td className="p-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                           <button onClick={() => handleOpenManage(activity)} className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm flex items-center gap-1"><Settings size={14} /> Gérer</button>
                                           <div className="h-4 w-px bg-gray-200 dark:bg-gray-600 mx-1"></div>
                                           <button onClick={() => handleOpenForm(activity)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                           <button onClick={() => setShowDeleteConfirm(activity.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                     </td>
                                  </tr>
                              );
                           })
                       )}
                    </tbody>
                 </table>
             ) : (
                 <table className="w-full min-w-[900px] text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-slate-200/60 dark:border-gray-700 sticky top-0 z-10">
                       <tr>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Élève</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Classe</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Activité</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Prix Total</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Déjà Versé</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Reste</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Statut</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredFinancialList.length === 0 ? (
                            <tr><td colSpan={8} className="p-12 text-center text-gray-500">Aucune inscription trouvée.</td></tr>
                        ) : (
                            filteredFinancialList.map((item, idx) => (
                                <tr key={`${item.activityId}-${item.studentId}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="p-5 font-bold text-gray-800 dark:text-white">{item.studentName}</td>
                                    <td className="p-5 text-gray-600 dark:text-gray-300">{item.studentClass}</td>
                                    <td className="p-5 text-purple-600 dark:text-purple-400 font-medium">{item.activityName}</td>
                                    <td className="p-5 text-right tabular-nums text-gray-800 dark:text-white font-medium">{item.price.toLocaleString()}</td>
                                    <td className="p-5 text-right tabular-nums text-green-600 dark:text-green-400 font-bold">{item.amountPaid.toLocaleString()}</td>
                                    <td className="p-5 text-right tabular-nums text-red-600 dark:text-red-400 font-bold">{item.remaining.toLocaleString()}</td>
                                    <td className="p-5 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                            item.status === 'Soldé' ? 'bg-green-100 text-green-700' : 
                                            item.status === 'Partiel' ? 'bg-yellow-100 text-yellow-700' : 
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => handlePrintInvoice(item.studentName, item.studentClass, item.activityName, item.price, item.amountPaid)}
                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                title="Imprimer Reçu"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handlePrintInvoice(item.studentName, item.studentClass, item.activityName, item.price, item.amountPaid)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Télécharger le reçu"
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button 
                                                onClick={() => openPaymentModal(item.activityId, item.studentId, item.amountPaid, item.price, item.studentName)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Saisir un paiement"
                                            >
                                                <Banknote size={18} />
                                            </button>
                                            <button 
                                                onClick={() => confirmUnregister(item.activityId, item.studentId)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Désinscrire"
                                            >
                                                <UserMinus size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                 </table>
             )}
         </div>
      </div>

      {/* PAYMENT MODAL */}
      {paymentModalOpen && paymentData && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex justify-center items-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-2xl">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                          <Banknote size={20} className="text-green-600" />
                          Saisir Paiement
                      </h2>
                      <button onClick={() => setPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Élève</label>
                          <p className="font-bold text-gray-800 dark:text-white">{paymentData.studentName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prix Total</label>
                              <p className="font-bold text-gray-800 dark:text-white">{paymentData.price.toLocaleString()} CFA</p>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Déjà Versé</label>
                              <p className="font-bold text-green-600">{paymentData.currentPaid.toLocaleString()} CFA</p>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nouveau Montant Total Versé</label>
                          <input 
                              type="number" 
                              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500/50 outline-none dark:bg-gray-700 dark:text-white"
                              value={amountToPay}
                              onChange={(e) => setAmountToPay(e.target.value)}
                              placeholder="Montant total..."
                          />
                          <p className="text-xs text-gray-400 mt-2">
                              Reste à payer actuel : {(paymentData.price - paymentData.currentPaid).toLocaleString()} CFA
                          </p>
                      </div>
                  </div>
                  <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800 rounded-b-2xl">
                      <button onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all">Annuler</button>
                      <button onClick={handleSavePayment} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-lg shadow-green-500/30">Enregistrer</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODALE : Formulaire Ajout / Edition */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200/60 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in duration-200">
               <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
                   <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      {editingActivity ? <Edit2 size={20} className="text-purple-600" /> : <Plus size={20} className="text-purple-600" />}
                      {editingActivity ? 'Modifier l\'activité' : 'Nouvelle Activité'}
                   </h2>
                   <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
               </div>
               <div className="p-6 space-y-4">
                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nom de l'activité</label>
                       <input 
                         type="text" 
                         className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none transition-all dark:text-white" 
                         value={formConfig.name}
                         onChange={(e) => setFormConfig({...formConfig, name: e.target.value})}
                         placeholder="Ex: Club Robotique"
                       />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Jour</label>
                           <select 
                              className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none transition-all dark:text-white"
                              value={formConfig.day}
                              onChange={(e) => setFormConfig({...formConfig, day: e.target.value})}
                           >
                              {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(d => <option key={d} value={d}>{d}</option>)}
                           </select>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Horaire</label>
                           <input 
                             type="text" 
                             className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none transition-all dark:text-white" 
                             value={formConfig.time}
                             onChange={(e) => setFormConfig({...formConfig, time: e.target.value})}
                             placeholder="Ex: 14:00 - 16:00"
                           />
                       </div>
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Instructeur</label>
                       <input 
                         type="text" 
                         className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none transition-all dark:text-white" 
                         value={formConfig.instructor}
                         onChange={(e) => setFormConfig({...formConfig, instructor: e.target.value})}
                         placeholder="Ex: Mme Dupont"
                       />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Places Dispo.</label>
                           <input 
                             type="number" 
                             className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none transition-all dark:text-white" 
                             value={formConfig.spots}
                             onChange={(e) => setFormConfig({...formConfig, spots: e.target.value})}
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Prix (CFA)</label>
                           <input 
                             type="number" 
                             className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none transition-all dark:text-white" 
                             value={formConfig.price}
                             onChange={(e) => setFormConfig({...formConfig, price: e.target.value})}
                           />
                       </div>
                   </div>
               </div>
               <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800 rounded-b-2xl">
                   <button onClick={() => setShowFormModal(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Annuler</button>
                   <button onClick={handleSaveActivity} className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-500/30 flex items-center gap-2"><Save size={18} /> Enregistrer</button>
               </div>
           </div>
        </div>
      )}

      {/* MODALE : Gestion Inscriptions ("Gérer") */}
      {showManageModal && currentActivity && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200/60 dark:border-gray-700 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
               {/* Header Modale */}
               <div className="p-6 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
                   <div>
                       <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                          <Settings size={24} className="text-purple-600" />
                          Gestion : {currentActivity.name}
                       </h2>
                       <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1"><Clock size={14}/> {currentActivity.day} • {currentActivity.time}</span>
                          <span className="flex items-center gap-1"><UserPlus size={14}/> {currentActivity.instructor}</span>
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-bold tabular-nums">
                              {currentActivity.registrations.length} / {currentActivity.spots} inscrits
                          </span>
                       </div>
                   </div>
                   <button onClick={() => setShowManageModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
               </div>

               {/* Content */}
               <div className="p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800 space-y-6">
                   
                   {/* Add Student Section */}
                   {currentActivity.registrations.length < currentActivity.spots ? (
                       <div className="space-y-2">
                           <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Inscrire un nouvel élève</label>
                           <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                               <input 
                                   type="text" 
                                   className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none dark:text-white transition-all"
                                   placeholder="Rechercher un élève..."
                                   value={studentSearch}
                                   onChange={(e) => setStudentSearch(e.target.value)}
                               />
                               {studentSearch && (
                                   <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-600 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                                       {students.filter(s => 
                                           (s.firstName.toLowerCase().includes(studentSearch.toLowerCase()) || s.lastName.toLowerCase().includes(studentSearch.toLowerCase())) &&
                                           !currentActivity.registrations.some(r => r.studentId === s.id)
                                       )
                                       .sort((a, b) => {
                                           const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
                                           const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
                                           return nameA.localeCompare(nameB);
                                       })
                                       .map(student => (
                                           <button 
                                               key={student.id}
                                               onClick={() => handleRegisterStudent(student.id, `${student.lastName.toUpperCase()} ${student.firstName}`, student.grade)}
                                               className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center border-b dark:border-gray-700 last:border-0"
                                           >
                                               <div>
                                                   <p className="font-bold text-sm text-gray-800 dark:text-white">{student.lastName.toUpperCase()} {student.firstName}</p>
                                                   <p className="text-xs text-gray-500 dark:text-gray-400">{student.grade}</p>
                                               </div>
                                               <Plus size={16} className="text-purple-600" />
                                           </button>
                                       ))}
                                       {students.filter(s => s.firstName.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && (
                                           <div className="p-3 text-center text-xs text-gray-400">Aucun élève trouvé</div>
                                       )}
                                   </div>
                               )}
                           </div>
                       </div>
                   ) : (
                       <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg text-orange-700 dark:text-orange-300 text-sm text-center font-medium">
                           Activité complète ({currentActivity.spots} places)
                       </div>
                   )}

                   {/* List of Registered Students */}
                   <div>
                       <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                           <Users size={16} className="text-gray-400" /> 
                           Élèves inscrits
                       </h4>
                       {currentActivity.registrations.length === 0 ? (
                           <div className="text-center py-8 text-gray-400 border-2 border-dashed border-slate-200/60 dark:border-gray-700 rounded-xl">
                               Aucun élève inscrit pour le moment.
                           </div>
                       ) : (
                           <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
                               <table className="w-full min-w-[500px] text-left whitespace-nowrap">
                                   <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                                       <tr>
                                           <th className="p-3">Élève</th>
                                           <th className="p-3">Classe</th>
                                           <th className="p-3 text-center">Versé</th>
                                           <th className="p-3 text-right">Actions</th>
                                       </tr>
                                   </thead>
                                   <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                       {[...currentActivity.registrations]
                                            .sort((a, b) => a.studentName.toLowerCase().localeCompare(b.studentName.toLowerCase()))
                                            .map((reg) => (
                                           <tr key={reg.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                               <td className="p-3 font-medium text-gray-800 dark:text-white text-sm">{reg.studentName}</td>
                                               <td className="p-3 text-gray-500 dark:text-gray-400 text-sm">{reg.studentClass}</td>
                                               <td className="p-3 text-center font-bold text-green-600 dark:text-green-400">
                                                   {reg.amountPaid.toLocaleString()} F
                                               </td>
                                               <td className="p-3 text-right flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handlePrintInvoice(reg.studentName, reg.studentClass, currentActivity.name, currentActivity.price, reg.amountPaid)}
                                                        className="p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded transition-colors"
                                                        title="Imprimer Reçu"
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePrintInvoice(reg.studentName, reg.studentClass, currentActivity.name, currentActivity.price, reg.amountPaid)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                        title="Télécharger le reçu"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => openPaymentModal(currentActivity.id, reg.studentId, reg.amountPaid, currentActivity.price, reg.studentName)}
                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                        title="Saisir paiement"
                                                    >
                                                        <Banknote size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => confirmUnregister(currentActivity.id, reg.studentId)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                        title="Désinscrire"
                                                    >
                                                        <UserMinus size={16} />
                                                    </button>
                                                </td>
                                           </tr>
                                       ))}
                                    </tbody>
                                </table>
                            </div>
                       )}
                   </div>
               </div>
               <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 rounded-b-2xl flex justify-end">
                   <button onClick={() => setShowManageModal(false)} className="px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                       Fermer
                   </button>
               </div>
           </div>
        </div>
      )}

      {/* DELETE ACTIVITY CONFIRMATION */}
      {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-200/60 dark:border-gray-700">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                      <Trash2 size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Supprimer l'activité ?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Cette action est irréversible et supprimera toutes les inscriptions associées.</p>
                  <div className="flex gap-3 justify-center">
                      <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Annuler</button>
                      <button onClick={handleDeleteActivity} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Supprimer</button>
                  </div>
              </div>
          </div>
      )}

      {/* UNREGISTER STUDENT CONFIRMATION */}
      {studentToUnregister && (
          <div className="fixed inset-0 bg-black/50 z-[90] flex justify-center items-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-200/60 dark:border-gray-700">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                      <AlertCircle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Désinscrire l'élève ?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">L'élève sera retiré de la liste des participants.</p>
                  <div className="flex gap-3 justify-center">
                      <button onClick={() => setStudentToUnregister(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Annuler</button>
                      <button onClick={executeUnregisterStudent} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">Confirmer</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Activities;
