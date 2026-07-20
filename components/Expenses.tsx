
import React, { useState, useMemo } from 'react';
import {
    Plus,
    Download,
    ChevronLeft,
    ChevronRight,
    X,
    TrendingDown,
    BarChart2,
    Calendar,
    AlertTriangle,
    ChevronDown,
    Wifi,
    Truck,
    Briefcase,
    Zap,
    Droplet,
    Shield,
    Award,
    Landmark,
    DollarSign,
    UserCheck,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    SlidersHorizontal,
    Info
} from 'lucide-react';
import { NotificationType, Transaction, Student, SchoolFeeRecord } from '../types';
import * as XLSX from '@e965/xlsx';
import useLocalStorage from '../hooks/useLocalStorage';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
    { key: 'transport',         label: 'Transport',                                                short: 'Transport'       },
    { key: 'telephone',         label: 'Téléphone et internet',                                    short: 'Tél. & Internet'  },
    { key: 'fourniture_bureau', label: 'Achat de fourniture de bureau',                            short: 'Fournitures'      },
    { key: 'mat_technique',     label: 'Achat de matériel technique',                              short: 'Mat. Technique'   },
    { key: 'entretien',         label: "Achat du matériel d'entretien du mobilier et des locaux",  short: 'Entretien'        },
    { key: 'securite',          label: 'Sécurité',                                                 short: 'Sécurité'         },
    { key: 'boite_postale',     label: 'Frais de boite postale',                                   short: 'Boite Postale'    },
    { key: 'primes',            label: 'Prime Fondateur et autres primes',                         short: 'Primes'           },
    { key: 'sodeci',            label: 'Facture SODECI',                                           short: 'SODECI'           },
    { key: 'cie',               label: 'Facture CIE',                                             short: 'CIE'              },
    { key: 'impot_entreprise',  label: 'Impôt Entreprise',                                        short: 'Impôt Entr.'      },
    { key: 'impot_its',         label: 'Impôts/Salaire (ITS)',                                    short: 'Impôt ITS'        },
    { key: 'cnps',              label: 'CNPS',                                                     short: 'CNPS'             },
    { key: 'assurance',         label: "Frais d'assurance",                                       short: 'Assurance'        },
    { key: 'cpte_bancaire',     label: 'Frais de compte bancaire',                                short: 'Cpte Bancaire'    },
    { key: 'credit_baobab',     label: 'Échange prêt bancaire',                                   short: 'Prêt Bancaire'    },
    { key: 'masse_salariale',   label: 'Masse Salariale',                                          short: 'Masse Sal.'       },
    { key: 'autres',            label: 'Autres charges',                                           short: 'Autres'           },
] as const;

type CategoryKey = typeof EXPENSE_CATEGORIES[number]['key'];

export interface ExpenseEntry {
    id: string;
    date: string;        // YYYY-MM-DD
    category: CategoryKey;
    amount: number;
    description?: string;
}

interface ExpensesProps {
    addNotification: (type: NotificationType, message: string) => void;
    transactions?: Transaction[];
    students?: Student[];
    feeRecords?: SchoolFeeRecord[];
    addLog?: (action: string, details: string, module: any, type?: string, oldValue?: string, newValue?: string) => void;
    schoolYear?: string;
    entries?: ExpenseEntry[];
    setEntries?: React.Dispatch<React.SetStateAction<ExpenseEntry[]>>;
    budgets?: any[];
    setBudgets?: React.Dispatch<React.SetStateAction<any[]>>;
}



// ─── School Year Helpers ──────────────────────────────────────────────────────

/**
 * Retourne l'année de début de l'année scolaire courante.
 * L'année scolaire commence en Juin.
 * Ex : en juillet 2026 → retourne 2026 (année scolaire 2026-2027)
 *      en mars 2026   → retourne 2025 (année scolaire 2025-2026)
 */
const getCurrentSchoolYearStart = (): number => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-indexed
    return month >= 6 ? now.getFullYear() : now.getFullYear() - 1;
};

/**
 * Génère les 12 mois d'une année scolaire (Juin Y → Mai Y+1)
 */
const getSchoolYearMonths = (startYear: number) => {
    const endYear = startYear + 1;
    const sy = String(startYear).slice(-2);
    const ey = String(endYear).slice(-2);
    return [
        { label: `Juin ${sy}`,    year: startYear, month: 6  },
        { label: `Juil ${sy}`,    year: startYear, month: 7  },
        { label: `Août ${sy}`,    year: startYear, month: 8  },
        { label: `Sept. ${sy}`,   year: startYear, month: 9  },
        { label: `Oct. ${sy}`,    year: startYear, month: 10 },
        { label: `Nov. ${sy}`,    year: startYear, month: 11 },
        { label: `Déc. ${sy}`,    year: startYear, month: 12 },
        { label: `Janv. ${ey}`,   year: endYear,   month: 1  },
        { label: `Fév. ${ey}`,    year: endYear,   month: 2  },
        { label: `Mars ${ey}`,    year: endYear,   month: 3  },
        { label: `Avril ${ey}`,   year: endYear,   month: 4  },
        { label: `Mai ${ey}`,     year: endYear,   month: 5  },
    ];
};

/** Retourne l'index du mois actuel dans les mois de l'année scolaire donnée */
const getCurrentMonthIdx = (startYear: number): number => {
    const now = new Date();
    const months = getSchoolYearMonths(startYear);
    const idx = months.findIndex(m => m.year === now.getFullYear() && m.month === now.getMonth() + 1);
    return idx >= 0 ? idx : 0;
};

// ─── Initial sample data ──────────────────────────────────────────────────────
// Données d'exemple sur plusieurs années scolaires pour démonstration

const CURR_SY = getCurrentSchoolYearStart(); // ex: 2026

const INITIAL_ENTRIES: ExpenseEntry[] = [];

// ─── Component ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
    date: '',
    category: EXPENSE_CATEGORIES[0].key as CategoryKey,
    amount: '',
    description: '',
};

const Expenses: React.FC<ExpensesProps> = ({ 
    addNotification,
    transactions = [],
    students = [],
    feeRecords = [],
    addLog,
    schoolYear,
    entries: propsEntries,
    setEntries: propsSetEntries,
    budgets: propsBudgets,
    setBudgets: propsSetBudgets,
}) => {

    const syKey = schoolYear || '2024-2025';

    // ── Data (Supabase avec fallback LocalStorage)
    const [localEntries, setLocalEntries] = useLocalStorage<ExpenseEntry[]>('school_expenses_' + syKey, INITIAL_ENTRIES);
    const entries = propsEntries ?? localEntries;
    const setEntries = propsSetEntries ?? setLocalEntries;

    // ── School year navigation
    const currentSY = getCurrentSchoolYearStart();
    const availableYears = useMemo(
        () => Array.from({ length: 6 }, (_, i) => currentSY - 5 + i + 1),
        [currentSY]
    );
    const [selectedSY, setSelectedSY] = useState<number>(currentSY);

    // Months of selected school year
    const schoolYearMonths = useMemo(() => getSchoolYearMonths(selectedSY), [selectedSY]);

    // ── Month navigation (within selected school year)
    const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(() => getCurrentMonthIdx(currentSY));

    const handleChangeSY = (year: number) => {
        setSelectedSY(year);
        setSelectedDay(null);
        if (year === currentSY) {
            setSelectedMonthIdx(getCurrentMonthIdx(currentSY));
        } else {
            setSelectedMonthIdx(0);
        }
    };

    // ── Search and Editing States
    const [searchTerm, setSearchTerm] = useState('');
    const [editingEntry, setEditingEntry] = useState<ExpenseEntry | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [annualViewMode, setAnnualViewMode] = useState<'chart' | 'table'>('chart');
    const DEFAULT_BUDGETS: Record<number, number> = {};
    const [localBudgets, setLocalBudgets] = useLocalStorage<Record<number, number>>('school_budgets', DEFAULT_BUDGETS);

    const budgets = useMemo(() => {
        if (!propsBudgets) return localBudgets;
        if (Array.isArray(propsBudgets)) {
            if (propsBudgets.length === 0) return {};
            const map: Record<number, number> = {};
            propsBudgets.forEach(b => {
                if (b.year && b.amount) map[b.year] = b.amount;
                else if (b.id && !isNaN(Number(b.id)) && b.amount) map[Number(b.id)] = b.amount;
                else Object.assign(map, b);
            });
            return map;
        }
        return propsBudgets;
    }, [propsBudgets, localBudgets]);

    const setBudgets = (updater: any) => {
        if (propsSetBudgets) {
            const nextMap = typeof updater === 'function' ? updater(budgets) : updater;
            const rows = Object.entries(nextMap).map(([yr, amt]) => ({
                id: yr,
                year: Number(yr),
                amount: Number(amt)
            }));
            propsSetBudgets(rows);
        } else {
            setLocalBudgets(updater);
        }
    };

    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [tempBudget, setTempBudget] = useState('');

    // ── Add/Edit entry modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState({ ...EMPTY_FORM });

    // ─── Derived ────────────────────────────────────────────────────────────────

    const selectedMonth = schoolYearMonths[selectedMonthIdx];
    const monthPrefix = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`;
    const syLabel = `${selectedSY}-${selectedSY + 1}`;

    const getMonthCatTotal = (cat: CategoryKey) =>
        entries.filter(e => e.date.startsWith(monthPrefix) && e.category === cat).reduce((s, e) => s + e.amount, 0);

    const getMonthTotal = () =>
        entries.filter(e => e.date.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0);

    // ─── Save Entry (Add or Edit) ────────────────────────────────────────────────

    const handleSaveEntry = () => {
        if (!addForm.date) { addNotification('error', 'La date est obligatoire.'); return; }
        const amount = parseFloat(addForm.amount) || 0;
        if (amount <= 0) { addNotification('error', 'Le montant doit être supérieur à 0.'); return; }

        if (editingEntry) {
            // Modification
            const originalEntry = entries.find(e => e.id === editingEntry.id);
            setEntries(prev => prev.map(e => e.id === editingEntry.id ? {
                ...e,
                date: addForm.date,
                category: addForm.category,
                amount,
                description: addForm.description || undefined
            } : e));
            addNotification('success', 'Dépense modifiée avec succès.');
            if (addLog) {
                const catLabel = EXPENSE_CATEGORIES.find(c => c.key === addForm.category)?.label || addForm.category;
                const origCatLabel = originalEntry ? (EXPENSE_CATEGORIES.find(c => c.key === originalEntry.category)?.label || originalEntry.category) : '';
                addLog(
                    'Modification Dépense',
                    `Mise à jour de la dépense ${editingEntry.id}`,
                    'Finance',
                    'update',
                    originalEntry ? `Catégorie: ${origCatLabel}, Montant: ${originalEntry.amount} CFA, Date: ${originalEntry.date}, Desc: ${originalEntry.description || ''}` : undefined,
                    `Catégorie: ${catLabel}, Montant: ${amount} CFA, Date: ${addForm.date}, Desc: ${addForm.description || ''}`
                );
            }
        } else {
            // Ajout
            const newId = `E-${Date.now()}`;
            setEntries(prev => [...prev, {
                id: newId,
                date: addForm.date,
                category: addForm.category,
                amount,
                description: addForm.description || undefined,
            }]);
            addNotification('success', 'Dépense enregistrée.');
            if (addLog) {
                const catLabel = EXPENSE_CATEGORIES.find(c => c.key === addForm.category)?.label || addForm.category;
                addLog(
                    'Nouvelle Dépense',
                    `Enregistrement d'une dépense de ${amount} CFA sous la catégorie "${catLabel}"`,
                    'Finance',
                    'create',
                    undefined,
                    `Catégorie: ${catLabel}, Montant: ${amount} CFA, Date: ${addForm.date}, Desc: ${addForm.description || ''}`
                );
            }
        }
        setIsAddModalOpen(false);
        setEditingEntry(null);
        setAddForm({ ...EMPTY_FORM });
    };

    // ─── Delete Entry ────────────────────────────────────────────────────────────

    const handleDeleteEntry = (id: string) => {
        const entryToDelete = entries.find(e => e.id === id);
        setEntries(prev => prev.filter(e => e.id !== id));
        setDeleteConfirmId(null);
        addNotification('success', 'Dépense supprimée.');
        if (addLog && entryToDelete) {
            const catLabel = EXPENSE_CATEGORIES.find(c => c.key === entryToDelete.category)?.label || entryToDelete.category;
            addLog(
                'Suppression Dépense',
                `Suppression de la dépense de ${entryToDelete.amount} CFA (Catégorie: ${catLabel})`,
                'Finance',
                'delete',
                `Catégorie: ${catLabel}, Montant: ${entryToDelete.amount} CFA, Date: ${entryToDelete.date}, Desc: ${entryToDelete.description || ''}`,
                undefined
            );
        }
    };

    // ─── Exports ─────────────────────────────────────────────────────────────────

    const handleExportMonthly = () => {
        const activeEntries = entries.filter(e => e.date.startsWith(monthPrefix));
        const rows = activeEntries.map(e => {
            const cat = EXPENSE_CATEGORIES.find(c => c.key === e.category);
            return {
                'Date': e.date,
                'Catégorie': cat ? cat.label : e.category,
                'Description': e.description || '-',
                'Montant (F CFA)': e.amount
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dépenses');
        XLSX.writeFile(wb, `depenses_detaillees_${selectedMonth.label.replace(/[\s.]/g, '_')}.xlsx`);
        addNotification('success', 'Export mensuel réussi.');
    };

    const handleExportAnnual = () => {
        const rows = EXPENSE_CATEGORIES.map(cat => {
            const row: Record<string, string | number> = { 'Catégorie': cat.label };
            schoolYearMonths.forEach(m => {
                const pfx = `${m.year}-${String(m.month).padStart(2, '0')}`;
                row[m.label] = entries.filter(e => e.date.startsWith(pfx) && e.category === cat.key).reduce((s, e) => s + e.amount, 0);
            });
            row['Total'] = schoolYearMonths.reduce((s, m) => {
                const pfx = `${m.year}-${String(m.month).padStart(2, '0')}`;
                return s + entries.filter(e => e.date.startsWith(pfx) && e.category === cat.key).reduce((sum, e) => sum + e.amount, 0);
            }, 0);
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bilan Annuel');
        XLSX.writeFile(wb, `depenses_annuelles_${syLabel}.xlsx`);
        addNotification('success', 'Export annuel réussi.');
    };

    const F = (n: number) => n > 0 ? n.toLocaleString('fr-FR') : '-';

    const getCategoryIcon = (key: string) => {
        switch (key) {
            case 'transport': return <Truck className="text-blue-500" size={18} />;
            case 'telephone': return <Wifi className="text-purple-500" size={18} />;
            case 'fourniture_bureau': return <Briefcase className="text-yellow-600" size={18} />;
            case 'mat_technique': return <SlidersHorizontal className="text-indigo-500" size={18} />;
            case 'entretien': return <Droplet className="text-teal-500" size={18} />;
            case 'securite': return <Shield className="text-red-500" size={18} />;
            case 'primes': return <Award className="text-amber-500" size={18} />;
            case 'sodeci': return <Droplet className="text-sky-500" size={18} />;
            case 'cie': return <Zap className="text-yellow-500" size={18} />;
            case 'masse_salariale': return <UserCheck className="text-emerald-500" size={18} />;
            case 'credit_baobab': return <Landmark className="text-rose-500" size={18} />;
            default: return <FileText className="text-gray-500" size={18} />;
        }
    };

    // Dynamic treasure calculations
    const totalPaidScolarite = useMemo(() => feeRecords.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0), [feeRecords]);
    const totalIncomeTransactions = useMemo(() => transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0), [transactions]);
    const totalExpensesAllTime = useMemo(() => entries.reduce((acc, curr) => acc + curr.amount, 0) + transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0), [entries, transactions]);
    const netSchoolTreasury = useMemo(() => (totalPaidScolarite + totalIncomeTransactions) - totalExpensesAllTime, [totalPaidScolarite, totalIncomeTransactions, totalExpensesAllTime]);

    const displayBalance = useMemo(() => Math.max(netSchoolTreasury, 0), [netSchoolTreasury]);
    const checkingBalance = useMemo(() => Math.round(displayBalance * 0.7), [displayBalance]);
    const reserveBalance = useMemo(() => Math.round(displayBalance * 0.3), [displayBalance]);

    const sYTotal = useMemo(() => {
        return schoolYearMonths.reduce((s, m) => {
            const pfx = `${m.year}-${String(m.month).padStart(2, '0')}`;
            return s + entries.filter(e => e.date.startsWith(pfx)).reduce((sum, e) => sum + e.amount, 0);
        }, 0);
    }, [entries, schoolYearMonths]);

    const currentBudget = budgets[selectedSY] || 0;
    const remainingBudget = currentBudget - sYTotal;
    const spentPercent = currentBudget > 0 ? Math.min((sYTotal / currentBudget) * 100, 100) : 0;

    const handleSaveBudget = () => {
        const value = parseFloat(tempBudget) || 0;
        if (value <= 0) {
            addNotification('error', 'Le budget doit être supérieur à 0.');
            return;
        }
        setBudgets(prev => ({
            ...prev,
            [selectedSY]: value
        }));
        setIsEditingBudget(false);
        addNotification('success', `Budget annuel mis à jour pour l'année ${syLabel}.`);
    };

    // Dynamic expense trends for the selected month compared to previous
    const monthTotal = getMonthTotal();
    const prevMonthTotal = useMemo(() => {
        if (selectedMonthIdx === 0) return 0;
        const pm = schoolYearMonths[selectedMonthIdx - 1];
        const pfx = `${pm.year}-${String(pm.month).padStart(2, '0')}`;
        return entries.filter(e => e.date.startsWith(pfx)).reduce((s, e) => s + e.amount, 0);
    }, [entries, selectedMonthIdx, schoolYearMonths]);

    const expenseTrendPercent = useMemo(() => {
        if (prevMonthTotal === 0) return 0;
        return parseFloat((((monthTotal - prevMonthTotal) / prevMonthTotal) * 100).toFixed(2));
    }, [monthTotal, prevMonthTotal]);

    // Checking history for sparkline
    const checkingHistoryData = useMemo(() => {
        const startIdx = Math.max(0, selectedMonthIdx - 3);
        const data = [];
        const hasAnyData = totalPaidScolarite > 0 || totalIncomeTransactions > 0 || entries.length > 0;
        for (let i = startIdx; i <= selectedMonthIdx; i++) {
            const m = schoolYearMonths[i];
            const pfx = `${m.year}-${String(m.month).padStart(2, '0')}`;
            const monthlyExp = entries.filter(e => e.date.startsWith(pfx)).reduce((s, e) => s + e.amount, 0);
            const monthlyRevSim = (totalPaidScolarite + totalIncomeTransactions) / 12;
            data.push({
                name: m.label.split(' ')[0],
                value: hasAnyData ? Math.max(monthlyRevSim - monthlyExp, 0) : 0
            });
        }
        while (data.length < 4) {
            data.unshift({ name: '-', value: 0 });
        }
        return data;
    }, [entries, selectedMonthIdx, schoolYearMonths, totalPaidScolarite, totalIncomeTransactions]);

    // Spline chart daily data
    const dailyExpensesData = useMemo(() => {
        const numDays = new Date(selectedMonth.year, selectedMonth.month, 0).getDate();
        const data = [];
        for (let d = 1; d <= numDays; d++) {
            const dayStr = String(d).padStart(2, '0');
            const dateStr = `${monthPrefix}-${dayStr}`;
            const totalForDay = entries
                .filter(e => e.date === dateStr)
                .reduce((s, e) => s + e.amount, 0);
            data.push({
                day: d,
                amount: totalForDay
            });
        }
        return data;
    }, [entries, selectedMonth, monthPrefix]);

    // Top categories in current month
    const topExpensesThisMonth = useMemo(() => {
        const catSums = EXPENSE_CATEGORIES.map(cat => {
            const amount = getMonthCatTotal(cat.key);
            return { key: cat.key, label: cat.label, amount };
        });
        const sorted = catSums.sort((a, b) => b.amount - a.amount);
        if (sorted.every(c => c.amount === 0)) {
            return EXPENSE_CATEGORIES.slice(0, 9).map(cat => ({ key: cat.key, label: cat.label, amount: 0 }));
        }
        return sorted.slice(0, 9);
    }, [entries, selectedMonthIdx, selectedSY]);

    // Calendar grid helpers
    const calendarDays = useMemo(() => {
        const year = selectedMonth.year;
        const month = selectedMonth.month; // 1-indexed
        const numDays = new Date(year, month, 0).getDate();
        const firstDayIndex = (new Date(year, month - 1, 1).getDay() + 6) % 7;
        
        const days = [];
        for (let i = 0; i < firstDayIndex; i++) {
            days.push(null);
        }
        for (let d = 1; d <= numDays; d++) {
            days.push(d);
        }
        return days;
    }, [selectedMonth]);

    // Annual Synthesis BarChart & Table data
    const annualSynthesisData = useMemo(() => {
        return schoolYearMonths.map(m => {
            const pfx = `${m.year}-${String(m.month).padStart(2, '0')}`;
            const dataPoint: Record<string, any> = {
                name: m.label.split(' ')[0], // short name
                monthLabel: m.label,
                year: m.year,
                month: m.month
            };
            let monthlyTotal = 0;
            EXPENSE_CATEGORIES.forEach(cat => {
                const amount = entries
                    .filter(e => e.date.startsWith(pfx) && e.category === cat.key)
                    .reduce((s, e) => s + e.amount, 0);
                dataPoint[cat.key] = amount;
                monthlyTotal += amount;
            });
            dataPoint.total = monthlyTotal;
            return dataPoint;
        });
    }, [entries, schoolYearMonths]);

    // Recent Transactions feed filtration
    const filteredEntries = useMemo(() => {
        let monthlyEntries = entries.filter(e => e.date.startsWith(monthPrefix));
        if (selectedDay !== null) {
            const dateStr = `${monthPrefix}-${String(selectedDay).padStart(2, '0')}`;
            monthlyEntries = monthlyEntries.filter(e => e.date === dateStr);
        }
        if (!searchTerm.trim()) {
            return monthlyEntries.sort((a, b) => b.date.localeCompare(a.date));
        }
        const s = searchTerm.toLowerCase();
        return monthlyEntries.filter(e => {
            const cat = EXPENSE_CATEGORIES.find(c => c.key === e.category);
            const catLabel = cat ? cat.label.toLowerCase() : '';
            const catShort = cat ? cat.short.toLowerCase() : '';
            const desc = e.description ? e.description.toLowerCase() : '';
            const amt = e.amount.toString();
            return catLabel.includes(s) || catShort.includes(s) || desc.includes(s) || amt.includes(s) || e.date.includes(s);
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [entries, monthPrefix, searchTerm, selectedDay]);

    // ─── School Year Selector ────────────────────────────────────────────────────

    const SYSelector = () => (
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-700/80 rounded-xl p-1 shrink-0">
            <button
                onClick={() => handleChangeSY(selectedSY - 1)}
                disabled={selectedSY <= availableYears[0]}
                className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg disabled:opacity-30 text-gray-500 hover:text-gray-850 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
                <ChevronLeft size={14} />
            </button>
            <div className="relative">
                <select
                    value={selectedSY}
                    onChange={e => handleChangeSY(Number(e.target.value))}
                    className="appearance-none pl-2.5 pr-6 py-1 bg-transparent text-gray-700 dark:text-gray-200 font-extrabold text-xs cursor-pointer outline-none"
                >
                    {availableYears.map(y => (
                        <option key={y} value={y} className="text-gray-900 bg-white font-bold">
                            {y}-{y + 1} {y === currentSY ? '(actuelle)' : ''}
                        </option>
                    ))}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button
                onClick={() => handleChangeSY(selectedSY + 1)}
                disabled={selectedSY >= availableYears[availableYears.length - 1]}
                className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg disabled:opacity-30 text-gray-500 hover:text-gray-850 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
                <ChevronRight size={14} />
            </button>
        </div>
    );

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 h-full flex flex-col overflow-y-auto pr-1 custom-scrollbar">

            {/* ── Delete Confirmation Modal ── */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm border border-slate-200/60 dark:border-gray-700 p-6 text-center animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-full">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Supprimer la dépense ?</h2>
                        <p className="text-xs text-gray-505 dark:text-gray-400 mb-6">
                            Cette action est définitive. Voulez-vous vraiment retirer cette charge des comptes de l'école ?
                        </p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={() => setDeleteConfirmId(null)} 
                                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={() => handleDeleteEntry(deleteConfirmId)} 
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-all shadow-md shadow-red-500/10"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add / Edit entry modal ── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-red-600 to-rose-500">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus size={20} /> {editingEntry ? 'Modifier la Dépense' : 'Nouvelle Dépense'}
                            </h2>
                            <button onClick={() => { setIsAddModalOpen(false); setEditingEntry(null); }} className="text-white/80 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 bg-white dark:bg-gray-800">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Date *</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-400/50 outline-none"
                                        value={addForm.date}
                                        onChange={e => setAddForm({ ...addForm, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Montant (F CFA) *</label>
                                    <input
                                        type="number" min="0"
                                        className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-400/50 outline-none"
                                        placeholder="0"
                                        value={addForm.amount}
                                        onChange={e => setAddForm({ ...addForm, amount: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Catégorie *</label>
                                <select
                                    className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-400/50 outline-none"
                                    value={addForm.category}
                                    onChange={e => setAddForm({ ...addForm, category: e.target.value as CategoryKey })}
                                >
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat.key} value={cat.key}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Description (facultatif)</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-400/50 outline-none"
                                    placeholder="Ex : Facture SENELEC mai…"
                                    value={addForm.description}
                                    onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="p-5 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800 rounded-b-2xl">
                            <button onClick={() => { setIsAddModalOpen(false); setEditingEntry(null); }} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-lg">Annuler</button>
                            <button onClick={handleSaveEntry} className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-500 text-white font-medium rounded-lg hover:from-red-700 hover:to-rose-600 shadow-lg shadow-red-500/20 flex items-center gap-2">
                                <Plus size={16} /> Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header bar matching mockup ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Aperçu de la Trésorerie &amp; Charges</h2>
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                        GESCO SaaS
                    </span>
                </div>
                {/* Tools & Date range pickers */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => {
                            setEditingEntry(null);
                            setAddForm({ ...EMPTY_FORM, date: `${monthPrefix}-01` });
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-xl text-xs font-bold hover:from-red-700 hover:to-rose-600 shadow-sm shadow-red-500/30 transition-all"
                    >
                        <Plus size={16} /> Saisir Dépense
                    </button>
                    
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1 border border-slate-200/60 dark:border-gray-700">
                        <button className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all" title="Filtres">
                            <SlidersHorizontal size={16} />
                        </button>
                        <button className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all" title="Recherche">
                            <Search size={16} />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1.5 border border-slate-200/60 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{selectedMonth.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <SYSelector />
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                            <button
                                onClick={() => {
                                    setSelectedMonthIdx(i => Math.max(0, i - 1));
                                    setSelectedDay(null);
                                }}
                                disabled={selectedMonthIdx === 0}
                                className="p-1.5 hover:bg-white dark:bg-gray-600 rounded-lg disabled:opacity-30 text-gray-700 dark:text-gray-300"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-gray-700 dark:text-gray-300 text-xs font-bold px-1 whitespace-nowrap">{selectedMonth.label.split(' ')[0]}</span>
                            <button
                                onClick={() => {
                                    setSelectedMonthIdx(i => Math.min(schoolYearMonths.length - 1, i + 1));
                                    setSelectedDay(null);
                                }}
                                disabled={selectedMonthIdx === schoolYearMonths.length - 1}
                                className="p-1.5 hover:bg-white dark:bg-gray-600 rounded-lg disabled:opacity-30 text-gray-700 dark:text-gray-300"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 1: Soldes & Sparklines ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 shrink-0">
                {/* 1. Checking Account Card */}
                <div className="card-premium-pattern card-premium-blue p-5 rounded-xl flex flex-col justify-between min-h-[235px] h-auto">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                            <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Compte Courant</p>
                            <span className="text-[10px] opacity-75 bg-white/10 px-1.5 py-0.5 rounded whitespace-nowrap self-start">Totalité Scolarité</span>
                        </div>
                        <h3 className="text-2xl font-bold mt-3 tracking-tight leading-tight">
                            {checkingBalance.toLocaleString('fr-FR')} F
                        </h3>
                        {displayBalance > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="flex items-center gap-0.5 text-[10px] font-bold bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full shrink-0">
                                    <ArrowUpRight size={10} /> 8.24%
                                </span>
                                <span className="text-[10px] opacity-75 whitespace-nowrap">vs mois dernier</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="h-16 w-full mt-4 min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={checkingHistoryData}>
                                <Tooltip 
                                    formatter={(value) => [`${value.toLocaleString()} F`, 'Solde']}
                                    contentStyle={{ display: 'none' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {checkingHistoryData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill="#FFFFFF" 
                                            fillOpacity={index === checkingHistoryData.length - 1 ? 1 : 0.25}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Reserve Account Card */}
                <div className="card-premium-pattern card-premium-cyan p-5 rounded-xl flex flex-col justify-between min-h-[235px] h-auto">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                            <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Compte Réserve</p>
                            <span className="text-[10px] opacity-75 bg-white/10 px-1.5 py-0.5 rounded whitespace-nowrap self-start">Sécurité</span>
                        </div>
                        <h3 className="text-2xl font-bold mt-3 tracking-tight leading-tight">
                            {reserveBalance.toLocaleString('fr-FR')} F
                        </h3>
                        {displayBalance > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="flex items-center gap-0.5 text-[10px] font-bold bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full shrink-0">
                                    <ArrowDownRight size={10} /> 3.51%
                                </span>
                                <span className="text-[10px] opacity-75 whitespace-nowrap">vs mois dernier</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="text-[10px] opacity-70 font-medium border-t border-white/20 pt-3">
                        ✦ Trésorerie Sécurité &amp; Investissement
                    </div>
                </div>

                {/* 3. Budget Annuel Card */}
                <div className="card-premium-pattern card-premium-indigo p-5 rounded-xl flex flex-col justify-between min-h-[235px] h-auto">
                    <div>
                        <div className="flex justify-between items-start">
                            <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Budget Annuel ({syLabel})</p>
                            
                            {!isEditingBudget ? (
                                <button 
                                    onClick={() => {
                                        setTempBudget(currentBudget.toString());
                                        setIsEditingBudget(true);
                                    }}
                                    className="p-1 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                    title="Modifier le budget"
                                >
                                    <SlidersHorizontal size={12} />
                                </button>
                            ) : (
                                <div className="flex gap-1">
                                    <button onClick={handleSaveBudget} className="p-1 bg-white/15 hover:bg-white/25 rounded text-white" title="Valider"><X size={12} className="rotate-45" /></button>
                                    <button onClick={() => setIsEditingBudget(false)} className="p-1 bg-white/15 hover:bg-white/25 rounded text-white" title="Annuler"><X size={12} /></button>
                                </div>
                            )}
                        </div>

                        {isEditingBudget ? (
                            <div className="mt-3">
                                <input
                                    type="number"
                                    className="w-full p-2 border border-white/25 rounded-lg bg-black/25 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-white/20"
                                    value={tempBudget}
                                    onChange={e => setTempBudget(e.target.value)}
                                    placeholder="Budget en F CFA"
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveBudget(); if (e.key === 'Escape') setIsEditingBudget(false); }}
                                />
                            </div>
                        ) : (
                            <div className="mt-3">
                                <h3 className="text-xl font-bold tracking-tight leading-none">
                                    {currentBudget.toLocaleString('fr-FR')} F
                                </h3>
                                <p className="text-[10px] opacity-85 mt-1.5 font-semibold">
                                    Consommé : {sYTotal.toLocaleString('fr-FR')} F ({spentPercent.toFixed(1)}%)
                                </p>
                            </div>
                        )}
                    </div>

                    {!isEditingBudget && (
                        <div className="space-y-2 mt-2">
                            {/* Progress bar */}
                            <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-500 bg-white"
                                    style={{ width: `${spentPercent}%` }}
                                ></div>
                            </div>

                            {/* Remaining & Alert Status Badge */}
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="opacity-90">
                                    Reste : {remainingBudget.toLocaleString('fr-FR')} F
                                </span>
                                
                                {spentPercent >= 90 ? (
                                    <span className="px-1.5 py-0.5 bg-red-650 text-white rounded-md animate-pulse">
                                        🚨 Critique !
                                    </span>
                                ) : spentPercent >= 75 ? (
                                    <span className="px-1.5 py-0.5 bg-orange-600 text-white rounded-md">
                                        ⚠️ Reste &lt; 25%
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded-md">
                                        ✓ Stable
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Expenses Graph Card (Spans 2 columns) */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 sm:col-span-2 lg:col-span-2 flex flex-col justify-between transition-colors min-h-[235px] h-auto min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Dépenses Globales</p>
                            <h3 className="text-2xl font-black mt-1 text-gray-900 dark:text-white">
                                {monthTotal.toLocaleString('fr-FR')} F
                            </h3>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${expenseTrendPercent >= 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                                {expenseTrendPercent >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} 
                                {Math.abs(expenseTrendPercent)}%
                            </span>
                            <span className="flex items-center gap-1 text-[10px] bg-gray-900 text-white dark:bg-gray-700 px-2 py-0.5 rounded-full font-semibold">
                                {selectedMonth.label.split(' ')[0]}
                            </span>
                        </div>
                    </div>
                    
                    <div className="h-28 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyExpensesData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.08} stroke="#9CA3AF" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 9 }} tickFormatter={(val) => val > 0 ? `${(val / 1000).toFixed(0)}k` : '0'} />
                                <Tooltip 
                                    formatter={(val: number) => [`${val.toLocaleString()} F CFA`, 'Dépenses']}
                                    labelFormatter={(label) => `Jour ${label}`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1F2937', color: '#fff', fontSize: '11px' }}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpenses)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Row 2: Transactions Feed & Right Column Stack ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Left Column: Recent Transactions Feed (Spans 3 cols) */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 flex flex-col h-[750px] transition-colors lg:col-span-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-50 dark:border-gray-700/50">
                        <div>
                            <h4 className="text-sm font-bold text-gray-850 dark:text-white uppercase tracking-wider">Fil des Dépenses Récentes</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">Saisies et flux comptables pour le mois actif</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Search bar */}
                            <div className="relative">
                                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher une dépense..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 w-40 sm:w-48 border border-slate-200/60 dark:border-gray-750 bg-gray-50 dark:bg-gray-900/40 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                            <button
                                onClick={handleExportMonthly}
                                title="Exporter ce mois en Excel"
                                className="p-1.5 border border-slate-200/60 dark:border-gray-750 bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400 hover:text-blue-500 rounded-lg hover:scale-105 transition-all"
                            >
                                <Download size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Filter status indicator badge */}
                    {selectedDay !== null && (
                        <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-xs text-amber-800 dark:text-amber-300 mt-2 shrink-0 animate-in slide-in-from-top-1 duration-200">
                            <span className="font-semibold flex items-center gap-1.5">
                                <Calendar size={12} className="text-amber-650 dark:text-amber-400" />
                                Filtre : Dépenses du {selectedDay} {selectedMonth.label}
                            </span>
                            <button 
                                onClick={() => setSelectedDay(null)} 
                                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg text-amber-600 dark:text-amber-400 transition-colors"
                                title="Effacer le filtre"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Feed Transactions List */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 mt-4 pr-1 custom-scrollbar">
                        {filteredEntries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-center text-gray-400">
                                <FileText size={36} className="opacity-20 mb-3" />
                                <p className="text-sm font-medium">Aucune dépense trouvée</p>
                                <p className="text-xs text-gray-400/80 mt-1">Saisissez une nouvelle charge en cliquant sur le bouton ci-dessus.</p>
                            </div>
                        ) : filteredEntries.map(e => {
                            const cat = EXPENSE_CATEGORIES.find(c => c.key === e.category);
                            const dayText = new Date(e.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                            return (
                                <div key={e.id} className="group flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-900/20 hover:bg-gray-50 dark:hover:bg-gray-900/40 rounded-xl border border-slate-200/60/50 dark:border-gray-700/30 transition-all">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-700/50 flex items-center justify-center shrink-0 shadow-sm">
                                            {getCategoryIcon(e.category)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-850 dark:text-white truncate">
                                                {cat ? cat.label : e.category}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-semibold truncate mt-1">
                                                {e.description || 'Aucune description'} • {dayText}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs font-black text-red-600 dark:text-red-400 tabular-nums">
                                            - {e.amount.toLocaleString('fr-FR')} F
                                        </span>
                                        
                                        {/* Hover row Actions */}
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                title="Modifier" 
                                                onClick={() => {
                                                    setEditingEntry(e);
                                                    setAddForm({
                                                        date: e.date,
                                                        category: e.category,
                                                        amount: e.amount.toString(),
                                                        description: e.description || '',
                                                    });
                                                    setIsAddModalOpen(true);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                            >
                                                <SlidersHorizontal size={12} />
                                            </button>
                                            <button 
                                                title="Supprimer" 
                                                onClick={() => setDeleteConfirmId(e.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Column Stack: Card, Calendar & Top Expenses (Spans 2 cols) */}
                <div className="space-y-6 flex flex-col lg:col-span-2">
                    
                    {/* 1. Credit Card Visual */}
                    <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 text-white p-5 rounded-xl shadow-xl flex flex-col justify-between min-h-[225px] relative overflow-hidden group shrink-0 border border-blue-500/30">
                        {/* Subtle radial light highlight */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-40 pointer-events-none"></div>
                        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5">
                                    <div className="w-4 h-4 rounded-full border border-white/40 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold tracking-widest text-white/90 uppercase leading-none">GESCO</p>
                                    <p className="text-[8px] text-white/70 tracking-wider font-semibold opacity-85 mt-0.5">BANQUE D'ÉCOLE</p>
                                </div>
                            </div>
                            <div className="text-xs font-serif italic tracking-wide font-extrabold text-white/90">Premium</div>
                        </div>
                        
                        <div className="my-1 relative z-10 flex items-center justify-between">
                            {/* Golden metallic SIM chip */}
                            <div className="w-10 h-7 bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 rounded-md relative overflow-hidden shadow-inner flex flex-col justify-between p-1 border border-yellow-500/20">
                                <div className="flex justify-between h-full w-full">
                                    <div className="border-r border-black/10 w-1/3 h-full"></div>
                                    <div className="border-r border-black/10 w-1/3 h-full"></div>
                                    <div className="w-1/3 h-full"></div>
                                </div>
                                <div className="absolute inset-y-1 inset-x-2 border-t border-b border-black/10"></div>
                            </div>
                            
                            {/* Budget Scolaire Badge overlay on the card face */}
                            <div className="text-right">
                                <p className="text-[7px] uppercase tracking-wider text-white/70 font-bold">Budget Scolaire Restant</p>
                                <p className="text-sm font-black text-white">{remainingBudget.toLocaleString('fr-FR')} F</p>
                            </div>
                        </div>
                        
                        <div className="relative z-10">
                            <p className="text-lg font-mono tracking-[0.2em] text-white">4000 0012 3456 7890</p>
                            <div className="flex justify-between items-end mt-1.5">
                                <div>
                                    <p className="text-[7px] uppercase tracking-wider text-blue-250 opacity-70">Titulaire</p>
                                    <p className="text-[10px] font-bold tracking-wide">COMPTE DIRECTEUR GESCO</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-[7px] uppercase tracking-wider text-blue-250 opacity-70">Expiration</p>
                                        <p className="text-[10px] font-mono font-bold">02/29</p>
                                    </div>
                                    {/* Mastercard overlapping logo */}
                                    <div className="flex -space-x-2.5 items-center shrink-0">
                                        <div className="w-6 h-6 rounded-full bg-[#EB001B] opacity-90"></div>
                                        <div className="w-6 h-6 rounded-full bg-[#F79E1B] opacity-90"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-white/10 pt-2.5 mt-1 flex justify-between text-[9px] relative z-10">
                            <div>
                                <p className="text-white/70">Solde Actuel</p>
                                <p className="font-bold">{(checkingBalance).toLocaleString('fr-FR')} F</p>
                            </div>
                            <div className="text-right">
                                <p className="text-white/70">Disponible</p>
                                <p className="font-bold">{(checkingBalance + reserveBalance).toLocaleString('fr-FR')} F</p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Expenses Calendar */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 flex flex-col justify-between transition-colors min-h-[250px] h-auto shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Calendrier des charges</h4>
                            <div className="flex gap-1">
                                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400" onClick={() => setSelectedMonthIdx(i => Math.max(0, i - 1))}><ChevronLeft size={10} /></button>
                                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400" onClick={() => setSelectedMonthIdx(i => Math.min(schoolYearMonths.length - 1, i + 1))}><ChevronRight size={10} /></button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-gray-400 dark:text-gray-500 mb-1 border-b border-gray-50 dark:border-gray-700/50 pb-1">
                            <span>Lu</span><span>Ma</span><span>Me</span><span>Je</span><span>Ve</span><span>Sa</span><span>Di</span>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] flex-1">
                            {calendarDays.map((day, idx) => {
                                if (day === null) {
                                    return <div key={`empty-${idx}`} className="h-6"></div>;
                                }
                                
                                const dayStr = String(day).padStart(2, '0');
                                const dateStr = `${monthPrefix}-${dayStr}`;
                                const dayExpenses = entries.filter(e => e.date === dateStr);
                                const hasExpenses = dayExpenses.length > 0;
                                const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === selectedMonth.month && new Date().getFullYear() === selectedMonth.year;
                                
                                const isSelected = selectedDay === day;
                                return (
                                    <div 
                                        key={`day-${day}`} 
                                        onClick={() => setSelectedDay(prev => prev === day ? null : day)}
                                        className={`h-6 w-6 mx-auto flex items-center justify-center rounded-lg relative cursor-pointer font-bold transition-all ${
                                            isToday ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' :
                                            isSelected ? 'bg-amber-500 text-white shadow-sm ring-2 ring-offset-2 ring-amber-500' :
                                            hasExpenses ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30' :
                                            'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                        title={hasExpenses ? `${dayExpenses.length} dépense(s): ${dayExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()} F` : undefined}
                                    >
                                        <span>{day}</span>
                                        {hasExpenses && (
                                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold scale-90 border border-white dark:border-gray-800">
                                                {dayExpenses.length}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Top Expenses Grids */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 flex flex-col justify-between transition-colors shrink-0">
                        <div className="flex justify-between items-center mb-2.5">
                            <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dépenses Majeures</h4>
                            <span className="text-[9px] font-bold text-gray-400">Ce mois</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 flex-1">
                            {topExpensesThisMonth.slice(0, 6).map((item) => {
                                const percentOfTotal = monthTotal > 0 ? ((item.amount / monthTotal) * 100).toFixed(0) : '0';
                                return (
                                    <div key={item.key} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-slate-200/60 dark:border-gray-700/60 transition-all">
                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm shrink-0 border border-slate-200/60 dark:border-gray-700/50">
                                            {getCategoryIcon(item.key)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] font-bold text-gray-800 dark:text-white truncate" title={item.label}>
                                                {EXPENSE_CATEGORIES.find(c => c.key === item.key)?.short || item.label}
                                            </p>
                                            <p className="text-[10px] font-black text-gray-900 dark:text-gray-100 tabular-nums">
                                                {item.amount.toLocaleString('fr-FR')} F
                                            </p>
                                            <p className="text-[8px] text-blue-500 font-semibold mt-0.5">
                                                {percentOfTotal}% du mois
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 3: Annual Analysis ── */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 flex flex-col transition-colors shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-gray-50 dark:border-gray-700/50 pb-4">
                    <div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">Synthèse Annuelle des Charges</h4>
                        <p className="text-[10px] text-gray-400 mt-1">Évolution globale et répartition des dépenses mensuelles sur l'année scolaire {syLabel}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Toggle switch for Graph/Table */}
                        <div className="bg-gray-50 dark:bg-gray-900/60 p-1 rounded-xl border border-slate-200/60 dark:border-gray-700 flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => setAnnualViewMode('chart')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                    annualViewMode === 'chart' 
                                        ? 'bg-blue-600 text-white shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <BarChart2 size={12} /> Graphique
                            </button>
                            <button
                                onClick={() => setAnnualViewMode('table')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                    annualViewMode === 'table' 
                                        ? 'bg-blue-600 text-white shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <FileText size={12} /> Tableau
                            </button>
                        </div>

                        <button
                            onClick={handleExportAnnual}
                            className="flex items-center gap-2 px-3.5 py-1.5 border border-slate-200/60 dark:border-gray-750 bg-gray-50 dark:bg-gray-900/40 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm"
                        >
                            <Download size={12} /> Exporter Rapport Annuel
                        </button>
                    </div>
                </div>
                
                {annualViewMode === 'chart' ? (
                    <div className="h-80 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={annualSynthesisData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.08} stroke="#9CA3AF" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(val) => val > 0 ? `${(val / 1000).toFixed(0)}k` : '0'} />
                                <Tooltip 
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-gray-900 text-white p-4 rounded-xl border border-gray-700 text-xs shadow-xl space-y-2 max-w-xs animate-in fade-in duration-100">
                                                    <p className="font-bold border-b border-gray-700 pb-1 text-[11px] uppercase tracking-wider text-blue-400">
                                                        {data.monthLabel}
                                                    </p>
                                                    <div className="space-y-1 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
                                                        {EXPENSE_CATEGORIES.map(cat => {
                                                            const amt = data[cat.key] || 0;
                                                            if (amt === 0) return null;
                                                            return (
                                                                <div key={cat.key} className="flex justify-between items-center gap-4 text-[10px]">
                                                                    <span className="text-gray-400 font-semibold">{cat.short}:</span>
                                                                    <span className="font-bold tabular-nums text-red-400">{amt.toLocaleString('fr-FR')} F</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-gray-700 pt-1.5 font-bold text-yellow-400">
                                                        <span>TOTAL:</span>
                                                        <span className="tabular-nums">{data.total.toLocaleString('fr-FR')} F</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={48} 
                                    iconType="circle" 
                                    iconSize={8} 
                                    wrapperStyle={{ fontSize: '9px', paddingTop: '12px', opacity: 0.8 }} 
                                />
                                {EXPENSE_CATEGORIES.map((cat, idx) => {
                                    const colors = [
                                        '#3B82F6', // transport (blue)
                                        '#8B5CF6', // telephone (purple)
                                        '#F59E0B', // supplies (amber)
                                        '#6366F1', // equipment (indigo)
                                        '#14B8A6', // maintenance (teal)
                                        '#EF4444', // security (red)
                                        '#D97706', // primes (yellow)
                                        '#06B6D4', // sodeci (cyan)
                                        '#EAB308', // cie (yellow)
                                        '#10B981', // salaries (emerald)
                                        '#EC4899'  // baobab credit (pink)
                                    ];
                                    return (
                                        <Bar 
                                            key={cat.key} 
                                            dataKey={cat.key} 
                                            name={cat.short}
                                            stackId="a" 
                                            fill={colors[idx % colors.length]} 
                                        />
                                    );
                                })}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-slate-200/60 dark:border-gray-700 rounded-xl">
                        <table className="w-full min-w-[900px] text-left border-collapse text-[10px] whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-slate-200/60 dark:border-gray-700">
                                    <th className="p-3 font-bold text-gray-500 dark:text-gray-400 uppercase w-48 sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 border-r border-slate-200/60 dark:border-gray-700">
                                        Catégorie de Charge
                                    </th>
                                    {schoolYearMonths.map(m => (
                                        <th key={m.label} className="p-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-center min-w-[70px]">
                                            {m.label.split(' ')[0]}
                                        </th>
                                    ))}
                                    <th className="p-3 font-bold text-yellow-600 dark:text-yellow-400 uppercase text-center min-w-[80px] bg-yellow-50/20 dark:bg-yellow-950/10">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {EXPENSE_CATEGORIES.map((cat) => {
                                    const catAnnualTotal = entries
                                        .filter(e => schoolYearMonths.some(m => e.date.startsWith(`${m.year}-${String(m.month).padStart(2, '0')}`)) && e.category === cat.key)
                                        .reduce((s, e) => s + e.amount, 0);
                                    
                                    return (
                                        <tr key={cat.key} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-all">
                                            <td className="p-3 font-bold text-gray-850 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10 flex items-center gap-2 border-r border-slate-200/60 dark:border-gray-700/60">
                                                <div className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-gray-800">
                                                    {getCategoryIcon(cat.key)}
                                                </div>
                                                <span className="truncate">{cat.label}</span>
                                            </td>
                                            {schoolYearMonths.map(m => {
                                                const pfx = `${m.year}-${String(m.month).padStart(2, '0')}`;
                                                const amt = entries
                                                    .filter(e => e.date.startsWith(pfx) && e.category === cat.key)
                                                    .reduce((s, e) => s + e.amount, 0);
                                                return (
                                                    <td key={m.label} className={`p-3 text-center font-medium tabular-nums ${amt > 0 ? 'text-gray-900 dark:text-gray-250 font-bold' : 'text-gray-300 dark:text-gray-600'}`}>
                                                        {amt > 0 ? amt.toLocaleString('fr-FR') : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-3 text-center font-bold tabular-nums text-gray-900 dark:text-gray-105 bg-yellow-50/20 dark:bg-yellow-950/10">
                                                {catAnnualTotal > 0 ? catAnnualTotal.toLocaleString('fr-FR') : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700">
                                    <td className="p-3.5 font-black text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 border-r border-gray-200 dark:border-gray-700">
                                        TOTAL GÉNÉRAL
                                    </td>
                                    {schoolYearMonths.map(m => {
                                        const pfx = `${m.year}-${String(m.month).padStart(2, '0')}`;
                                        const monthlyTotal = entries
                                            .filter(e => e.date.startsWith(pfx))
                                            .reduce((s, e) => s + e.amount, 0);
                                        return (
                                            <td key={m.label} className="p-3.5 text-center font-black tabular-nums text-blue-600 dark:text-blue-450 text-xs">
                                                {monthlyTotal > 0 ? monthlyTotal.toLocaleString('fr-FR') : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3.5 text-center font-black tabular-nums text-yellow-600 dark:text-yellow-450 text-xs bg-yellow-50/30 dark:bg-yellow-950/20">
                                        {entries
                                            .filter(e => schoolYearMonths.some(m => e.date.startsWith(`${m.year}-${String(m.month).padStart(2, '0')}`)))
                                            .reduce((s, e) => s + e.amount, 0)
                                            .toLocaleString('fr-FR')} F
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Expenses;
