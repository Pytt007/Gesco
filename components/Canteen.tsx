
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { printHtml } from '../services/printService';
import {
    Utensils,
    Users,
    AlertTriangle,
    Search,
    Upload,
    Download,
    Plus,
    Edit2,
    Trash2,
    Printer,
    Save,
    X,
    DollarSign,
    TrendingUp,
    TrendingDown,
    BarChart2,
    FileSpreadsheet,
    Settings,
    UserPlus,
    Calendar,
    ChefHat,
    Leaf,
    Coffee,
    ChevronLeft,
    ChevronRight,
    Package
} from 'lucide-react';
import * as XLSX from '@e965/xlsx';
import { CanteenMenu, Student, NotificationType, Transaction } from '../types';


const getDayName = (date: Date): string => {
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return days[date.getDay()];
};

interface CanteenSubscription {
    id: string;
    studentId?: string; // BUG-008 FIX: Stable link to student record — survives name changes
    studentName: string;
    class: string;
    periods: {
        p1: number;
        p2: number;
        p3: number;
    };
    discountPercent: number;
    discountAmount: number;
    initialTotal: number;
    netTotal: number;
    totalPaid: number;
    remaining: number;
    status: 'Soldé' | 'Partiel' | 'Impayé';
}

interface CanteenFeeConfig {
    id: string;
    grade: string; // Nom de la catégorie (ex: Prescolaire, Primaire)
    totalAmount: number; // Montant total annuel
}

interface CanteenExpense {
    id: string;
    date: string;
    category: 'course_supermarche' | 'marche' | 'attieke' | 'poisson' | 'viande_hachee' | 'poulet' | 'fruits' | 'oignons' | 'gaz' | 'autre';
    amount: number;
    description: string;
}

const CANTEEN_EXPENSE_CATEGORIES = [
    { key: 'course_supermarche', label: 'Course Supermarché (riz, huile, etc.)' },
    { key: 'marche', label: 'Marché (condiments, légumes etc)' },
    { key: 'attieke', label: 'Attiéké' },
    { key: 'poisson', label: 'Poisson (thon, chinchard, etc.)' },
    { key: 'viande_hachee', label: 'Viande hachée' },
    { key: 'poulet', label: 'Poulet' },
    { key: 'fruits', label: 'Fruits' },
    { key: 'oignons', label: 'Oignons' },
    { key: 'gaz', label: 'Gaz' },
    { key: 'autre', label: 'Autres (à préciser)' }
];

interface StockItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    minThreshold: number;
    category: string;
}

interface CanteenProps {
    students: Student[];
    subscriptions: any[];
    setSubscriptions: React.Dispatch<React.SetStateAction<any[]>>;
    menus: CanteenMenu[];
    setMenus: React.Dispatch<React.SetStateAction<CanteenMenu[]>>;
    addNotification: (type: NotificationType, message: string) => void;
    schoolName: string;
    schoolLogo: string;
    schoolYear: string;
    transactions?: Transaction[];
    setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
    canteenConfigs?: CanteenFeeConfig[];
    setCanteenConfigs?: React.Dispatch<React.SetStateAction<CanteenFeeConfig[]>>;
    stockItems?: StockItem[];
    setStockItems?: React.Dispatch<React.SetStateAction<StockItem[]>>;
    canteenExpenses?: CanteenExpense[];
    setCanteenExpenses?: React.Dispatch<React.SetStateAction<CanteenExpense[]>>;
}

const DEFAULT_FEE_CONFIGS: CanteenFeeConfig[] = [
    { id: 'CF1', grade: 'Prescolaire', totalAmount: 145000 },
    { id: 'CF2', grade: 'Primaire', totalAmount: 170000 },
];

const getCanteenCategory = (className: string): 'Prescolaire' | 'Primaire' => {
    const name = className.toLowerCase();
    if (
        name.includes('garderie') ||
        name.includes('section') ||
        name.includes('maternelle') ||
        name.includes('pre') ||
        name.includes('ptesection') ||
        name.includes('moysection') ||
        name.includes('grdsection')
    ) {
        return 'Prescolaire';
    }
    return 'Primaire';
};

const calculateFinancials = (
    className: string,
    paidP1: number,
    paidP2: number,
    paidP3: number,
    discountPercent: number,
    configs: CanteenFeeConfig[]
) => {
    const category = getCanteenCategory(className);
    const config = configs.find(c => c.grade.toLowerCase() === category.toLowerCase()) || configs[0];

    const initialTotal = config ? config.totalAmount : 170000;

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

const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const formatDateISO = (date: Date) => {
    return date.toISOString().split('T')[0];
};



const Canteen: React.FC<CanteenProps> = ({
    students,
    subscriptions,
    setSubscriptions,
    menus,
    setMenus,
    addNotification,
    schoolName,
    schoolLogo,
    schoolYear,
    transactions,
    setTransactions,
    canteenConfigs: propsCanteenConfigs,
    setCanteenConfigs: propsSetCanteenConfigs,
    stockItems: propsStockItems,
    setStockItems: propsSetStockItems,
    canteenExpenses: propsCanteenExpenses,
    setCanteenExpenses: propsSetCanteenExpenses,
}) => {
    const [activeTab, setActiveTab] = useState<'subscriptions' | 'menus' | 'stock' | 'expenses'>('subscriptions');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('Toutes');
    const [sortOrder, setSortOrder] = useState<'alpha' | 'recent'>('alpha');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePrintInvoice = (sub: CanteenSubscription) => {


        const today = new Date().toLocaleDateString('fr-FR');
        // BUG-016 FIX: 8 timestamp digits + 4 random hex chars = no collisions
        const invoiceNumber = `CAN-${Date.now().toString().slice(-8)}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

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
              <title>Reçu Cantine - ${sub.studentName}</title>
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
                <h1>REÇU DE PAIEMENT - CANTINE</h1>
                <h2>${schoolName}</h2>
                <p>Année Scolaire ${schoolYear}</p>
              </div>

              <div class="info-grid">
                <div class="info-box">
                  <div class="info-label">Élève</div>
                  <div class="info-value">${sub.studentName}</div>
                  <div style="margin-top:5px; font-size:14px;">Classe: ${sub.class}</div>
                </div>
                <div class="info-box" style="text-align:right;">
                  <div class="info-label">Réçu N°</div>
                  <div class="info-value">${invoiceNumber}</div>
                  <div style="margin-top:5px; font-size:14px;">Date: ${today}</div>
                </div>
              </div>

              <h3>Détail des versements cantine effectués</h3>
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
                  <span>Montant Annuel Cantine:</span>
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

    // Configurations de cantine (Supabase avec fallback LocalStorage)
    const [localCanteenConfigs, setLocalCanteenConfigs] = useState<CanteenFeeConfig[]>(DEFAULT_FEE_CONFIGS);
    const canteenConfigs = propsCanteenConfigs ?? localCanteenConfigs;
    const setCanteenConfigs = propsSetCanteenConfigs ?? setLocalCanteenConfigs;

    useEffect(() => {
        if (propsCanteenConfigs && propsCanteenConfigs.length === 0 && propsSetCanteenConfigs) {
            propsSetCanteenConfigs(DEFAULT_FEE_CONFIGS);
        }
    }, [propsCanteenConfigs, propsSetCanteenConfigs]);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

    const [newConfig, setNewConfig] = useState({ grade: '', totalAmount: '' });

    const [editingSub, setEditingSub] = useState<CanteenSubscription | null>(null);
    const [isNewSubModalOpen, setIsNewSubModalOpen] = useState(false);
    const [newSubData, setNewSubData] = useState({ name: '', class: '', p1: '0', p2: '0', p3: '0', discount: '0' });
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteStockId, setDeleteStockId] = useState<string | null>(null);
    const [deleteMenuDate, setDeleteMenuDate] = useState<string | null>(null);
    const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);

    const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));

    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [editingMenuDate, setEditingMenuDate] = useState<string | null>(null);
    const [menuForm, setMenuForm] = useState({ main: '', vegetarian: '', dessert: '' });

    const DEFAULT_STOCK_ITEMS: StockItem[] = [];

    // Stocks de cantine (Supabase avec fallback LocalStorage)
    const [localStockItems, setLocalStockItems] = useState<StockItem[]>(DEFAULT_STOCK_ITEMS);
    const stockItems = propsStockItems ?? localStockItems;
    const setStockItems = propsSetStockItems ?? setLocalStockItems;

    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);
    const [stockForm, setStockForm] = useState({
        name: '',
        quantity: '',
        unit: 'kg',
        minThreshold: '5',
        category: 'Épicerie'
    });

    // Dépenses de cantine (Supabase avec fallback LocalStorage)
    const [localCanteenExpenses, setLocalCanteenExpenses] = useState<CanteenExpense[]>([]);
    const canteenExpenses = propsCanteenExpenses ?? localCanteenExpenses;
    const setCanteenExpenses = propsSetCanteenExpenses ?? setLocalCanteenExpenses;
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [newExpenseForm, setNewExpenseForm] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'course_supermarche' as CanteenExpense['category'],
        amount: '',
        description: ''
    });

    const [dishesLibrary, setDishesLibrary] = useState<{ name: string; type: string; label: string }[]>([
        { name: "Riz Sauce Tomate", type: "main", label: "Plat Principal" },
        { name: "Poulet Yassa", type: "main", label: "Plat Principal" },
        { name: "Ragoût de Bœuf", type: "main", label: "Plat Principal" },
        { name: "Pâtes Bolognaise", type: "main", label: "Plat Principal" },
        { name: "Poisson Grillé", type: "main", label: "Plat Principal" },
        { name: "Couscous Tunisien", type: "main", label: "Plat Principal" },
        { name: "Salade de Lentilles", type: "vegetarian", label: "Végétarien" },
        { name: "Quiche aux légumes", type: "vegetarian", label: "Végétarien" },
        { name: "Riz aux légumes", type: "vegetarian", label: "Végétarien" },
        { name: "Gratin de pommes de terre", type: "vegetarian", label: "Végétarien" },
        { name: "Pomme & Yaourt", type: "dessert", label: "Dessert" },
        { name: "Mousse au Chocolat", type: "dessert", label: "Dessert" },
        { name: "Tarte aux Fruits", type: "dessert", label: "Dessert" },
        { name: "Banane & Fruit de saison", type: "dessert", label: "Dessert" }
    ]);
    const [isNewDishModalOpen, setIsNewDishModalOpen] = useState(false);
    const [newDishForm, setNewDishForm] = useState({ name: '', type: 'main' as 'main' | 'vegetarian' | 'dessert' });

    const totalRevenue = subscriptions.reduce((acc, curr) => acc + curr.totalPaid, 0);
    const remainingRevenue = subscriptions.reduce((acc, curr) => acc + curr.remaining, 0);
    const activeSubscribers = subscriptions.filter(s => s.totalPaid > 0).length;

    const filteredSubscriptions = subscriptions.filter(s => {
        const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = selectedClass === 'Toutes' || s.class === selectedClass;
        return matchesSearch && matchesClass;
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

    const handlePrevWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentWeekStart(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentWeekStart(newDate);
    };

    const handleToday = () => {
        setCurrentWeekStart(getStartOfWeek(new Date()));
    };

    const handleOpenMenuModal = (date: Date) => {
        const dateStr = formatDateISO(date);
        setEditingMenuDate(dateStr);

        const existingMenu = menus.find(m => m.date === dateStr);

        if (existingMenu) {
            setMenuForm({
                main: existingMenu.main,
                vegetarian: existingMenu.vegetarian,
                dessert: existingMenu.dessert
            });
        } else {
            setMenuForm({ main: '', vegetarian: '', dessert: '' });
        }
        setIsMenuModalOpen(true);
    };

    const handleSaveMenu = () => {
        if (!editingMenuDate) return;

        const dateObj = new Date(editingMenuDate);
        const dayName = getDayName(dateObj);
        const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

        const newMenuItem: CanteenMenu = {
            id: `MENU-${Date.now()}`,
            date: editingMenuDate,
            day: formattedDay,
            main: menuForm.main,
            vegetarian: menuForm.vegetarian,
            dessert: menuForm.dessert
        };

        setMenus(prev => {
            const index = prev.findIndex(m => m.date === editingMenuDate);
            if (index >= 0) {
                const newMenus = [...prev];
                newMenus[index] = { ...newMenus[index], ...newMenuItem };
                return newMenus;
            } else {
                return [...prev, newMenuItem];
            }
        });

        addNotification('success', 'Menu mis à jour.');
        setIsMenuModalOpen(false);
        setEditingMenuDate(null);
        setMenuForm({ main: '', vegetarian: '', dessert: '' });
    };

    const confirmDeleteMenu = (dateStr: string) => {
        setDeleteMenuDate(dateStr);
    };

    const handleOpenStockModal = (item?: StockItem) => {
        if (item) {
            setEditingStockItem(item);
            setStockForm({
                name: item.name,
                quantity: item.quantity.toString(),
                unit: item.unit,
                minThreshold: item.minThreshold.toString(),
                category: item.category
            });
        } else {
            setEditingStockItem(null);
            setStockForm({ name: '', quantity: '0', unit: 'kg', minThreshold: '5', category: 'Épicerie' });
        }
        setIsStockModalOpen(true);
    };

    const handleSaveStock = () => {
        if (!stockForm.name) {
            addNotification('error', 'Le nom de l\'article est requis.');
            return;
        }

        const newItemData = {
            name: stockForm.name,
            quantity: parseFloat(stockForm.quantity) || 0,
            unit: stockForm.unit,
            minThreshold: parseFloat(stockForm.minThreshold) || 0,
            category: stockForm.category
        };

        if (editingStockItem) {
            setStockItems(prev => prev.map(item => item.id === editingStockItem.id ? { ...item, ...newItemData } : item));
        } else {
            const newItem: StockItem = {
                id: `STK-${Date.now()}`,
                ...newItemData
            };
            setStockItems(prev => [...prev, newItem]);
        }
        addNotification('success', 'Stock mis à jour.');
        setIsStockModalOpen(false);
    };

    const handleDeleteStock = (id: string) => {
        setDeleteStockId(id);
    };

    const executeDeleteStock = () => {
        if (deleteStockId) {
            setStockItems(prev => prev.filter(item => item.id !== deleteStockId));
            setDeleteStockId(null);
        }
    };

    const handleSaveExpense = () => {
        if (!newExpenseForm.amount || parseFloat(newExpenseForm.amount) <= 0) {
            addNotification('error', 'Veuillez saisir un montant valide.');
            return;
        }

        const newExpense: CanteenExpense = {
            id: `EXP-${Date.now()}`,
            date: newExpenseForm.date,
            category: newExpenseForm.category,
            amount: parseFloat(newExpenseForm.amount),
            description: newExpenseForm.description
        };

        setCanteenExpenses(prev => [newExpense, ...prev]);

        // Synchronize with general transactions
        if (setTransactions) {
            const newTransaction: Transaction = {
                id: newExpense.id,
                date: newExpense.date,
                description: `[Cantine] ${newExpense.description || CANTEEN_EXPENSE_CATEGORIES.find(c => c.key === newExpense.category)?.label}`,
                amount: newExpense.amount,
                type: 'expense',
                category: 'cantine'
            };
            setTransactions(prev => [newTransaction, ...prev]);
        }

        addNotification('success', 'Dépense enregistrée avec succès.');
        setIsExpenseModalOpen(false);
        setNewExpenseForm({
            date: new Date().toISOString().split('T')[0],
            category: 'course_supermarche',
            amount: '',
            description: ''
        });
    };

    const handleDeleteExpense = (id: string) => {
        setCanteenExpenses(prev => prev.filter(e => e.id !== id));
        if (setTransactions) {
            setTransactions(prev => prev.filter(t => t.id !== id));
        }
        addNotification('success', 'Dépense supprimée.');
    };

    const handleSaveNewDish = () => {
        if (!newDishForm.name.trim()) {
            addNotification('error', 'Le nom du plat est requis.');
            return;
        }

        const label = newDishForm.type === 'main' ? 'Plat Principal' : (newDishForm.type === 'vegetarian' ? 'Végétarien' : 'Dessert');
        const newDish = {
            name: newDishForm.name.trim(),
            type: newDishForm.type,
            label: label
        };

        setDishesLibrary(prev => [...prev, newDish]);
        addNotification('success', 'Nouveau plat ajouté à la bibliothèque.');
        setIsNewDishModalOpen(false);
        setNewDishForm({ name: '', type: 'main' });
    };

    const handleDeleteDish = (nameToDelete: string) => {
        setDishesLibrary(prev => prev.filter(d => d.name !== nameToDelete));
        addNotification('success', 'Plat retiré de la bibliothèque.');
    };

    const handleAddOrUpdateConfig = () => {
        if (!newConfig.grade || !newConfig.totalAmount) return;

        const total = parseInt(newConfig.totalAmount) || 0;

        if (editingConfigId) {
            setCanteenConfigs(configs => configs.map(c =>
                c.id === editingConfigId
                    ? { ...c, grade: newConfig.grade, totalAmount: total }
                    : c
            ));
            setEditingConfigId(null);
        } else {
            const newItem: CanteenFeeConfig = {
                id: Date.now().toString(),
                grade: newConfig.grade,
                totalAmount: total
            };
            setCanteenConfigs([...canteenConfigs, newItem]);
        }
        addNotification('success', 'Configuration tarifaire mise à jour.');
        setNewConfig({ grade: '', totalAmount: '' });
    };

    const handleEditConfig = (config: CanteenFeeConfig) => {
        setNewConfig({
            grade: config.grade,
            totalAmount: config.totalAmount.toString()
        });
        setEditingConfigId(config.id);
    };

    const confirmDeleteConfig = (id: string) => {
        setDeleteConfigId(id);
    };

    const executeDeleteConfig = () => {
        if (deleteConfigId) {
            setCanteenConfigs(canteenConfigs.filter(c => c.id !== deleteConfigId));
            if (editingConfigId === deleteConfigId) {
                setEditingConfigId(null);
                setNewConfig({ grade: '', totalAmount: '' });
            }
            setDeleteConfigId(null);
            addNotification('success', 'Tarif supprimé.');
        }
    };

    const handleEditSubscription = (sub: CanteenSubscription) => {
        setEditingSub(JSON.parse(JSON.stringify(sub)));
    };

    const handleSaveEditSub = () => {
        if (!editingSub) return;

        const p1 = parseFloat(editingSub.periods.p1.toString()) || 0;
        const p2 = parseFloat(editingSub.periods.p2.toString()) || 0;
        const p3 = parseFloat(editingSub.periods.p3.toString()) || 0;
        const discountPercent = parseFloat(editingSub.discountPercent.toString()) || 0;

        const financials = calculateFinancials(editingSub.class, p1, p2, p3, discountPercent, canteenConfigs);

        if (financials.totalPaid > financials.netTotal) {
            addNotification('error', `Montant payé (${financials.totalPaid.toLocaleString()}) supérieur au total dû (${financials.netTotal.toLocaleString()}).`);
            return;
        }

        const updated: CanteenSubscription = {
            ...editingSub,
            periods: { p1, p2, p3 },
            discountPercent,
            ...financials
        };

        setSubscriptions(prev => prev.map(s => s.id === updated.id ? updated : s));
        addNotification('success', 'Abonnement modifié.');
        setEditingSub(null);
    };

    const confirmDeleteSubscription = (id: string) => {
        setDeleteId(id);
    };

    const executeDeleteSubscription = () => {
        if (deleteId) {
            setSubscriptions(prev => prev.filter(s => s.id !== deleteId));
            addNotification('success', 'Abonnement supprimé.');
            setDeleteId(null);
        }
    };

    const handleSelectStudent = (student: any) => {
        setNewSubData({
            ...newSubData,
            name: `${student.lastName.toUpperCase()} ${student.firstName}`,
            class: student.grade
        });
        setStudentSearchTerm('');
    };

    const handleAddNewSub = () => {
        if (!newSubData.name || !newSubData.class) {
            addNotification('error', 'Veuillez sélectionner un élève.');
            return;
        }

        // FIX C3 — Anti-doublon : vérifier si l'élève est déjà inscrit à la cantine
        const alreadySubscribed = subscriptions.some(
            s => s.studentName.toLowerCase().trim() === newSubData.name.toLowerCase().trim()
        );
        if (alreadySubscribed) {
            addNotification('error', `${newSubData.name} est déjà inscrit(e) à la cantine. Modifiez l'abonnement existant.`);
            return;
        }

        const p1 = parseFloat(newSubData.p1) || 0;
        const p2 = parseFloat(newSubData.p2) || 0;
        const p3 = parseFloat(newSubData.p3) || 0;
        const discountPercent = parseFloat(newSubData.discount) || 0;

        const financials = calculateFinancials(newSubData.class, p1, p2, p3, discountPercent, canteenConfigs);

        if (financials.totalPaid > financials.netTotal) {
            addNotification('error', `Montant payé supérieur au total dû.`);
            return;
        }

        const newSub: CanteenSubscription = {
            id: `MAN-${Date.now()}`,
            studentName: newSubData.name,
            class: newSubData.class,
            periods: { p1, p2, p3 },
            discountPercent,
            ...financials
        };

        setSubscriptions(prev => [newSub, ...prev]);
        addNotification('success', 'Inscription créée avec succès.');
        setIsNewSubModalOpen(false);
        setNewSubData({ name: '', class: '', p1: '0', p2: '0', p3: '0', discount: '0' });
    };

    const handleDownloadTemplate = () => {
        const headers = [{ "NOM & PRENOM": "Ex: DUPONT Jean", "Classe": "CP1 A", "V1": 30000, "V2": 30000, "V3": 0, "Remise (%)": 0 }];
        const ws = XLSX.utils.json_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modele_Cantine");
        XLSX.writeFile(wb, "modele_cantine.xlsx");
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

                let newRecords: CanteenSubscription[] = [];

                data.forEach((row, idx) => {
                    const keys = Object.keys(row);
                    // Colonne combinée vs séparée
                    const combinedKey = keys.find(k => k.toLowerCase().includes('nom') && k.toLowerCase().includes('prenom') || k.toLowerCase().includes('fullname'));

                    let fullName = '';
                    if (combinedKey) {
                        fullName = String(row[combinedKey]);
                        // Nettoyage doublon heuristique
                        const parts = fullName.trim().split(' ');
                        if (parts.length >= 2) {
                            // Si la première moitié est identique à la seconde (ex: "DUPONT JEAN dupont jean")
                            const half = Math.floor(parts.length / 2);
                            const s1 = parts.slice(0, half).join(' ').toLowerCase();
                            const s2 = parts.slice(half).join(' ').toLowerCase();
                            if (s1 === s2) {
                                fullName = parts.slice(0, half).join(' ');
                            }
                        }
                    } else {
                        const lKey = keys.find(k => k.toLowerCase() === 'nom');
                        const fKey = keys.find(k => k.toLowerCase().includes('prenom'));
                        const l = row[lKey || ''] || '';
                        const f = row[fKey || ''] || '';
                        fullName = `${l} ${f}`.trim();
                    }

                    // Classe
                    const classKey = keys.find(k => k.toLowerCase().includes('classe') || k.toLowerCase().includes('grade'));
                    const className = classKey ? row[classKey] : 'Non assigné';

                    // Paiements
                    const findKey = (search: string[]) => keys.find(k => search.some(s => k.toLowerCase().includes(s)));
                    const p1 = Number(row[findKey(['sept', 'p1', 'nov', 'v1']) || '']) || 0;
                    const p2 = Number(row[findKey(['déc', 'dec', 'fev', 'fév', 'p2', 'v2']) || '']) || 0;
                    const p3 = Number(row[findKey(['mars', 'mai', 'p3', 'v3']) || '']) || 0;
                    const discountPercent = Number(row[findKey(['remise', 'discount']) || '']) || 0;

                    const financials = calculateFinancials(className, p1, p2, p3, discountPercent, canteenConfigs);

                    newRecords.push({
                        id: `IMP-CT-${Date.now()}-${idx}`,
                        studentName: fullName || `Élève ${idx}`,
                        class: className,
                        periods: { p1, p2, p3 },
                        discountPercent,
                        ...financials
                    });
                });

                // BUG-003 FIX: Deduplicate by studentName — update existing, create new
                const existingMap = new Map<string, CanteenSubscription>();
                newRecords.forEach(rec => existingMap.set(rec.studentName.toLowerCase().trim(), rec));

                setSubscriptions(prev => {
                    const map = new Map<string, CanteenSubscription>();
                    prev.forEach(s => map.set(s.studentName.toLowerCase().trim(), s));

                    let createdCount = 0;
                    let updatedCount = 0;

                    newRecords.forEach(rec => {
                        const key = rec.studentName.toLowerCase().trim();
                        if (map.has(key)) {
                            const ex = map.get(key)!;
                            map.set(key, { ...rec, id: ex.id });
                            updatedCount++;
                        } else {
                            map.set(key, rec);
                            createdCount++;
                        }
                    });

                    addNotification('success', `Import terminé : ${createdCount} créés, ${updatedCount} mis à jour.`);
                    return Array.from(map.values());
                });

            } catch (error) {
                console.error(error);
                addNotification('error', "Erreur lors de l'import. Vérifiez le format du fichier.");
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* CONFIRM DELETE MODAL */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 text-center">
                        <h2 className="text-xl font-bold dark:text-white mb-4">Supprimer l'inscription ?</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Cette action est irréversible.</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded dark:text-gray-300">Annuler</button>
                            <button onClick={executeDeleteSubscription} className="px-4 py-2 bg-red-600 text-white rounded">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT SUBSCRIPTION MODAL */}
            {editingSub && (
                <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200/60 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold dark:text-white">Modifier le Suivi Financier</h2>
                            <button onClick={() => setEditingSub(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="mb-6 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-zinc-850">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Élève:</span>
                                <span className="font-semibold dark:text-white">{editingSub.studentName}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Classe:</span>
                                <span className="font-semibold dark:text-white">{editingSub.class}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Remise (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={editingSub.discountPercent}
                                    onChange={(e) => setEditingSub({ ...editingSub, discountPercent: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Versement 1 (V1)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editingSub.periods.p1}
                                        onChange={(e) => setEditingSub({
                                            ...editingSub,
                                            periods: { ...editingSub.periods, p1: parseFloat(e.target.value) || 0 }
                                        })}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Versement 2 (V2)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editingSub.periods.p2}
                                        onChange={(e) => setEditingSub({
                                            ...editingSub,
                                            periods: { ...editingSub.periods, p2: parseFloat(e.target.value) || 0 }
                                        })}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Versement 3 (V3)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editingSub.periods.p3}
                                        onChange={(e) => setEditingSub({
                                            ...editingSub,
                                            periods: { ...editingSub.periods, p3: parseFloat(e.target.value) || 0 }
                                        })}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setEditingSub(null)}
                                className="px-4 py-2 border rounded-lg text-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-600 transition-colors font-medium"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveEditSub}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md shadow-blue-500/20"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM DELETE CONFIG MODAL */}
            {deleteConfigId && (
                <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 text-center">
                        <h2 className="text-xl font-bold dark:text-white mb-4">Supprimer ce tarif ?</h2>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeleteConfigId(null)} className="px-4 py-2 border rounded dark:text-gray-300">Annuler</button>
                            <button onClick={executeDeleteConfig} className="px-4 py-2 bg-red-600 text-white rounded">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM DELETE STOCK MODAL */}
            {deleteStockId && (
                <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 text-center">
                        <h2 className="text-xl font-bold dark:text-white mb-4">Supprimer cet article ?</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Cette action est irréversible.</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeleteStockId(null)} className="px-4 py-2 border rounded dark:text-gray-300">Annuler</button>
                            <button onClick={executeDeleteStock} className="px-4 py-2 bg-red-600 text-white rounded">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM DELETE MENU MODAL */}
            {deleteMenuDate && (
                <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 text-center">
                        <h2 className="text-xl font-bold dark:text-white mb-4">Supprimer ce menu ?</h2>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeleteMenuDate(null)} className="px-4 py-2 border rounded dark:text-gray-300">Annuler</button>
                            <button onClick={() => {
                                setMenus(prev => prev.filter(m => m.date !== deleteMenuDate));
                                setDeleteMenuDate(null);
                                addNotification('success', 'Menu supprimé.');
                            }} className="px-4 py-2 bg-red-600 text-white rounded">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                <div className="card-premium-pattern card-premium-orange p-5 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold opacity-80">Inscrits Cantine</p>
                        <h3 className="text-2xl font-bold tracking-tight mt-1">{activeSubscribers}</h3>
                    </div>
                    <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl"><Utensils size={24} /></div>
                </div>
                <div className="card-premium-pattern card-premium-green p-5 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold opacity-80">Recettes Cantine</p>
                        <h3 className="text-2xl font-bold tracking-tight mt-1">{totalRevenue.toLocaleString()} F</h3>
                        <p className="text-xs opacity-75">Reste: {remainingRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl"><DollarSign size={24} /></div>
                </div>
                <div className="card-premium-pattern card-premium-rose p-5 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold opacity-80">Dépenses Cantine</p>
                        <h3 className="text-2xl font-bold tracking-tight mt-1">{canteenExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} F</h3>
                    </div>
                    <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl"><TrendingDown size={24} /></div>
                </div>
                {(() => {
                    const totalExpenses = canteenExpenses.reduce((sum, e) => sum + e.amount, 0);
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
                            <div className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl">
                                <BarChart2 size={24} />
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* TABS */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-2 flex overflow-x-auto shrink-0 transition-colors">
                <button onClick={() => setActiveTab('subscriptions')} className={`flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'subscriptions' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white font-bold' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>Suivi Financier</button>
                <button onClick={() => setActiveTab('menus')} className={`flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'menus' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white font-bold' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>Menus de la semaine</button>
                <button onClick={() => setActiveTab('stock')} className={`flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'stock' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white font-bold' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>Stock & Inventaire</button>
                <button onClick={() => setActiveTab('expenses')} className={`flex-1 min-w-[140px] py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-white font-bold' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>Dépenses Cantine</button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 min-h-0 flex flex-col">

                {/* SUBSCRIPTIONS TAB */}
                {activeTab === 'subscriptions' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 flex flex-col h-full overflow-hidden transition-colors">
                        {/* Toolbar */}
                        <div className="p-4 border-b border-slate-200/60 dark:border-gray-700 flex flex-col gap-3.5 bg-gray-50/50 dark:bg-gray-800 shrink-0 z-20 rounded-t-xl">
                            {/* Row 1: Title, Search & Filters */}
                            <div className="flex flex-wrap items-center gap-3 w-full">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white whitespace-nowrap flex items-center gap-2 mr-2">
                                    <FileSpreadsheet className="text-orange-600" /> Suivi Financier Cantine
                                </h2>
                                <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 hidden sm:block"></div>
                                <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input type="text" placeholder="Rechercher élève..." className="w-full pl-9 pr-4 py-2 rounded-xl border bg-white dark:bg-gray-700/50 focus:ring-2 focus:ring-primary/50 text-sm dark:text-white dark:border-gray-600" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
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
                                        <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase sticky left-[80px] z-50 bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-600">CLASSE</th>
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
                                            <td className="p-4 font-bold text-gray-800 dark:text-white sticky left-0 bg-white dark:bg-gray-800 border-r border-slate-200/60 dark:border-gray-700">{sub.studentName}</td>
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300 sticky left-[80px] bg-white dark:bg-gray-800 border-r border-slate-200/60 dark:border-gray-700">{sub.class}</td>
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
                                                    <button onClick={() => handleEditSubscription(sub)} className="p-2 bg-white dark:bg-gray-700 border rounded-lg text-blue-600 hover:bg-blue-50 dark:border-gray-600 dark:hover:bg-blue-900/20" title="Modifier"><Edit2 size={16} /></button>
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

                {/* MENUS TAB */}
                {activeTab === 'menus' && (() => {
                    return (
                        <div className="space-y-6 h-full overflow-auto">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Semaine du {formatDate(currentWeekStart)}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Glissez-déposez un plat ci-dessous dans une journée pour configurer le repas</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronLeft size={20} /></button>
                                    <button onClick={handleToday} className="px-4 py-1.5 text-sm font-medium border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white">Aujourd'hui</button>
                                    <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronRight size={20} /></button>
                                </div>
                            </div>

                            {/* Draggable Dishes Library */}
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-slate-200/60 dark:border-gray-700 space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Bibliothèque de Plats :</p>
                                    <button 
                                        onClick={() => setIsNewDishModalOpen(true)}
                                        className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={12} /> Ajouter un plat
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {dishesLibrary.map((dish, idx) => {
                                        const typeColors = dish.type === 'main' 
                                            ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50'
                                            : dish.type === 'vegetarian'
                                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50'
                                                : 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/50';
                                        return (
                                            <div
                                                key={idx}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('text/plain', `dish:${dish.type}:${dish.name}`);
                                                    e.dataTransfer.effectAllowed = 'copy';
                                                }}
                                                className={`px-3 py-1.5 border rounded-lg text-xs font-bold cursor-grab active:cursor-grabbing hover:shadow transition-all select-none flex items-center gap-1.5 ${typeColors}`}
                                            >
                                                <span>{dish.name}</span>
                                                <span className="opacity-60 text-[10px] font-normal font-sans">({dish.label})</span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteDish(dish.name);
                                                    }}
                                                    className="hover:text-red-650 transition-colors ml-1 cursor-pointer"
                                                    title="Retirer ce plat"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                                {[0, 1, 2, 3, 4].map(offset => {
                                    const date = new Date(currentWeekStart);
                                    date.setDate(date.getDate() + offset);
                                    const dateStr = formatDateISO(date);
                                    const menu = menus.find(m => m.date === dateStr);
                                    const isToday = dateStr === formatDateISO(new Date());

                                    return (
                                        <div 
                                            key={offset} 
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'copy';
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                const dragData = e.dataTransfer.getData('text/plain');
                                                if (dragData && dragData.startsWith('dish:')) {
                                                    const parts = dragData.split(':');
                                                    const dishType = parts[1]; // 'main' | 'vegetarian' | 'dessert'
                                                    const dishName = parts.slice(2).join(':');
                                                    
                                                    if (dishName && dishType) {
                                                        setMenus(prev => {
                                                            const dateObj = new Date(dateStr);
                                                            const dayName = getDayName(dateObj);
                                                            const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

                                                            const existingIndex = prev.findIndex(m => m.date === dateStr);
                                                            if (existingIndex >= 0) {
                                                                const newMenus = [...prev];
                                                                newMenus[existingIndex] = {
                                                                    ...newMenus[existingIndex],
                                                                    [dishType]: dishName
                                                                };
                                                                return newMenus;
                                                            } else {
                                                                const newMenuItem: CanteenMenu = {
                                                                    id: `MENU-${Date.now()}`,
                                                                    date: dateStr,
                                                                    day: formattedDay,
                                                                    main: dishType === 'main' ? dishName : '',
                                                                    vegetarian: dishType === 'vegetarian' ? dishName : '',
                                                                    dessert: dishType === 'dessert' ? dishName : ''
                                                                };
                                                                return [...prev, newMenuItem];
                                                            }
                                                        });
                                                        addNotification('success', `${dishName} ajouté au menu du ${getDayName(date)}.`);
                                                    }
                                                }
                                            }}
                                            className={`bg-white dark:bg-gray-800 rounded-xl border ${isToday ? 'border-primary shadow-md' : 'border-slate-200/60 dark:border-gray-700'} p-4 flex flex-col h-full transition-all hover:shadow-lg hover:border-blue-500/50 group relative`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className={`font-bold ${isToday ? 'text-primary' : 'text-gray-800 dark:text-white'}`}>{getDayName(date)}</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{date.toLocaleDateString()}</p>
                                                </div>
                                                <button onClick={() => handleOpenMenuModal(date)} className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                            <div className="space-y-3 flex-1">
                                                {menu ? (
                                                    <>
                                                        <div 
                                                            draggable={!!menu.main}
                                                            onDragStart={(e) => {
                                                                if (menu.main) {
                                                                    e.dataTransfer.setData('text/plain', `dish:main:${menu.main}`);
                                                                    e.dataTransfer.effectAllowed = 'copy';
                                                                }
                                                            }}
                                                            className={`p-2.5 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/30 ${menu.main ? 'cursor-grab active:cursor-grabbing hover:border-orange-300 dark:hover:border-orange-900 transition-colors select-none' : ''}`}
                                                        >
                                                            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase mb-1 flex items-center gap-1"><Utensils size={12} /> Plat Principal</p>
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{menu.main || 'Non défini'}</p>
                                                        </div>
                                                        <div 
                                                            draggable={!!menu.vegetarian}
                                                            onDragStart={(e) => {
                                                                if (menu.vegetarian) {
                                                                    e.dataTransfer.setData('text/plain', `dish:vegetarian:${menu.vegetarian}`);
                                                                    e.dataTransfer.effectAllowed = 'copy';
                                                                }
                                                            }}
                                                            className={`p-2.5 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30 ${menu.vegetarian ? 'cursor-grab active:cursor-grabbing hover:border-green-300 dark:hover:border-green-900 transition-colors select-none' : ''}`}
                                                        >
                                                            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1 flex items-center gap-1"><Leaf size={12} /> Végétarien</p>
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{menu.vegetarian || 'Non défini'}</p>
                                                        </div>
                                                        <div 
                                                            draggable={!!menu.dessert}
                                                            onDragStart={(e) => {
                                                                if (menu.dessert) {
                                                                    e.dataTransfer.setData('text/plain', `dish:dessert:${menu.dessert}`);
                                                                    e.dataTransfer.effectAllowed = 'copy';
                                                                }
                                                            }}
                                                            className={`p-2.5 bg-pink-50 dark:bg-pink-900/10 rounded-lg border border-pink-100 dark:border-pink-900/30 ${menu.dessert ? 'cursor-grab active:cursor-grabbing hover:border-pink-300 dark:hover:border-pink-900 transition-colors select-none' : ''}`}
                                                        >
                                                            <p className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase mb-1 flex items-center gap-1"><Coffee size={12} /> Dessert</p>
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{menu.dessert || 'Non défini'}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                                                        <ChefHat size={32} className="opacity-20" />
                                                        <p className="text-xs text-center">Aucun menu défini</p>
                                                        <button onClick={() => handleOpenMenuModal(date)} className="px-3 py-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Ajouter</button>
                                                    </div>
                                                )}
                                            </div>
                                            {menu && (
                                                <button onClick={() => confirmDeleteMenu(dateStr)} className="absolute top-4 right-8 p-1.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* STOCK TAB */}
                {activeTab === 'stock' && (
                    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700">
                        <div className="p-6 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2"><Package size={20} className="text-purple-600" /> Inventaire Cuisine</h3>
                            <button onClick={() => handleOpenStockModal()} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"><Plus size={16} /> Nouvel Article</button>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {stockItems.map(item => (
                                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-white dark:bg-gray-800 relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{item.category}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenStockModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDeleteStock(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-gray-800 dark:text-white mb-4 truncate" title={item.name}>{item.name}</h4>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Quantité</p>
                                                <p className={`text-xl font-bold ${item.quantity <= item.minThreshold ? 'text-red-600' : 'text-gray-800 dark:text-white'}`}>
                                                    {item.quantity} <span className="text-sm font-medium text-gray-500">{item.unit}</span>
                                                </p>
                                            </div>
                                            {item.quantity <= item.minThreshold && (
                                                <div className="p-2 bg-red-100 text-red-600 rounded-lg animate-pulse" title="Stock faible">
                                                    <AlertTriangle size={18} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* EXPENSES TAB */}
                {activeTab === 'expenses' && (
                    <div className="h-full flex flex-col min-h-0 p-6 space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 animate-in fade-in duration-300">
                            <div className="card-premium-pattern card-premium-rose p-5 rounded-xl flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Total Dépenses</p>
                                    <h3 className="text-xl font-bold tracking-tight">{canteenExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} CFA</h3>
                                </div>
                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg"><DollarSign size={16}/></div>
                            </div>
                            <div className="card-premium-pattern card-premium-green p-5 rounded-xl flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Aliments &amp; Ingrédients</p>
                                    <h3 className="text-xl font-bold tracking-tight">
                                        {canteenExpenses.filter(e => ['course_supermarche', 'marche', 'attieke', 'poisson', 'viande_hachee', 'poulet', 'fruits', 'oignons'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0).toLocaleString()} CFA
                                    </h3>
                                </div>
                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg"><Utensils size={16}/></div>
                            </div>
                            <div className="card-premium-pattern card-premium-blue p-5 rounded-xl flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Gaz / Énergie</p>
                                    <h3 className="text-xl font-bold tracking-tight">
                                        {canteenExpenses.filter(e => e.category === 'gaz').reduce((sum, e) => sum + e.amount, 0).toLocaleString()} CFA
                                    </h3>
                                </div>
                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg"><Coffee size={16}/></div>
                            </div>
                            <div className="card-premium-pattern card-premium-purple p-5 rounded-xl flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Autres Dépenses</p>
                                    <h3 className="text-xl font-bold tracking-tight">
                                        {canteenExpenses.filter(e => e.category === 'autre').reduce((sum, e) => sum + e.amount, 0).toLocaleString()} CFA
                                    </h3>
                                </div>
                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg"><Users size={16}/></div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Suivi des Dépenses de la Cantine</h3>
                            <button 
                                onClick={() => setIsExpenseModalOpen(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium text-sm transition-colors shadow-sm shadow-indigo-500/20 cursor-pointer"
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
                                            <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700">Catégorie</th>
                                            <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700">Description</th>
                                            <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700 text-right">Montant</th>
                                            <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-700 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {canteenExpenses.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-gray-400">
                                                    Aucune dépense enregistrée pour le moment.
                                                </td>
                                            </tr>
                                        ) : (
                                            canteenExpenses.map(expense => (
                                                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                                        {new Date(expense.date).toLocaleDateString('fr-FR')}
                                                    </td>
                                                    <td className="p-4 text-sm">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold
                                                            ${['course_supermarche', 'marche', 'attieke', 'poisson', 'viande_hachee', 'poulet', 'fruits', 'oignons'].includes(expense.category) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-450' :
                                                              expense.category === 'gaz' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}
                                                        `}>
                                                            {CANTEEN_EXPENSE_CATEGORIES.find(cat => cat.key === expense.category)?.label}
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
                                                            onClick={() => handleDeleteExpense(expense.id)}
                                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 rounded transition-colors cursor-pointer"
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
            </div>

            {/* SETTINGS MODAL */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200/60 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Tarifs Cantine</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-white dark:bg-gray-800">
                            <div className="grid grid-cols-12 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 items-end">
                                <div className="col-span-5">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Catégorie/Classe</label>
                                    <input type="text" className="w-full p-2 rounded border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Ex: Prescolaire" value={newConfig.grade} onChange={e => setNewConfig({ ...newConfig, grade: e.target.value })} />
                                </div>
                                <div className="col-span-4">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Montant Total Annuel (F CFA)</label>
                                    <input type="number" className="w-full p-2 rounded border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="0" value={newConfig.totalAmount} onChange={e => setNewConfig({ ...newConfig, totalAmount: e.target.value })} />
                                </div>
                                <div className="col-span-3">
                                    <button onClick={handleAddOrUpdateConfig} className="w-full py-2 bg-blue-600 text-white rounded font-bold text-sm">{editingConfigId ? 'Mettre à jour' : 'Ajouter'}</button>
                                </div>
                            </div>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto mt-4">
                                <table className="w-full min-w-[500px] text-left whitespace-nowrap">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-600">
                                        <tr>
                                            <th className="p-3 text-xs font-bold text-gray-500 uppercase">Niveau / Catégorie</th>
                                            <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">Montant Total</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {canteenConfigs.map(c => (
                                            <tr key={c.id} className="border-b dark:border-gray-700">
                                                <td className="p-3 font-medium dark:text-white">{c.grade}</td>
                                                <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{c.totalAmount.toLocaleString()} F</td>
                                                <td className="p-3 text-right">
                                                    <button onClick={() => handleEditConfig(c)} className="text-blue-600 mr-2"><Edit2 size={14} /></button>
                                                    <button onClick={() => confirmDeleteConfig(c.id)} className="text-red-600"><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW SUBSCRIPTION MODAL */}
            {isNewSubModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200/60 dark:border-gray-700 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2"><Plus size={20} className="text-primary" /> Nouvelle Inscription Cantine</h2>
                            <button onClick={() => setIsNewSubModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4 bg-white dark:bg-gray-800">
                            <div className="mb-2">
                                <label className="block text-xs font-bold text-primary dark:text-blue-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><UserPlus size={14} /> Rechercher Élève (Base Scolarité)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input type="text" className="w-full pl-9 pr-4 py-3 bg-blue-50/50 dark:bg-gray-900 border border-blue-100 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-gray-900 dark:text-white transition-all" placeholder="Tapez le nom..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} />
                                    {studentSearchTerm && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-600 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                            {students.filter(s => s.firstName.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.lastName.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                                            .sort((a, b) => {
                                                const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
                                                const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
                                                return nameA.localeCompare(nameB);
                                            })
                                            .map(s => {
                                                const isSub = subscriptions.some(sub => sub.studentName === `${s.lastName.toUpperCase()} ${s.firstName}`);
                                                return (
                                                    <button key={s.id} onClick={() => !isSub && handleSelectStudent(s)} disabled={isSub} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center border-b last:border-0 dark:border-gray-700">
                                                        <div><p className="font-bold text-sm dark:text-white">{s.lastName.toUpperCase()} {s.firstName}</p><p className="text-xs text-gray-500">{s.grade}</p></div>
                                                        {isSub ? <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inscrit</span> : <Plus size={16} className="text-primary" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-slate-200/60 dark:border-gray-700 space-y-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom Élève</label><input type="text" className="w-full p-2 bg-gray-100 dark:bg-gray-600 rounded border-transparent cursor-not-allowed dark:text-white" value={newSubData.name} readOnly placeholder="Sélectionnez un élève" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Classe</label><input type="text" className="w-full p-2 bg-gray-100 dark:bg-gray-600 rounded border-transparent cursor-not-allowed dark:text-white" value={newSubData.class} readOnly placeholder="Automatique" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">V1 (Payé)</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newSubData.p1} onChange={e => setNewSubData({ ...newSubData, p1: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">V2 (Payé)</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newSubData.p2} onChange={e => setNewSubData({ ...newSubData, p2: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">V3 (Payé)</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newSubData.p3} onChange={e => setNewSubData({ ...newSubData, p3: e.target.value })} /></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remise (%)</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newSubData.discount} onChange={e => setNewSubData({ ...newSubData, discount: e.target.value })} /></div>
                        </div>
                        <div className="p-5 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800 rounded-b-2xl">
                            <button onClick={() => setIsNewSubModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-white border border-transparent hover:border-gray-200 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700">Annuler</button>
                            <button onClick={handleAddNewSub} className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 shadow-lg shadow-blue-500/20">Créer Dossier</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MENU EDIT MODAL */}
            {isMenuModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold mb-4 dark:text-white">Éditer le Menu</h2>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold uppercase mb-1 text-gray-500">Plat Principal</label><input className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={menuForm.main} onChange={e => setMenuForm({ ...menuForm, main: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold uppercase mb-1 text-gray-500">Végétarien</label><input className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={menuForm.vegetarian} onChange={e => setMenuForm({ ...menuForm, vegetarian: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold uppercase mb-1 text-gray-500">Dessert</label><input className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={menuForm.dessert} onChange={e => setMenuForm({ ...menuForm, dessert: e.target.value })} /></div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsMenuModalOpen(false)} className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">Annuler</button>
                            <button onClick={handleSaveMenu} className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700">Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* STOCK EDIT MODAL */}
            {isStockModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold mb-4 dark:text-white">{editingStockItem ? 'Modifier Article' : 'Nouvel Article'}</h2>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold uppercase mb-1 text-gray-500">Nom</label><input className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={stockForm.name} onChange={e => setStockForm({ ...stockForm, name: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold uppercase mb-1 text-gray-500">Quantité</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold uppercase mb-1 text-gray-500">Unité</label><select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={stockForm.unit} onChange={e => setStockForm({ ...stockForm, unit: e.target.value })}><option value="kg">kg</option><option value="L">L</option><option value="pcs">pcs</option><option value="boites">boites</option></select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold uppercase mb-1 text-gray-500">Seuil Alerte</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={stockForm.minThreshold} onChange={e => setStockForm({ ...stockForm, minThreshold: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold uppercase mb-1 text-gray-500">Catégorie</label><select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={stockForm.category} onChange={e => setStockForm({ ...stockForm, category: e.target.value })}><option>Épicerie</option><option>Frais</option><option>Surgelé</option><option>Boissons</option><option>Autre</option></select></div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsStockModalOpen(false)} className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">Annuler</button>
                            <button onClick={handleSaveStock} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD CANTEEN EXPENSE MODAL */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold dark:text-white">Enregistrer une dépense cantine</h2>
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
                                    Catégorie
                                </label>
                                <select
                                    value={newExpenseForm.category}
                                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value as any })}
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                >
                                    {CANTEEN_EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat.key} value={cat.key}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Montant (CFA)
                                </label>
                                <input
                                    type="number"
                                    value={newExpenseForm.amount}
                                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                                    placeholder="Montant de la dépense"
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newExpenseForm.description}
                                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                                    placeholder="Description de la dépense (ex: Achat de 2 sacs de riz)"
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 h-24"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 border dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                Annuler
                            </button>
                            <button onClick={handleSaveExpense} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD NEW DISH MODAL */}
            {isNewDishModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold dark:text-white">Créer un nouveau plat</h2>
                            <button onClick={() => setIsNewDishModalOpen(false)} className="text-gray-400 hover:text-gray-650 dark:hover:text-gray-300 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-305 mb-1">
                                    Nom du Plat
                                </label>
                                <input
                                    type="text"
                                    value={newDishForm.name}
                                    onChange={(e) => setNewDishForm({ ...newDishForm, name: e.target.value })}
                                    placeholder="Ex: Tchep au Poulet, Alloco..."
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-305 mb-1">
                                    Type de Plat
                                </label>
                                <select
                                    value={newDishForm.type}
                                    onChange={(e) => setNewDishForm({ ...newDishForm, type: e.target.value as any })}
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                >
                                    <option value="main">Plat Principal</option>
                                    <option value="vegetarian">Végétarien</option>
                                    <option value="dessert">Dessert</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsNewDishModalOpen(false)} className="px-4 py-2 border dark:border-gray-650 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                                Annuler
                            </button>
                            <button onClick={handleSaveNewDish} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/95 transition-colors shadow-lg shadow-blue-500/20 cursor-pointer">
                                Créer et Ajouter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Canteen;
