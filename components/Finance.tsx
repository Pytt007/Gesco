
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Download, Plus, X, Save, Calendar, DollarSign, FileText, Tag } from 'lucide-react';
import { analyzeFinancialTip } from '../services/geminiService';
import { Transaction, NotificationType, ActivityLog } from '../types';
import * as XLSX from '@e965/xlsx';

interface FinanceProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  addNotification: (type: NotificationType, message: string) => void;
  addLog?: (action: string, details: string, module: ActivityLog['module'], type: ActivityLog['type']) => void;
}

const Finance: React.FC<FinanceProps> = ({ transactions, setTransactions, addNotification, addLog }) => {
  
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const [tip, setTip] = useState<string>("Analyse en cours...");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
      description: '',
      amount: '',
      type: 'income' as 'income' | 'expense',
      category: 'Scolarité',
      date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchTip = async () => {
        const result = await analyzeFinancialTip(totalIncome, totalExpense);
        setTip(result);
    }
    fetchTip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalIncome, totalExpense]); 

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(transactions.map(t => ({
        Date: t.date,
        Description: t.description,
        Catégorie: t.category,
        Type: t.type === 'income' ? 'Revenu' : 'Dépense',
        Montant: t.amount
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, "export_finance.xlsx");
    addNotification('success', 'Export Excel généré avec succès.');
  };

  const handleAddTransaction = () => {
      if (!newTransaction.description || !newTransaction.amount) {
          addNotification('error', 'Veuillez remplir la description et le montant.');
          return;
      }

      const newItem: Transaction = {
          id: `TR-${Date.now()}`,
          description: newTransaction.description,
          amount: parseFloat(newTransaction.amount),
          type: newTransaction.type,
          category: newTransaction.category,
          date: newTransaction.date
      };

      setTransactions([newItem, ...transactions]);
      addNotification('success', 'Transaction ajoutée avec succès.');
      if (addLog) addLog('Nouvelle Transaction', `${newItem.type === 'income' ? 'Recette' : 'Dépense'} de ${newItem.amount} - ${newItem.description}`, 'Finance', 'create');
      
      setIsModalOpen(false);
      setNewTransaction({
          description: '',
          amount: '',
          type: 'income',
          category: 'Scolarité',
          date: new Date().toISOString().split('T')[0]
      });
  };

  return (
    <div className="space-y-6 relative">
      
      {/* ADD TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in duration-200">
               <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-2xl">
                   <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Plus size={20} className="text-primary" /> Nouvelle Transaction
                   </h2>
                   <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
               </div>
               
               <div className="p-6 space-y-4 bg-white dark:bg-gray-800">
                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Type</label>
                       <div className="flex gap-2">
                           <button 
                             onClick={() => setNewTransaction({...newTransaction, type: 'income'})}
                             className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${newTransaction.type === 'income' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'}`}
                           >
                               <TrendingUp size={16} /> Revenu
                           </button>
                           <button 
                             onClick={() => setNewTransaction({...newTransaction, type: 'expense'})}
                             className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${newTransaction.type === 'expense' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'}`}
                           >
                               <TrendingDown size={16} /> Dépense
                           </button>
                       </div>
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
                       <div className="relative">
                           <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                           <input 
                             type="text" 
                             className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-gray-900 dark:text-white transition-all"
                             placeholder="Ex: Achat fournitures"
                             value={newTransaction.description}
                             onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                           />
                       </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Montant (CFA)</label>
                           <div className="relative">
                               <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                               <input 
                                 type="number" 
                                 className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-gray-900 dark:text-white transition-all"
                                 placeholder="0"
                                 value={newTransaction.amount}
                                 onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                               />
                           </div>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Date</label>
                           <div className="relative">
                               <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                               <input 
                                 type="date" 
                                 className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-gray-900 dark:text-white transition-all"
                                 value={newTransaction.date}
                                 onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                               />
                           </div>
                       </div>
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Catégorie</label>
                       <div className="relative">
                           <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                           <select 
                             className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-gray-900 dark:text-white appearance-none"
                             value={newTransaction.category}
                             onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                           >
                               <option>Scolarité</option>
                               <option>Matériel</option>
                               <option>Maintenance</option>
                               <option>Salaires</option>
                               <option>Cantine</option>
                               <option>Transport</option>
                               <option>Subvention</option>
                               <option>Autre</option>
                           </select>
                       </div>
                   </div>
               </div>

               <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 rounded-b-2xl">
                   <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">Annuler</button>
                   <button onClick={handleAddTransaction} className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 shadow-lg shadow-blue-500/20"><Save size={18} /> Enregistrer</button>
               </div>
           </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium-pattern card-premium-green p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg">
               <TrendingUp size={20} />
            </div>
            <span className="font-bold opacity-80">Revenus (Total)</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">{totalIncome.toLocaleString('fr-FR')} CFA</p>
        </div>

        <div className="card-premium-pattern card-premium-rose p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg">
               <TrendingDown size={20} />
            </div>
            <span className="font-bold opacity-80">Dépenses (Total)</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">{totalExpense.toLocaleString('fr-FR')} CFA</p>
        </div>

        <div className="card-premium-pattern card-premium-blue p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg">
               <TrendingUp size={20} />
            </div>
            <span className="font-bold opacity-80">Solde Net</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {balance >= 0 ? '+' : ''}{balance.toLocaleString('fr-FR')} CFA
          </p>
        </div>
      </div>

      {/* AI Tip */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-1">
                ✨ Conseil de l'IA Financière
            </h3>
            <p className="text-white/90 italic">"{tip}"</p>
        </div>
        <div className="absolute -right-6 -bottom-10 opacity-10">
             <TrendingUp size={120} />
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 transition-colors">
        <div className="p-6 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Dernières Transactions</h2>
          <div className="flex gap-2">
             <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm"
             >
                <Plus size={16} /> Nouveau
             </button>
             <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
             >
                <Download size={16} /> Export
             </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-500 dark:text-gray-400">
                <th className="p-4">Date</th>
                <th className="p-4">Description</th>
                <th className="p-4">Catégorie</th>
                <th className="p-4 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-slate-200/60 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4 text-gray-600 dark:text-gray-300 text-sm">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                  <td className="p-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300">{t.category}</span>
                  </td>
                  <td className={`p-4 text-right font-bold ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('fr-FR')} CFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;
