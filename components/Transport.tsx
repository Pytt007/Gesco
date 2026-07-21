
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { printHtml } from '../services/printService';
import { BUS_ROUTES } from '../constants';
import { 
  Bus, 
  User, 
  Search, 
  Upload, 
  Download, 
  Plus, 
  Printer,
  Settings, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  DollarSign, 
  Users,
  AlertTriangle,
  Phone,
  CarFront,
  UserPlus,
  BarChart2,
  TrendingDown,
  Utensils
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from '@e965/xlsx';
import { BusRoute, Student, TransportSubscription, NotificationType, Transaction } from '../types';


// --- TYPES ---

interface BusExpense {
  id: string;
  date: string;
  routeId: string;
  category: 'assurance' | 'lavage' | 'reparation' | 'vidange' | 'patente' | 'carburant' | 'autre';
  amount: number;
  description: string;
}

const BUS_EXPENSE_CATEGORIES = [
  { key: 'assurance', label: 'Assurance' },
  { key: 'lavage', label: 'Lavage' },
  { key: 'reparation', label: 'Réparation' },
  { key: 'vidange', label: 'Entretien & Vidange' },
  { key: 'patente', label: 'Patente / Vignette' },
  { key: 'carburant', label: 'Carburant' },
  { key: 'autre', label: 'Autre' }
];


interface TransportFeeConfig {
  id: string;
  grade: string; // Nom de la Zone (ex: Zone Rosier-Mockeyville)
  canteenSubAmount: number; // Montant si inscrit à la cantine
  noCanteenSubAmount: number; // Montant si non inscrit à la cantine
}

interface TransportProps {
  students: Student[];
  subscriptions: TransportSubscription[];
  setSubscriptions: React.Dispatch<React.SetStateAction<TransportSubscription[]>>;
  routes: BusRoute[];
  setRoutes: React.Dispatch<React.SetStateAction<BusRoute[]>>;
  canteenSubscriptions: any[];
  addNotification: (type: NotificationType, message: string) => void;
  schoolName: string;
  schoolLogo: string;
  schoolYear: string;
  transactions?: Transaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  busExpenses?: BusExpense[];
  setBusExpenses?: React.Dispatch<React.SetStateAction<BusExpense[]>>;
  configs?: TransportFeeConfig[];
  setConfigs?: React.Dispatch<React.SetStateAction<TransportFeeConfig[]>>;
}

const DEFAULT_TRANSPORT_CONFIGS: TransportFeeConfig[] = [];

const calculateFinancials = (
    zoneName: string, 
    paidP1: number, 
    paidP2: number, 
    paidP3: number, 
    discountPercent: number,
    configs: TransportFeeConfig[],
    isCanteenSubscribed: boolean
) => {
    // Trouve la config correspondante
    const config = configs.find(c => zoneName && zoneName.includes(c.grade)) || configs[0];
    
    const initialTotal = config 
        ? (isCanteenSubscribed ? config.canteenSubAmount : config.noCanteenSubAmount)
        : 0;
        
    const discountAmount = (initialTotal * discountPercent) / 100;
    const netTotal = initialTotal - discountAmount;
    
    const totalPaid = paidP1 + paidP2 + paidP3;
    const remaining = Math.max(0, netTotal - totalPaid);
    
    let status: 'Soldé' | 'Partiel' | 'Impayé' = 'Impayé';
    if (remaining === 0 && netTotal > 0) status = 'Soldé';
    else if (totalPaid > 0) status = 'Partiel';
    else if (remaining === 0 && netTotal === 0) status = 'Soldé';

    return { initialTotal, discountAmount, netTotal, totalPaid, remaining, status };
};



const Transport: React.FC<TransportProps> = ({
  students,
  subscriptions,
  setSubscriptions,
  routes,
  setRoutes,
  canteenSubscriptions,
  addNotification,
  schoolName,
  schoolLogo,
  schoolYear,
  transactions,
  setTransactions,
  busExpenses: propsBusExpenses,
  setBusExpenses: propsSetBusExpenses,
  configs: propsConfigs,
  setConfigs: propsSetConfigs,
}) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'buses' | 'expenses' | 'stats'>('financial');

  const handlePrintInvoice = (sub: TransportSubscription) => {


      const today = new Date().toLocaleDateString('fr-FR');
      // BUG-016 FIX: 8 timestamp digits + 4 random hex chars = no collisions
      const invoiceNumber = `TRA-${Date.now().toString().slice(-8)}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

      // Construction des lignes de paiement
      let paymentRows = '';
      if (sub.periods.p1 > 0) {
          paymentRows += `
          <tr>
              <td>Versement 1 (V1)</td>
              <td style="text-align:right">${sub.periods.p1.toLocaleString()} CFA</td>
          </tr>`;
      }
      if (sub.periods.p2 > 0) {
          paymentRows += `
          <tr>
              <td>Versement 2 (V2)</td>
              <td style="text-align:right">${sub.periods.p2.toLocaleString()} CFA</td>
          </tr>`;
      }
      if (sub.periods.p3 > 0) {
          paymentRows += `
          <tr>
              <td>Versement 3 (V3)</td>
              <td style="text-align:right">${sub.periods.p3.toLocaleString()} CFA</td>
          </tr>`;
      }

      const htmlContent = `
        <html>
          <head>
            <title>Reçu Transport - ${sub.studentName}</title>
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
              <h1>REÇU DE PAIEMENT - TRANSPORT</h1>
              <h2>${schoolName}</h2>
              <p>Année Scolaire ${schoolYear}</p>
            </div>

            <div class="info-grid">
              <div class="info-box">
                <div class="info-label">Élève</div>
                <div class="info-value">${sub.studentName}</div>
                <div style="margin-top:5px; font-size:14px;">Classe: ${sub.class}</div>
                <div style="margin-top:5px; font-size:14px;">Circuit: ${sub.routeId} (${sub.zone || 'Non assignée'})</div>
              </div>
              <div class="info-box" style="text-align:right;">
                <div class="info-label">Réçu N°</div>
                <div class="info-value">${invoiceNumber}</div>
                <div style="margin-top:5px; font-size:14px;">Date: ${today}</div>
              </div>
            </div>

            <h3>Détail des versements transport effectués</h3>
            <table>
              <thead>
                <tr>
                  <th>Période</th>
                  <th style="text-align:right">Montant</th>
                </tr>
              </thead>
              <tbody>
                ${paymentRows || '<tr><td colspan="2" style="text-align:center; font-style:italic;">Aucun paiement enregistré</td></tr>'}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row">
                <span>Montant Annuel Transport:</span>
                <span>${sub.initialTotal.toLocaleString()} CFA</span>
              </div>
              ${sub.discountPercent > 0 ? `
              <div class="totals-row">
                <span>Remise (${sub.discountPercent}%):</span>
                <span>-${sub.discountAmount.toLocaleString()} CFA</span>
              </div>` : ''}
              <div class="totals-row">
                <span>Total Payé à ce jour:</span>
                <span>${sub.totalPaid.toLocaleString()} CFA</span>
              </div>
              <div class="totals-row final">
                <span>Reste à Payer:</span>
                <span>${sub.remaining.toLocaleString()} CFA</span>
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

  // Dépenses de la flotte (Supabase avec fallback LocalStorage)
  const [localBusExpenses, setLocalBusExpenses] = useState<BusExpense[]>([]);
  const busExpenses = propsBusExpenses ?? localBusExpenses;
  const setBusExpenses = propsSetBusExpenses ?? setLocalBusExpenses;

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
      date: new Date().toISOString().split('T')[0],
      routeId: '',
      category: 'carburant' as BusExpense['category'],
      amount: '',
      description: ''
  });

  const handleSaveBusExpense = () => {
      if (!newExpenseForm.routeId || !newExpenseForm.amount || !newExpenseForm.date) {
          addNotification('error', 'Veuillez remplir tous les champs obligatoires.');
          return;
      }
      const newExpense: BusExpense = {
          id: `EXP-BUS-${Date.now()}`,
          date: newExpenseForm.date,
          routeId: newExpenseForm.routeId,
          category: newExpenseForm.category,
          amount: parseFloat(newExpenseForm.amount) || 0,
          description: newExpenseForm.description
      };
      setBusExpenses(prev => [newExpense, ...prev]);

      // Synchronize with general transactions
      if (setTransactions) {
          const newTransaction: Transaction = {
              id: newExpense.id,
              date: newExpense.date,
              description: `[Transport] ${newExpense.description || `${BUS_EXPENSE_CATEGORIES.find(c => c.key === newExpense.category)?.label} (${newExpense.routeId})`}`,
              amount: newExpense.amount,
              type: 'expense',
              category: 'transport'
          };
          setTransactions(prev => [newTransaction, ...prev]);
      }

      addNotification('success', 'Dépense de car enregistrée.');
      setIsExpenseModalOpen(false);
      setNewExpenseForm({
          date: new Date().toISOString().split('T')[0],
          routeId: '',
          category: 'carburant',
          amount: '',
          description: ''
      });
  };

  const handleDeleteBusExpense = (id: string) => {
      setBusExpenses(prev => prev.filter(e => e.id !== id));
      if (setTransactions) {
          setTransactions(prev => prev.filter(t => t.id !== id));
      }
      addNotification('success', 'Dépense supprimée.');
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('Tous les circuits');
  const [sortOrder, setSortOrder] = useState<'alpha' | 'recent'>('alpha');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configurations de transport (Supabase avec fallback LocalStorage)
  const [localConfigs, setLocalConfigs] = useState<TransportFeeConfig[]>(DEFAULT_TRANSPORT_CONFIGS);
  const configs = propsConfigs ?? localConfigs;
  const setConfigs = propsSetConfigs ?? setLocalConfigs;

  useEffect(() => {
    if (propsConfigs && propsConfigs.length === 0 && propsSetConfigs) {
      propsSetConfigs(DEFAULT_TRANSPORT_CONFIGS);
    }
  }, [propsConfigs, propsSetConfigs]);
  
  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [newConfig, setNewConfig] = useState({ grade: '', canteenSubAmount: '', noCanteenSubAmount: '' });

  // CRUD Subscriptions (Students)
  const [isNewSubModalOpen, setIsNewSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<TransportSubscription | null>(null);
  const [newSubData, setNewSubData] = useState({ name: '', class: '', route: '', zone: '', p1: '0', p2: '0', p3: '0', discount: '0', isCanteenSub: 'no' as 'yes' | 'no' });
  const [deleteId, setDeleteId] = useState<string | null>(null); // For Subscriptions
  
  // Search State for New Student
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // CRUD Routes (Fleets)
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeForm, setRouteForm] = useState({ name: '', driver: '', capacity: '50', phone: '', licensePlate: '' });
  const [deleteRouteId, setDeleteRouteId] = useState<string | null>(null); // For Routes

  // --- CALCULS ---
  const totalRevenue = subscriptions.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalRemaining = subscriptions.reduce((acc, curr) => acc + curr.remaining, 0);
  const activeUsers = subscriptions.length;

  const chartData = useMemo(() => {
    const p1 = subscriptions.reduce((acc, curr) => acc + curr.periods.p1, 0);
    const p2 = subscriptions.reduce((acc, curr) => acc + curr.periods.p2, 0);
    const p3 = subscriptions.reduce((acc, curr) => acc + curr.periods.p3, 0);
    return [
        { name: 'V1', montant: p1 },
        { name: 'V2', montant: p2 },
        { name: 'V3', montant: p3 },
    ];
  }, [subscriptions]);

  const uniqueRoutes = ['Tous les circuits', ...Array.from(new Set(routes.map(r => r.name))).sort()];

  const filteredSubscriptions = subscriptions.filter(s => {
      const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || s.class.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRoute = selectedRoute === 'Tous les circuits' || s.routeId === selectedRoute;
      return matchesSearch && matchesRoute;
  }).sort((a, b) => {
      if (sortOrder === 'recent') {
          const getTimestampFromId = (id: string): number => {
              const match = id.match(/\d{10,13}/);
              return match ? parseInt(match[0], 10) : 0;
          };
          const tsA = getTimestampFromId(a.id);
          const tsB = getTimestampFromId(b.id);
          if (tsB !== tsA) return tsB - tsA;
      }
      return a.studentName.toLowerCase().localeCompare(b.studentName.toLowerCase());
  });

  // BUG-009 FIX: Compute live registered count per route — never stale
  const routesWithCount = useMemo(() => {
    return routes.map(route => ({
      ...route,
      registered: subscriptions.filter(s => s.routeId === route.id || s.routeId === route.name).length,
    }));
  }, [routes, subscriptions]);

  // --- HANDLERS: SETTINGS ---
  const handleAddOrUpdateConfig = () => {
      if (!newConfig.grade || !newConfig.canteenSubAmount || !newConfig.noCanteenSubAmount) return;
      const canteenSub = parseInt(newConfig.canteenSubAmount) || 0;
      const noCanteenSub = parseInt(newConfig.noCanteenSubAmount) || 0;

      if (editingConfigId) {
          setConfigs(prev => prev.map(c => c.id === editingConfigId ? { ...c, grade: newConfig.grade, canteenSubAmount: canteenSub, noCanteenSubAmount: noCanteenSub } : c));
          setEditingConfigId(null);
      } else {
          setConfigs([...configs, { id: Date.now().toString(), grade: newConfig.grade, canteenSubAmount: canteenSub, noCanteenSubAmount: noCanteenSub }]);
      }
      setNewConfig({ grade: '', canteenSubAmount: '', noCanteenSubAmount: '' });
      addNotification('success', 'Tarifs mis à jour.');
  };

  const handleDeleteConfig = (id: string) => {
      setConfigs(prev => prev.filter(c => c.id !== id));
      addNotification('success', 'Tarif supprimé.');
  };

  // --- HANDLERS: ROUTES (FLEET) ---
  const handleOpenRouteModal = (route?: BusRoute) => {
      if (route) {
          setEditingRouteId(route.id);
          setRouteForm({ 
            name: route.name, 
            driver: route.driver, 
            capacity: route.capacity.toString(),
            phone: route.phone || '',
            licensePlate: route.licensePlate || ''
          });
      } else {
          setEditingRouteId(null);
          setRouteForm({ name: '', driver: '', capacity: '50', phone: '', licensePlate: '' });
      }
      setIsRouteModalOpen(true);
  };

  const handleSaveRoute = () => {
      if (!routeForm.name || !routeForm.driver) {
          addNotification('error', 'Nom et chauffeur requis.');
          return;
      }
      
      if (editingRouteId) {
          setRoutes(prev => prev.map(r => r.id === editingRouteId ? {
              ...r,
              name: routeForm.name,
              driver: routeForm.driver,
              capacity: parseInt(routeForm.capacity) || 50,
              phone: routeForm.phone,
              licensePlate: routeForm.licensePlate
          } : r));
      } else {
          const newRoute: BusRoute = {
              id: `ROUTE-${Date.now()}`,
              name: routeForm.name,
              driver: routeForm.driver,
              capacity: parseInt(routeForm.capacity) || 50,
              registered: 0, // Default
              phone: routeForm.phone,
              licensePlate: routeForm.licensePlate
          };
          setRoutes(prev => [...prev, newRoute]);
      }
      addNotification('success', 'Circuit enregistré.');
      setIsRouteModalOpen(false);
  };

  const handleDeleteRoute = () => {
      if (deleteRouteId) {
          setRoutes(prev => prev.filter(r => r.id !== deleteRouteId));
          setDeleteRouteId(null);
          addNotification('success', 'Circuit supprimé.');
      }
  };

  // --- HANDLERS: SUBSCRIPTIONS ---
  const handleSelectStudent = (student: any) => {
      const isCanteen = canteenSubscriptions.some(sub => sub.studentName.toLowerCase().trim() === `${student.lastName.toUpperCase()} ${student.firstName}`.toLowerCase().trim());
      setNewSubData({
          ...newSubData,
          name: `${student.lastName.toUpperCase()} ${student.firstName}`,
          class: student.grade,
          isCanteenSub: isCanteen ? 'yes' : 'no'
      });
      setStudentSearchTerm(''); // Hide list
  };

  const handleAddSub = () => {
      if (!newSubData.name || !newSubData.class) {
          addNotification('error', 'Veuillez sélectionner un élève.');
          return;
      }

      // FIX C3 — Anti-doublon transport : vérifier si l'élève est déjà abonnné au transport
      const alreadySubscribed = subscriptions.some(
          s => s.studentName.toLowerCase().trim() === newSubData.name.toLowerCase().trim()
      );
      if (alreadySubscribed) {
          addNotification('error', `${newSubData.name} est déjà abonnné(e) au transport. Modifiez l'abonnement existant.`);
          return;
      }

      const p1 = parseFloat(newSubData.p1) || 0;
      const p2 = parseFloat(newSubData.p2) || 0;
      const p3 = parseFloat(newSubData.p3) || 0;
      const discount = parseFloat(newSubData.discount) || 0;

      const isCanteenSub = newSubData.isCanteenSub === 'yes';
      const financials = calculateFinancials(newSubData.zone, p1, p2, p3, discount, configs, isCanteenSub);

      if (financials.totalPaid > financials.netTotal) {
          addNotification('error', 'Montant payé supérieur au total dû.');
          return;
      }

      const newSub: TransportSubscription = {
          id: `MAN-TR-${Date.now()}`,
          studentName: newSubData.name,
          class: newSubData.class || 'Non Assignée',
          routeId: newSubData.route || 'Non assigné',
          zone: newSubData.zone,
          isCanteenSubscribed: isCanteenSub,
          periods: { p1, p2, p3 },
          paidP1: p1, paidP2: p2, paidP3: p3,
          discountPercent: discount,
          ...financials
      };

      setSubscriptions([newSub, ...subscriptions]);
      addNotification('success', 'Abonnement transport créé.');
      setIsNewSubModalOpen(false);
      setNewSubData({ name: '', class: '', route: '', zone: '', p1: '0', p2: '0', p3: '0', discount: '0', isCanteenSub: 'no' });
      setStudentSearchTerm('');
  };

  const handleEditSub = (sub: TransportSubscription) => {
      const isCanteen = sub.isCanteenSubscribed !== undefined
          ? sub.isCanteenSubscribed
          : canteenSubscriptions.some(c => c.studentName.toLowerCase().trim() === sub.studentName.toLowerCase().trim());
      setEditingSub({
          ...JSON.parse(JSON.stringify(sub)),
          isCanteenSubscribed: isCanteen
      });
  };

  const handleUpdateSub = () => {
      if (!editingSub) return;
      const p1 = parseFloat(editingSub.periods.p1.toString()) || 0;
      const p2 = parseFloat(editingSub.periods.p2.toString()) || 0;
      const p3 = parseFloat(editingSub.periods.p3.toString()) || 0;
      const discount = parseFloat(editingSub.discountPercent.toString()) || 0;

      const isCanteenSub = !!editingSub.isCanteenSubscribed;
      const financials = calculateFinancials(editingSub.zone || configs[0].grade, p1, p2, p3, discount, configs, isCanteenSub);

      if (financials.totalPaid > financials.netTotal) {
          addNotification('error', 'Montant payé supérieur au total dû.');
          return;
      }

      const updated: TransportSubscription = {
          ...editingSub,
          periods: { p1, p2, p3 },
          paidP1: p1, paidP2: p2, paidP3: p3,
          discountPercent: discount,
          ...financials
      };

      setSubscriptions(prev => prev.map(s => s.id === updated.id ? updated : s));
      addNotification('success', 'Abonnement mis à jour.');
      setEditingSub(null);
  };

  const handleDeleteSub = () => {
      if (deleteId) {
          setSubscriptions(prev => prev.filter(s => s.id !== deleteId));
          setDeleteId(null);
          addNotification('success', 'Abonnement supprimé.');
      }
  };

  const confirmDeleteSubscription = (id: string) => {
      setDeleteId(id);
  };

  const confirmDeleteRoute = (id: string) => {
      setDeleteRouteId(id);
  };

  // --- HANDLERS: IMPORT/EXPORT ---
  const handleDownloadTemplate = () => {
      const headers = [{ "NOM & PRENOM": "Ex: DUPONT Jean", "Classe": "6ème A", "Circuit": "Circuit A", "V1": 45000, "V2": 45000, "V3": 0, "Remise (%)": 0 }];
      const ws = XLSX.utils.json_to_sheet(headers);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modele_Transport");
      XLSX.writeFile(wb, "modele_transport.xlsx");
  };

  const handleFileDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
          if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
              const mockEvent = {
                  target: {
                      files: [file]
                  }
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              handleImport(mockEvent);
          } else {
              addNotification('error', 'Veuillez déposer un fichier Excel (.xlsx ou .xls) valide.');
          }
      }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const arrayBuffer = evt.target?.result;
        if (!arrayBuffer) return;

        try {
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data: any[] = XLSX.utils.sheet_to_json(ws);

          if (!data.length) return;

          const subscriptionMap = new Map<string, TransportSubscription>(subscriptions.map(s => [s.studentName.toLowerCase().trim(), s]));

          data.forEach((row, idx) => {
              const keys = Object.keys(row);
              const combinedKey = keys.find(k => k.toLowerCase().includes('nom') && k.toLowerCase().includes('prenom') || k.toLowerCase().includes('student'));
              
              let name = '';
              if (combinedKey) {
                  name = String(row[combinedKey]);
                  const parts = name.trim().split(' ');
                  if (parts.length >= 2) {
                      const half = Math.floor(parts.length / 2);
                      const s1 = parts.slice(0, half).join(' ').toLowerCase();
                      const s2 = parts.slice(half).join(' ').toLowerCase();
                      if (s1 === s2) {
                          name = parts.slice(0, half).join(' ');
                      }
                  }
              } else {
                  const lKey = keys.find(k => k.toLowerCase() === 'nom' || k.toLowerCase() === 'lastname');
                  const fKey = keys.find(k => k.toLowerCase().includes('prenom') || k.toLowerCase().includes('firstname'));
                  const l = row[lKey || ''] || '';
                  const f = row[fKey || ''] || '';
                  
                  if (l && f && l.toLowerCase().trim() === f.toLowerCase().trim()) {
                      name = l.toUpperCase();
                  } else {
                      name = `${l} ${f}`.trim();
                  }
              }

              const findKey = (search: string[]) => keys.find(k => search.some(s => k.toLowerCase().includes(s)));
              const className = row[findKey(['classe', 'grade']) || ''] || 'Non assigné';
              const routeName = row[findKey(['circuit', 'route']) || ''] || 'Non assigné';
              
              const p1 = Number(row[findKey(['sept', 'p1', 'nov', 'v1']) || '']) || 0;
              const p2 = Number(row[findKey(['déc', 'dec', 'fev', 'fév', 'p2', 'v2']) || '']) || 0;
              const p3 = Number(row[findKey(['mars', 'mai', 'p3', 'v3']) || '']) || 0;
              const discountPercent = Number(row[findKey(['remise', 'discount']) || '']) || 0;

              const zoneName = row[findKey(['zone', 'circuit', 'route']) || ''] || configs[0].grade;
              const isCanteenSub = canteenSubscriptions.some(sub => sub.studentName.toLowerCase().trim() === name.toLowerCase().trim());
              const financials = calculateFinancials(String(zoneName), p1, p2, p3, discountPercent, configs, isCanteenSub);

              const existing = subscriptionMap.get(name.toLowerCase().trim());

              subscriptionMap.set(name.toLowerCase().trim(), {
                  id: existing ? existing.id : `IMP-TR-${Date.now()}-${idx}`,
                  studentName: name || `Élève ${idx}`,
                  class: className,
                  routeId: routeName,
                  zone: String(zoneName),
                  periods: { p1, p2, p3 },
                  paidP1: p1, paidP2: p2, paidP3: p3,
                  discountPercent,
                  ...financials
              });
          });

          setSubscriptions(Array.from(subscriptionMap.values()));
          addNotification('success', `Abonnements importés/mis à jour.`);
        } catch (error) {
          console.error(error);
          addNotification('error', "Erreur lors de l'import. Vérifiez le fichier.");
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
       
       {/* KPI CARDS */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
          <div className="card-premium-pattern card-premium-blue p-5 rounded-xl flex items-center justify-between">
             <div>
               <p className="text-sm font-bold opacity-80">Abonnés Transport</p>
               <h3 className="text-2xl font-bold tracking-tight mt-1">{activeUsers}</h3>
             </div>
             <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl"><Users size={24} /></div>
          </div>
          <div className="card-premium-pattern card-premium-green p-5 rounded-xl flex items-center justify-between">
             <div>
               <p className="text-sm font-bold opacity-80">Recettes Transport</p>
               <h3 className="text-2xl font-bold tracking-tight mt-1">{totalRevenue.toLocaleString()} F</h3>
               <p className="text-xs opacity-75">Reste: {totalRemaining.toLocaleString()}</p>
             </div>
             <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl"><DollarSign size={24} /></div>
          </div>
          <div className="card-premium-pattern card-premium-rose p-5 rounded-xl flex items-center justify-between">
             <div>
               <p className="text-sm font-bold opacity-80">Dépenses Flotte</p>
               <h3 className="text-2xl font-bold tracking-tight mt-1">{busExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} F</h3>
             </div>
             <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl"><TrendingDown size={24} /></div>
          </div>
          {(() => {
              const totalExpenses = busExpenses.reduce((sum, e) => sum + e.amount, 0);
              const netBalance = totalRevenue - totalExpenses;
              const isPositive = netBalance >= 0;
              const premiumColorClass = isPositive ? 'card-premium-purple' : 'card-premium-orange';
              return (
                <div className={`card-premium-pattern ${premiumColorClass} p-5 rounded-xl flex items-center justify-between`}>
                   <div>
                     <p className="text-sm font-bold opacity-80">Bénéfice / Déficit</p>
                     <h3 className="text-2xl font-bold tracking-tight mt-1">
                          {netBalance.toLocaleString()} F
                     </h3>
                     <p className="text-xs opacity-75">{isPositive ? 'Rentable' : 'Déficitaire'}</p>
                   </div>
                   <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl"><BarChart2 size={24} /></div>
                </div>
              );
          })()}
        </div>

      {/* TABS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-2 flex overflow-x-auto shrink-0">
          <button onClick={() => setActiveTab('financial')} className={`flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'financial' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>Suivi Financier</button>
          <button onClick={() => setActiveTab('buses')} className={`flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'buses' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>Flotte & Circuits</button>
          <button onClick={() => setActiveTab('expenses')} className={`flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>Dépenses du Car</button>
          <button onClick={() => setActiveTab('stats')} className={`flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>Statistiques</button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 min-h-0 flex flex-col">
         
         {/* TAB: FINANCIAL */}
         {activeTab === 'financial' && (
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 flex flex-col h-full overflow-hidden">
                 {/* Toolbar */}
                 <div className="p-4 border-b border-slate-200/60 dark:border-gray-700 flex flex-col gap-3.5 bg-gray-50/50 dark:bg-gray-800 shrink-0 z-20 rounded-t-xl">
                      {/* Row 1: Title, Search & Filters */}
                      <div className="flex flex-wrap items-center gap-3 w-full">
                          <h2 className="text-lg font-bold text-gray-800 dark:text-white whitespace-nowrap flex items-center gap-2 mr-2">
                              <FileSpreadsheet className="text-green-600" /> Suivi Transport
                          </h2>
                          <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 hidden sm:block"></div>
                          <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                              <input type="text" placeholder="Rechercher élève..." className="w-full pl-9 pr-4 py-2 rounded-xl border bg-white dark:bg-gray-700/50 focus:ring-2 focus:ring-primary/50 text-sm dark:text-white dark:border-gray-600" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                          </div>
                          <select className="px-3 py-2 bg-white dark:bg-gray-700/50 border rounded-xl text-sm dark:text-white dark:border-gray-600 cursor-pointer" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
                              {uniqueRoutes.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <select className="px-3 py-2 bg-white dark:bg-gray-700/50 border rounded-xl text-sm dark:text-white dark:border-gray-600 cursor-pointer" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'alpha' | 'recent')}>
                               <option value="alpha">Trier : Nom (A-Z)</option>
                               <option value="recent">Trier : Plus récent</option>
                          </select>
                      </div>

                      {/* Row 2: Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2.5 w-full pt-2 border-t border-slate-200/60 dark:border-gray-700/60">
                          <button onClick={() => setIsNewSubModalOpen(true)} className="whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors font-semibold shadow-sm shadow-blue-500/30">
                              <Plus size={16} /> Nouveau
                          </button>
                          <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 mx-1 hidden sm:block"></div>
                          <button onClick={handleDownloadTemplate} className="whitespace-nowrap flex items-center gap-2 px-3.5 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors font-medium">
                              <Download size={16} /> Modèle
                          </button>
                          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
                          <button onClick={() => fileInputRef.current?.click()} className="whitespace-nowrap flex items-center gap-2 px-3.5 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100 hover:border-green-300 transition-colors font-medium dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50">
                              <Upload size={16} /> Importer
                          </button>
                          <button onClick={() => setIsSettingsOpen(true)} className="whitespace-nowrap flex items-center gap-2 px-3.5 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors font-medium">
                              <Settings size={16} /> Tarifs
                          </button>
                      </div>
                  </div>
                 
                 {/* Table */}
                 <div 
                      onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                      }}
                      onDrop={handleFileDrop}
                      className="flex-1 overflow-auto relative rounded-b-xl transition-all border-2 border-transparent hover:border-dashed hover:border-green-400/50 hover:bg-green-50/5 dark:hover:bg-green-950/5 custom-scrollbar"
                  >
                     <table className="w-full min-w-[1000px] text-left border-collapse whitespace-nowrap">
                         <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-40 shadow-sm">
                             <tr>
                                 <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase sticky left-0 z-50 bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-600">NOM & PRENOM</th>
                                 <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase sticky left-[80px] z-50 bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-600">CIRCUIT</th>
                                 <th className="p-4 text-xs font-bold text-center bg-blue-50/50 dark:bg-blue-900/10 dark:text-blue-200">V1</th>
                                 <th className="p-4 text-xs font-bold text-center bg-blue-50/50 dark:bg-blue-900/10 dark:text-blue-200">V2</th>
                                 <th className="p-4 text-xs font-bold text-center bg-blue-50/50 dark:bg-blue-900/10 dark:text-blue-200">V3</th>
                                 <th className="p-4 text-xs font-bold text-center dark:text-gray-300">REMISE (%)</th>
                                 <th className="p-4 text-xs font-bold text-right bg-gray-100 dark:bg-gray-700 dark:text-gray-300">TOTAL ANNÉE</th>
                                 <th className="p-4 text-xs font-bold text-right dark:text-gray-300">REMISE (VAL)</th>
                                 <th className="p-4 text-xs font-bold text-right bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400">DÉJÀ PAYÉ</th>
                                 <th className="p-4 text-xs font-bold text-right bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400">RESTE À PAYER</th>
                                 <th className="p-4 text-xs font-bold text-center dark:text-gray-300">SOLDE</th>
                                 <th className="p-4 text-xs font-bold text-center sticky right-0 z-50 bg-gray-50 dark:bg-gray-800">ACTIONS</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                             {filteredSubscriptions.map(sub => (
                                 <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                                     <td className="p-4 font-bold text-gray-800 dark:text-white sticky left-0 bg-white dark:bg-gray-800 border-r border-slate-200/60 dark:border-gray-700">
                                          <div className="flex items-center gap-2">
                                              <span>{sub.studentName}</span>
                                              {canteenSubscriptions.some(c => c.studentName.toLowerCase().trim() === sub.studentName.toLowerCase().trim()) ? (
                                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                      <Utensils size={10} /> Cantine
                                                  </span>
                                              ) : (
                                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                                      Sans cantine
                                                  </span>
                                              )}
                                          </div>
                                          <span className="text-xs text-gray-400 block font-normal">{sub.class}</span>
                                      </td>
                                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300 sticky left-[80px] bg-white dark:bg-gray-800 border-r border-slate-200/60 dark:border-gray-700">
                                          <div className="font-semibold text-gray-800 dark:text-white">{sub.routeId}</div>
                                          <div className="text-xs text-gray-400 mt-0.5">{sub.zone || 'Non assignée'}</div>
                                      </td>
                                     <td className="p-4 text-center text-sm tabular-nums text-gray-700 dark:text-gray-300 bg-blue-50/10 dark:bg-blue-900/5">{sub.periods.p1.toLocaleString()}</td>
                                     <td className="p-4 text-center text-sm tabular-nums text-gray-700 dark:text-gray-300 bg-blue-50/10 dark:bg-blue-900/5">{sub.periods.p2.toLocaleString()}</td>
                                     <td className="p-4 text-center text-sm tabular-nums text-gray-700 dark:text-gray-300 bg-blue-50/10 dark:bg-blue-900/5">{sub.periods.p3.toLocaleString()}</td>
                                     <td className="p-4 text-center text-sm">{sub.discountPercent > 0 ? `${sub.discountPercent}%` : '-'}</td>
                                     <td className="p-4 text-right text-sm font-medium tabular-nums bg-gray-50/50 dark:bg-gray-700/30">{sub.initialTotal.toLocaleString()}</td>
                                     <td className="p-4 text-right text-sm text-gray-500 tabular-nums">{sub.discountAmount.toLocaleString()}</td>
                                     <td className="p-4 text-right text-sm font-bold text-green-600 dark:text-green-400 bg-green-50/30 dark:bg-green-900/10 tabular-nums">{sub.totalPaid.toLocaleString()}</td>
                                     <td className="p-4 text-right text-sm font-bold text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-900/5 tabular-nums">{sub.remaining.toLocaleString()}</td>
                                     <td className="p-4 text-center">
                                         <span className={`px-2 py-1 rounded-md text-xs font-medium ${sub.status === 'Soldé' ? 'bg-green-100 text-green-700' : sub.status === 'Partiel' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                             {sub.status}
                                         </span>
                                     </td>
                                     <td className="p-4 text-center sticky right-0 bg-white dark:bg-gray-800 border-l border-slate-200/60 dark:border-gray-700">
                                         <div className="flex justify-center gap-2">
                                             <button onClick={() => handlePrintInvoice(sub)} className="p-2 bg-white dark:bg-gray-700 border rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-600" title="Imprimer Reçu"><Printer size={16} /></button>
                                             <button onClick={() => handlePrintInvoice(sub)} className="p-2 bg-white dark:bg-gray-700 border rounded-lg text-green-600 hover:bg-green-50 dark:border-gray-600 dark:hover:bg-green-900/20" title="Télécharger le reçu"><Download size={16} /></button>
                                             <button onClick={() => handleEditSub(sub)} className="p-2 bg-white dark:bg-gray-700 border rounded-lg text-blue-600 hover:bg-blue-50 dark:border-gray-600 dark:hover:bg-blue-900/20" title="Modifier"><Edit2 size={16} /></button>
                                             <button onClick={() => confirmDeleteSubscription(sub.id)} className="p-2 bg-white dark:bg-gray-700 border rounded-lg text-red-600 hover:bg-red-50 dark:border-gray-600 dark:hover:bg-red-900/20" title="Supprimer"><Trash2 size={16} /></button>
                                         </div>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
         )}

         {/* TAB: BUSES */}
         {activeTab === 'buses' && (
             <div className="h-full overflow-auto p-1">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white">Gestion de la Flotte</h3>
                     <button onClick={() => handleOpenRouteModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium text-sm"><Plus size={16}/> Ajouter un circuit</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                     {/* BUG-009 FIX: routesWithCount has live registered counts from subscriptions */}
                     {routesWithCount.map(route => (
                         <div key={route.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group">
                             <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-start">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                         <Bus size={20} />
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-gray-800 dark:text-white">{route.name}</h4>
                                         <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">ID: {route.id}</span>
                                     </div>
                                 </div>
                                 
                                 {/* Flex container for badge + buttons to prevent overlap */}
                                 <div className="flex items-center gap-3">
                                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => handleOpenRouteModal(route)} className="p-1.5 bg-gray-100 dark:bg-gray-700 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"><Edit2 size={14}/></button>
                                         <button onClick={() => confirmDeleteRoute(route.id)} className="p-1.5 bg-gray-100 dark:bg-gray-700 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30"><Trash2 size={14}/></button>
                                     </div>
                                 </div>
                             </div>
                             <div className="p-5 space-y-4">
                                 <div className="flex items-center gap-3">
                                     <User size={16} className="text-gray-400" />
                                     <div>
                                         <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Chauffeur</p>
                                         <p className="text-sm font-medium text-gray-800 dark:text-white">{route.driver}</p>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <Phone size={16} className="text-gray-400" />
                                     <div>
                                         <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Contact</p>
                                         <p className="text-sm font-medium text-gray-800 dark:text-white">{route.phone || 'Non renseigné'}</p>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <CarFront size={16} className="text-gray-400" />
                                     <div>
                                         <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Véhicule</p>
                                         <p className="text-sm font-medium text-gray-800 dark:text-white">{route.licensePlate || 'Non renseigné'}</p>
                                     </div>
                                 </div>
                                 
                                 <div className="pt-2">
                                     <div className="flex justify-between text-xs mb-1.5">
                                         <span className="font-bold text-gray-600 dark:text-gray-300">Capacité</span>
                                         <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                             {subscriptions.filter(s => s.routeId === route.name).length} / {route.capacity}
                                         </span>
                                     </div>
                                     <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                         <div 
                                             className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                                             style={{ width: `${Math.min((subscriptions.filter(s => s.routeId === route.name).length / route.capacity) * 100, 100)}%` }}
                                         ></div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}

          {/* TAB: EXPENSES */}
          {activeTab === 'expenses' && (
              <div className="h-full flex flex-col min-h-0">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0 animate-in fade-in duration-300">
                       <div className="card-premium-pattern card-premium-rose p-5 rounded-xl flex justify-between items-start">
                           <div className="space-y-1">
                               <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Total Dépenses</p>
                               <h3 className="text-xl font-bold tracking-tight">{busExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} CFA</h3>
                           </div>
                           <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg"><DollarSign size={16}/></div>
                       </div>
                       <div className="card-premium-pattern card-premium-orange p-5 rounded-xl flex justify-between items-start">
                           <div className="space-y-1">
                               <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Entretien &amp; Réparation</p>
                               <h3 className="text-xl font-bold tracking-tight">
                                   {busExpenses.filter(e => e.category === 'vidange' || e.category === 'reparation').reduce((sum, e) => sum + e.amount, 0).toLocaleString()} CFA
                               </h3>
                           </div>
                           <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg"><CarFront size={16}/></div>
                       </div>
                       <div className="card-premium-pattern card-premium-blue p-5 rounded-xl flex justify-between items-start">
                           <div className="space-y-1">
                               <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Assurance &amp; Patente</p>
                               <h3 className="text-xl font-bold tracking-tight">
                                   {busExpenses.filter(e => e.category === 'assurance' || e.category === 'patente').reduce((sum, e) => sum + e.amount, 0).toLocaleString()} CFA
                               </h3>
                           </div>
                           <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg"><DollarSign size={16}/></div>
                       </div>
                       <div className="card-premium-pattern card-premium-green p-5 rounded-xl flex justify-between items-start">
                           <div className="space-y-1">
                               <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Carburant</p>
                               <h3 className="text-xl font-bold tracking-tight">{busExpenses.filter(e => e.category === 'carburant').reduce((sum, e) => sum + e.amount, 0).toLocaleString()} CFA</h3>
                           </div>
                           <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg"><DollarSign size={16}/></div>
                       </div>
                   </div>

                  <div className="flex justify-between items-center mb-4 shrink-0">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">Suivi des Dépenses de la Flotte</h3>
                      <button 
                          onClick={() => setIsExpenseModalOpen(true)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium text-sm transition-colors shadow-sm shadow-indigo-500/20"
                      >
                          <Plus size={16}/> Enregistrer une dépense
                      </button>
                  </div>

                  {/* Expense Table Container */}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-slate-200/60 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col min-h-0 mb-6">
                      <div className="flex-1 overflow-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse whitespace-nowrap">
                              <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700">Date</th>
                                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700">Véhicule (Circuit)</th>
                                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700">Catégorie</th>
                                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700">Description</th>
                                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700 text-right">Montant</th>
                                      <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700 text-center">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {busExpenses.length === 0 ? (
                                      <tr>
                                          <td colSpan={6} className="p-12 text-center text-gray-400">
                                              Aucune dépense enregistrée pour le moment.
                                          </td>
                                      </tr>
                                  ) : (
                                      busExpenses.map(expense => (
                                          <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                              <td className="p-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                                  {new Date(expense.date).toLocaleDateString('fr-FR')}
                                              </td>
                                              <td className="p-4 text-sm font-semibold text-gray-800 dark:text-white">
                                                  {expense.routeId}
                                              </td>
                                              <td className="p-4 text-sm">
                                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold
                                                      ${expense.category === 'assurance' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        expense.category === 'reparation' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        expense.category === 'vidange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                        expense.category === 'patente' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                        expense.category === 'carburant' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        expense.category === 'lavage' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}
                                                  `}>
                                                      {BUS_EXPENSE_CATEGORIES.find(cat => cat.key === expense.category)?.label}
                                                  </span>
                                              </td>
                                              <td className="p-4 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                                                  {expense.description || '-'}
                                              </td>
                                              <td className="p-4 text-sm font-bold text-gray-800 dark:text-white text-right tabular-nums">
                                                  {expense.amount.toLocaleString()} CFA
                                              </td>
                                              <td className="p-4 text-center">
                                                  <button 
                                                      onClick={() => handleDeleteBusExpense(expense.id)}
                                                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 rounded transition-colors"
                                                      title="Supprimer"
                                                  >
                                                      <Trash2 size={16} />
                                                  </button>
                                              </td>
                                          </tr>
                                      ))
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

         {/* TAB: STATS */}
         {activeTab === 'stats' && (
             <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-6">
                 <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><BarChart2 size={20} className="text-indigo-600"/> Analyse des Paiements</h3>
                 <div className="flex-1 min-h-0">
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={chartData} barSize={60}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
                             <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} tickFormatter={(value) => `${value/1000}k`} />
                             <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: '#1F2937', color: '#fff' }} />
                             <Bar dataKey="montant" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Montant Payé (CFA)" />
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
             </div>
         )}
      </div>
       
       {/* --- MODALS --- */}
        {/* ADD BUS EXPENSE MODAL */}
        {isExpenseModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold dark:text-white">Enregistrer une dépense de car</h2>
                        <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Date
                            </label>
                            <input
                                type="date"
                                value={newExpenseForm.date}
                                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, date: e.target.value })}
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Véhicule (Circuit)
                            </label>
                            <select
                                value={newExpenseForm.routeId}
                                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, routeId: e.target.value })}
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="">Sélectionner le car</option>
                                {routes.map(r => (
                                    <option key={r.id} value={`${r.name} (${r.licensePlate || 'Sans Plaque'})`}>
                                        {r.name} - {r.licensePlate || 'Sans plaque'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Type de Dépense
                            </label>
                            <select
                                value={newExpenseForm.category}
                                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value as any })}
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                {BUS_EXPENSE_CATEGORIES.map(cat => (
                                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Montant (CFA)
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={newExpenseForm.amount}
                                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description / Détail
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Vidange filtre à huile et gazole"
                                value={newExpenseForm.description}
                                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            onClick={() => setIsExpenseModalOpen(false)}
                            className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-600 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSaveBusExpense}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md shadow-indigo-500/20"
                        >
                            Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        )}

       
       {/* CONFIRM DELETE SUBSCRIPTION */}
       {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 text-center animate-in fade-in zoom-in duration-200">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
             </div>
             <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Confirmer la suppression</h2>
             <div className="flex justify-center gap-3 mt-6">
                <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Annuler</button>
                <button onClick={handleDeleteSub} className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"><Trash2 size={18}/> Supprimer</button>
             </div>
          </div>
        </div>
       )}

       {/* CONFIRM DELETE ROUTE */}
       {deleteRouteId && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 text-center animate-in fade-in zoom-in duration-200">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
             </div>
             <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Supprimer ce circuit ?</h2>
             <p className="text-sm text-gray-500 dark:text-gray-400">Cela n'effacera pas les paiements des élèves mais dissociera le circuit.</p>
             <div className="flex justify-center gap-3 mt-6">
                <button onClick={() => setDeleteRouteId(null)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Annuler</button>
                <button onClick={handleDeleteRoute} className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"><Trash2 size={18}/> Supprimer</button>
             </div>
          </div>
        </div>
       )}

       {/* ROUTE MODAL (ADD/EDIT) */}
       {isRouteModalOpen && (
           <div className="fixed inset-0 bg-black/50 z-[70] flex justify-center items-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-2xl">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                         <Bus size={20} className="text-indigo-600" /> {editingRouteId ? 'Modifier Circuit' : 'Nouveau Circuit'}
                      </h2>
                      <button onClick={() => setIsRouteModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
                  </div>
                  <div className="p-6 space-y-4 bg-white dark:bg-gray-800">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nom du Circuit</label>
                          <input 
                            type="text" 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                            value={routeForm.name}
                            onChange={(e) => setRouteForm({...routeForm, name: e.target.value})}
                            placeholder="Ex: Circuit Nord"
                          />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Chauffeur</label>
                            <input 
                                type="text" 
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                                value={routeForm.driver}
                                onChange={(e) => setRouteForm({...routeForm, driver: e.target.value})}
                                placeholder="Ex: M. Jean"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Capacité</label>
                            <input 
                                type="number" 
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                                value={routeForm.capacity}
                                onChange={(e) => setRouteForm({...routeForm, capacity: e.target.value})}
                                placeholder="50"
                            />
                        </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Téléphone Chauffeur</label>
                          <input 
                            type="tel" 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                            value={routeForm.phone}
                            onChange={(e) => setRouteForm({...routeForm, phone: e.target.value})}
                            placeholder="Ex: 01 02 03 04 05"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Immatriculation</label>
                          <input 
                            type="text" 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                            value={routeForm.licensePlate}
                            onChange={(e) => setRouteForm({...routeForm, licensePlate: e.target.value})}
                            placeholder="Ex: AB-123-CD"
                          />
                      </div>
                  </div>
                  <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 rounded-b-2xl">
                      <button onClick={() => setIsRouteModalOpen(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Annuler</button>
                      <button onClick={handleSaveRoute} className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2"><Save size={18} /> Enregistrer</button>
                  </div>
              </div>
           </div>
       )}

       {/* SETTINGS (TARIFFS) */}
       {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200/60 dark:border-gray-700">
             <div className="p-6 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Settings size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Configuration Tarifs Transport</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Définissez les montants par Zone ou Niveau</p>
                 </div>
               </div>
               <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Add / Edit Form */}
                <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-5 rounded-xl items-end border ${editingConfigId ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700/30 border-slate-200/60 dark:border-gray-600'}`}>
                   <div className="md:col-span-4">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Zone / Niveau</label>
                      <input type="text" className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-primary/30 outline-none dark:text-white"
                        value={newConfig.grade} onChange={(e) => setNewConfig({...newConfig, grade: e.target.value})} placeholder="Ex: Zone Rosier-Mockeyville" />
                   </div>
                   <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Tarif Inscrit Cantine (F CFA)</label>
                      <input type="number" className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-primary/30 outline-none dark:text-white"
                        value={newConfig.canteenSubAmount} onChange={(e) => setNewConfig({...newConfig, canteenSubAmount: e.target.value})} placeholder="0" />
                   </div>
                   <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Tarif Non Inscrit Cantine (F CFA)</label>
                      <input type="number" className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-primary/30 outline-none dark:text-white"
                        value={newConfig.noCanteenSubAmount} onChange={(e) => setNewConfig({...newConfig, noCanteenSubAmount: e.target.value})} placeholder="0" />
                   </div>
                   <div className="md:col-span-2">
                        <button onClick={handleAddOrUpdateConfig} className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary/90 text-sm font-bold flex items-center justify-center gap-2 shadow-sm">
                          {editingConfigId ? <Save size={16} /> : <Plus size={16} />} {editingConfigId ? 'Enregistrer' : 'Ajouter'}
                        </button>
                   </div>
                </div>

                {/* List */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
                   <table className="w-full min-w-[600px] text-left whitespace-nowrap">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                         <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Zone / Niveau</th>
                            <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Inscrit Cantine</th>
                            <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Non Inscrit Cantine</th>
                            <th className="p-4 text-right"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                         {configs.map((config) => (
                            <tr key={config.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                               <td className="p-4 font-bold text-gray-800 dark:text-white">{config.grade}</td>
                               <td className="p-4 text-right font-bold text-green-600 dark:text-green-400 tabular-nums">{config.canteenSubAmount.toLocaleString()} F</td>
                               <td className="p-4 text-right font-bold text-orange-600 dark:text-orange-400 tabular-nums">{config.noCanteenSubAmount.toLocaleString()} F</td>
                               <td className="p-4 text-right">
                                  <button onClick={() => {
                                      setNewConfig({
                                          grade: config.grade,
                                          canteenSubAmount: config.canteenSubAmount.toString(),
                                          noCanteenSubAmount: config.noCanteenSubAmount.toString()
                                      });
                                      setEditingConfigId(config.id);
                                  }} className="text-blue-600 hover:bg-blue-50 p-2 rounded mr-1"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDeleteConfig(config.id)} className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
             <div className="p-6 border-t border-slate-200/60 dark:border-gray-700 flex justify-end bg-gray-50/50 dark:bg-gray-800 rounded-b-2xl">
                <button onClick={() => setIsSettingsOpen(false)} className="px-6 py-2.5 border rounded-lg hover:bg-gray-100 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700">Fermer</button>
             </div>
          </div>
        </div>
       )}

       {/* EDIT SUBSCRIPTION */}
       {editingSub && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200/60 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-2xl">
                   <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Edit2 size={20} className="text-blue-600" /> Modifier Transport
                   </h2>
                   <button onClick={() => setEditingSub(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
               </div>
               <div className="p-6 space-y-5 bg-white dark:bg-gray-800 overflow-y-auto">
                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">NOM ÉLÈVE</label>
                       <input 
                          type="text" 
                          className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                          value={editingSub.studentName} 
                          onChange={(e) => setEditingSub({...editingSub, studentName: e.target.value})}
                          readOnly
                       />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">CLASSE</label>
                       <input 
                          type="text" 
                          className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                          value={editingSub.class} 
                          onChange={(e) => setEditingSub({...editingSub, class: e.target.value})}
                          readOnly
                       />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">CIRCUIT</label>
                       <select 
                          className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                          value={editingSub.routeId}
                          onChange={(e) => setEditingSub({...editingSub, routeId: e.target.value})}
                       >
                           {/* BUG-009 FIX: routesWithCount has live registered counts from subscriptions */}
                           {routesWithCount.map(route => (
                             <option key={route.id} value={route.name}>{route.name}</option>
                          ))}
                       </select>
                   </div>
                   <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">ZONE DE TARIFICATION</label>
                        <select 
                           className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                           value={editingSub.zone || (configs[0] ? configs[0].grade : '')}
                           onChange={(e) => setEditingSub({...editingSub, zone: e.target.value})}
                        >
                           {configs.map(config => (
                              <option key={config.id} value={config.grade}>{config.grade}</option>
                           ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">STATUT CANTINE (TARIFICATION)</label>
                        <select 
                           className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                           value={editingSub.isCanteenSubscribed ? 'yes' : 'no'}
                           onChange={(e) => setEditingSub({...editingSub, isCanteenSubscribed: e.target.value === 'yes'})}
                        >
                           <option value="yes">Inscrit à la cantine (Tarif réduit)</option>
                           <option value="no">Non inscrit à la cantine (Tarif plein)</option>
                        </select>
                    </div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">PAYÉ V1</label>
                            <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                              value={editingSub.periods.p1} onChange={(e) => setEditingSub({...editingSub, periods: {...editingSub.periods, p1: parseFloat(e.target.value) || 0}})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">PAYÉ V2</label>
                            <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                              value={editingSub.periods.p2} onChange={(e) => setEditingSub({...editingSub, periods: {...editingSub.periods, p2: parseFloat(e.target.value) || 0}})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">PAYÉ V3</label>
                            <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                              value={editingSub.periods.p3} onChange={(e) => setEditingSub({...editingSub, periods: {...editingSub.periods, p3: parseFloat(e.target.value) || 0}})} />
                        </div>
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">REMISE (%)</label>
                       <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                         value={editingSub.discountPercent} onChange={(e) => setEditingSub({...editingSub, discountPercent: parseFloat(e.target.value) || 0})} />
                   </div>
               </div>
               <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 rounded-b-2xl flex justify-end gap-3">
                   <button onClick={() => setEditingSub(null)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-lg transition-all">Annuler</button>
                   <button onClick={handleUpdateSub} className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"><Save size={18} /> Enregistrer</button>
               </div>
           </div>
        </div>
       )}

       {/* NEW SUBSCRIPTION */}
       {isNewSubModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200/60 dark:border-gray-700 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-2xl">
                   <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Plus size={20} className="text-green-600" /> Nouveau Dossier Transport
                   </h2>
                   <button onClick={() => setIsNewSubModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
               </div>
               <div className="p-6 space-y-5 bg-white dark:bg-gray-800 overflow-y-auto">
                   <div className="flex justify-end">
                       <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1 border border-blue-200">
                           <UserPlus size={12} /> Mode: Recherche Base Scolarité
                       </span>
                   </div>
                   <div className="space-y-2">
                       <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1"><UserPlus size={14}/> RECHERCHER ÉLÈVE</label>
                       <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                           <input 
                               type="text" 
                               className="w-full pl-9 pr-4 py-3 bg-blue-50/50 dark:bg-gray-900 border border-blue-100 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-gray-900 dark:text-white transition-all"
                               placeholder="Tapez le nom de l'élève..."
                               value={studentSearchTerm}
                               onChange={(e) => setStudentSearchTerm(e.target.value)}
                           />
                           {studentSearchTerm && (
                               <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-600 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                   {students
                                    .filter(s => s.firstName.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.lastName.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                                    .sort((a, b) => {
                                        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
                                        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
                                        return nameA.localeCompare(nameB);
                                    })
                                    .map(s => (
                                       <button 
                                           key={s.id} 
                                           onClick={() => handleSelectStudent(s)}
                                           className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center border-b last:border-0 dark:border-gray-700"
                                       >
                                           <div>
                                               <p className="font-bold text-sm text-gray-800 dark:text-white">{s.lastName.toUpperCase()} {s.firstName}</p>
                                               <p className="text-xs text-gray-500 dark:text-gray-400">{s.grade}</p>
                                           </div>
                                           <Plus size={16} className="text-blue-600" />
                                       </button>
                                   ))}
                                   {students.filter(s => s.firstName.toLowerCase().includes(studentSearchTerm.toLowerCase())).length === 0 && (
                                       <div className="p-3 text-center text-xs text-gray-400">Aucun élève trouvé</div>
                                   )}
                               </div>
                           )}
                       </div>
                   </div>

                   <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-slate-200/60 dark:border-gray-700 space-y-4">
                       <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">NOM ÉLÈVE</label>
                           <input 
                              type="text" 
                              className="w-full p-3 bg-gray-100 dark:bg-gray-600 border-transparent rounded-xl text-gray-500 dark:text-gray-300 cursor-not-allowed" 
                              value={newSubData.name} 
                              readOnly
                              placeholder="Sélectionnez un élève ci-dessus"
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">CLASSE</label>
                           <input 
                              type="text" 
                              className="w-full p-3 bg-gray-100 dark:bg-gray-600 border-transparent rounded-xl text-gray-500 dark:text-gray-300 cursor-not-allowed" 
                              value={newSubData.class} 
                              readOnly
                              placeholder="Automatique"
                           />
                       </div>
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">CIRCUIT</label>
                       <select 
                          className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                          value={newSubData.route}
                          onChange={(e) => setNewSubData({...newSubData, route: e.target.value})}
                       >
                          <option value="">Sélectionner un circuit</option>
                          {routesWithCount.map(route => (
                             <option key={route.id} value={route.name}>{route.name}</option>
                          ))}
                       </select>
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">ZONE DE TARIFICATION</label>
                       <select 
                          className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                          value={newSubData.zone}
                          onChange={(e) => setNewSubData({...newSubData, zone: e.target.value})}
                       >
                          {configs.map(config => (
                             <option key={config.id} value={config.grade}>{config.grade}</option>
                          ))}
                       </select>
                   </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">STATUT CANTINE (TARIFICATION)</label>
                        <select 
                           className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                           value={newSubData.isCanteenSub}
                           onChange={(e) => setNewSubData({...newSubData, isCanteenSub: e.target.value})}
                        >
                           <option value="yes">Inscrit à la cantine (Tarif réduit)</option>
                           <option value="no">Non inscrit à la cantine (Tarif plein)</option>
                        </select>
                    </div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">V1</label>
                            <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                              value={newSubData.p1} onChange={(e) => setNewSubData({...newSubData, p1: e.target.value})} placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">V2</label>
                            <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                              value={newSubData.p2} onChange={(e) => setNewSubData({...newSubData, p2: e.target.value})} placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">V3</label>
                            <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                              value={newSubData.p3} onChange={(e) => setNewSubData({...newSubData, p3: e.target.value})} placeholder="0" />
                        </div>
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">REMISE (%)</label>
                       <input type="number" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                         value={newSubData.discount} onChange={(e) => setNewSubData({...newSubData, discount: e.target.value})} placeholder="0" />
                   </div>
               </div>
               <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 rounded-b-2xl flex justify-end gap-3">
                   <button onClick={() => setIsNewSubModalOpen(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-lg transition-all">Annuler</button>
                   <button onClick={handleAddSub} className="px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all flex items-center gap-2"><Plus size={18} /> Créer</button>
               </div>
           </div>
        </div>
       )}

    </div>
  );
};

export default Transport;
