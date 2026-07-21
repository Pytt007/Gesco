
import React, { useState, useEffect, Suspense } from 'react';

import useSupabaseTable from './hooks/useSupabaseTable';
import useSupabaseSettings from './hooks/useSupabaseSettings';
import useSupabaseAuth from './hooks/useSupabaseAuth';
import useSupabaseRolePermissions from './hooks/useSupabaseRolePermissions';
import { ViewState, StaffMember, Student, SchoolFeeRecord, ClassGroup, Transaction, CanteenMenu, BusRoute, Activity, TransportSubscription, Notification, NotificationType, ActivityLog, SchoolSettingsData, UserAccount, EvaluationSession } from './types';
import Layout from './components/Layout';
import ToastContainer from './components/Toast';
import Login from './components/Login';
import { Lock } from 'lucide-react';
import { PREDEFINED_CLASS_NAMES, WEEKLY_MENU } from './constants';

// ─── Lazy loading de toutes les pages — réduit le bundle initial de ~1 MB ──
const Dashboard    = React.lazy(() => import('./components/Dashboard'));
const Students     = React.lazy(() => import('./components/Students'));
const Scolarity    = React.lazy(() => import('./components/Scolarity'));
const History      = React.lazy(() => import('./components/History'));
const Canteen      = React.lazy(() => import('./components/Canteen'));
const Transport    = React.lazy(() => import('./components/Transport'));
const Activities   = React.lazy(() => import('./components/Activities'));
const Reports      = React.lazy(() => import('./components/Reports'));
const Statistics   = React.lazy(() => import('./components/Statistics'));
const Settings     = React.lazy(() => import('./components/Settings'));
const Staff        = React.lazy(() => import('./components/Staff'));
const Classes      = React.lazy(() => import('./components/Classes'));
const Expenses     = React.lazy(() => import('./components/Expenses'));
const Notes        = React.lazy(() => import('./components/Notes'));

/** Écran de chargement affiché pendant le lazy-load d'un composant de page */
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64 w-full">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);



const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  'ADMIN_GENERALE': [
    'DASHBOARD', 'STUDENTS', 'CLASSES', 'STAFF', 'CANTEEN', 'TRANSPORT', 'ACTIVITIES', 'SCOLARITY', 'EXPENSES', 'REPORTS', 'HISTORY', 'STATISTICS', 'SETTINGS', 'NOTES'
  ],
  'CANTINE_TRANSPORT': [
    'DASHBOARD', 'CANTEEN', 'TRANSPORT'
  ],
  'SCOLAIRE_ENSEIGNANT': [
    'DASHBOARD', 'STUDENTS', 'CLASSES', 'STAFF', 'ACTIVITIES', 'STATISTICS', 'NOTES'
  ],
  'FINANCE': [
    'DASHBOARD', 'SCOLARITY', 'EXPENSES', 'REPORTS', 'STATISTICS'
  ]
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  // Préférences légères conservées dans localStorage (pas de données métier)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [schoolYear, setSchoolYearState] = useState<string>('2024-2025');
  const [scolarityFilter, setScolarityFilter] = useState<'all' | 'late' | 'paid'>('all');

  // ─── Auth Supabase ────────────────────────────────────────────────────────
  const {
    currentUser,
    userAccounts,
    setUserAccounts,
    loading: authLoading,
    login,
    logout,
    createUser,
    deleteUser,
    changePassword,
    updateUserRole,
  } = useSupabaseAuth();

  // ─── Permissions de rôle ─────────────────────────────────────────────────
  const [rolePermissions, setRolePermissions, _permsLoading] = useSupabaseRolePermissions(DEFAULT_ROLE_PERMISSIONS);

  // ADMIN_GENERALE garde toujours tous les droits (invariant de sécurité)
  const safeRolePermissions = React.useMemo(() => ({
    ...rolePermissions,
    ADMIN_GENERALE: DEFAULT_ROLE_PERMISSIONS.ADMIN_GENERALE,
  }), [rolePermissions]);

  // Avec Supabase Auth, la session est validée par JWT — pas de vérification manuelle nécessaire
  const validatedUser = currentUser;

  // Notifications State (Not persisted usually, but can be)
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // ─── Paramètres de l'école (Supabase — ligne unique) ─────────────────────
  const [schoolSettings, setSchoolSettings, _settingsLoading] = useSupabaseSettings();

  // Synchroniser l'année scolaire active depuis Supabase en temps réel
  useEffect(() => {
    if (schoolSettings.currentSchoolYear) {
      setSchoolYearState(schoolSettings.currentSchoolYear);
    }
  }, [schoolSettings.currentSchoolYear]);

  const setSchoolYear = async (newYear: string) => {
    setSchoolYearState(newYear);
    await setSchoolSettings({
      ...schoolSettings,
      currentSchoolYear: newYear
    });
  };

  // ─── Collections de données — Supabase (par année scolaire) ─────────────

  // 1. RH & Élèves
  const [staffList, setStaffList] = useSupabaseTable<StaffMember>('staff', schoolYear);
  const [students, setStudents] = useSupabaseTable<Student>('students', schoolYear);

  // 2. Scolarité
  const [feeRecords, setFeeRecords] = useSupabaseTable<SchoolFeeRecord>('fee_records', schoolYear);

  // 3. Classes — initialisées depuis PREDEFINED_CLASS_NAMES si table vide
  const [classes, setClasses, classesLoading] = useSupabaseTable<ClassGroup>('classes', schoolYear);
  useEffect(() => {
    if (!classesLoading && classes.length === 0) {
      const initialClasses: ClassGroup[] = PREDEFINED_CLASS_NAMES.map((name, index) => ({
        id: `CLS-${index}`,
        name,
        teacherId: '',
        studentCount: 0,
        capacity: 30,
        level: name.replace(/[0-9]/g, '').split(' ')[0],
        room: `Salle ${index + 1}`,
        subjects: [],
        schedule: [],
        description: `Classe de ${name}`,
      } as unknown as ClassGroup));
      setClasses(initialClasses);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classesLoading]);

  // 4. Finance
  const [transactions, setTransactions] = useSupabaseTable<Transaction>('transactions', schoolYear);

  // 5. Cantine
  const [canteenSubscriptions, setCanteenSubscriptions] = useSupabaseTable<any>('canteen_subscriptions', schoolYear);
  const [canteenMenus, setCanteenMenus, menusLoading] = useSupabaseTable<CanteenMenu>('canteen_menus', schoolYear);
  useEffect(() => {
    if (!menusLoading && canteenMenus.length === 0) {
      const getStartOfWeek = (d: Date) => {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
      };
      const initialMenus = WEEKLY_MENU.map((m, index) => {
        const start = getStartOfWeek(new Date());
        const d = new Date(start);
        d.setDate(d.getDate() + index);
        return { ...m, id: `INIT-${index}`, date: d.toISOString().split('T')[0] };
      });
      setCanteenMenus(initialMenus as CanteenMenu[]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menusLoading]);

  // 6. Transport
  const [transportSubscriptions, setTransportSubscriptions] = useSupabaseTable<TransportSubscription>('transport_subscriptions', schoolYear);
  const [busRoutes, setBusRoutes] = useSupabaseTable<BusRoute>('bus_routes', schoolYear);

  // 7. Activités
  const [activities, setActivities] = useSupabaseTable<Activity>('activities', schoolYear);

  // 8. Historique
  const [historyLogs, setHistoryLogs] = useSupabaseTable<ActivityLog>('history_logs', schoolYear);

  // 9. Configurations des tarifs de scolarité
  const [feeConfigs, setFeeConfigs] = useSupabaseTable<any>('fee_configs', schoolYear);

  // 10. Notes et évaluations
  const [evaluationSessions, setEvaluationSessions] = useSupabaseTable<EvaluationSession>('evaluation_sessions', schoolYear);

  // 11. Module Tables (Cantine, Transport, Dépenses)
  const [canteenConfigs, setCanteenConfigs] = useSupabaseTable<any>('canteen_fee_configs', schoolYear);
  const [canteenStockItems, setCanteenStockItems] = useSupabaseTable<any>('canteen_stock_items', schoolYear);
  const [canteenExpenses, setCanteenExpenses] = useSupabaseTable<any>('canteen_expenses', schoolYear);
  const [transportFeeConfigs, setTransportFeeConfigs] = useSupabaseTable<any>('transport_fee_configs', schoolYear);
  const [busExpenses, setBusExpenses] = useSupabaseTable<any>('bus_expenses', schoolYear);
  const [schoolExpenses, setSchoolExpenses] = useSupabaseTable<any>('school_expenses', schoolYear);
  const [schoolBudgets, setSchoolBudgets] = useSupabaseTable<any>('school_budgets', schoolYear);

  // Fonction helper pour ajouter une entrée à l'historique
  const addLog = (
    action: string,
    details: string,
    module: ActivityLog['module'],
    type: ActivityLog['type'] = 'info',
    oldValue?: string,
    newValue?: string
  ) => {
    const actorName = currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Système';
    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}`,
      action,
      details,
      module,
      user: actorName,
      timestamp: new Date().toISOString(),
      type,
      oldValue,
      newValue
    };
    setHistoryLogs(prev => [newLog, ...prev]);
  };

  // Gérer l'état du dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // BUG-006 FIX: Derive classesWithCount from students to keep studentCount always in sync
  // Classes state persists structural data; studentCount is always computed live, never stale
  const classesWithCount = React.useMemo(() => {
    return classes.map(cls => ({
      ...cls,
      studentCount: students.filter(s => s.grade === cls.name).length,
    }));
  }, [classes, students]);

  const renderView = () => {
    // VULN-001 FIX: Use validatedUser (integrity-checked) not raw currentUser
    if (validatedUser && !safeRolePermissions[validatedUser.role]?.includes(currentView)) {
      return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-slate-200/60 dark:border-gray-700 shadow-sm text-center max-w-md mx-auto my-12 space-y-6 animate-in fade-in zoom-in duration-200">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-955/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Accès Restreint</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Votre profil de connexion (<strong>{validatedUser.fullName}</strong>) n'a pas les privilèges requis pour consulter le module <strong>{currentView}</strong>.
            </p>
          </div>
          <div className="p-3.5 bg-blue-50/50 dark:bg-blue-955/10 border border-blue-100 dark:border-blue-900/30 rounded-xl text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
            Veuillez contacter un Administrateur Général de l'établissement pour modifier vos habilitations.
          </div>
        </div>
      );
    }

    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard
          schoolName={schoolSettings.schoolName}
          directorName={schoolSettings.directorName}
          students={students}
          transactions={transactions}
          feeRecords={feeRecords}
          historyLogs={historyLogs}
          onNavigate={(view: ViewState) => setCurrentView(view)}
          setScolarityFilter={setScolarityFilter}
        />;
      case ViewState.STUDENTS:
        return <Students
          classesList={classesWithCount}
          students={students}
          setStudents={setStudents}
          feeRecords={feeRecords}
          setFeeRecords={setFeeRecords}
          addNotification={addNotification}
          addLog={addLog}
          currentUserRole={validatedUser?.role}
          feeConfigs={feeConfigs}
        />;
      case ViewState.CLASSES:
        return <Classes
          staffList={staffList}
          students={students}
          classes={classesWithCount}
          setClasses={setClasses}
          setStudents={setStudents}
          addNotification={addNotification}
          currentUserRole={validatedUser?.role}
        />;
      case ViewState.STAFF:
        return <Staff staffList={staffList} setStaffList={setStaffList} addNotification={addNotification} currentUserRole={validatedUser?.role} addLog={addLog} />;
      case ViewState.CANTEEN:
        return <Canteen
          students={students}
          subscriptions={canteenSubscriptions}
          setSubscriptions={setCanteenSubscriptions}
          menus={canteenMenus}
          setMenus={setCanteenMenus}
          addNotification={addNotification}
          schoolName={schoolSettings.schoolName}
          schoolLogo={schoolSettings.logo}
          schoolYear={schoolYear}
          transactions={transactions}
          setTransactions={setTransactions}
          canteenConfigs={canteenConfigs}
          setCanteenConfigs={setCanteenConfigs}
          stockItems={canteenStockItems}
          setStockItems={setCanteenStockItems}
          canteenExpenses={canteenExpenses}
          setCanteenExpenses={setCanteenExpenses}
        />;
      case ViewState.TRANSPORT:
        return <Transport
          students={students}
          subscriptions={transportSubscriptions}
          setSubscriptions={setTransportSubscriptions}
          routes={busRoutes}
          setRoutes={setBusRoutes}
          canteenSubscriptions={canteenSubscriptions}
          addNotification={addNotification}
          schoolName={schoolSettings.schoolName}
          schoolLogo={schoolSettings.logo}
          schoolYear={schoolYear}
          transactions={transactions}
          setTransactions={setTransactions}
          busExpenses={busExpenses}
          setBusExpenses={setBusExpenses}
          configs={transportFeeConfigs}
          setConfigs={setTransportFeeConfigs}
        />;
      case ViewState.ACTIVITIES:
        return <Activities
          students={students}
          activities={activities}
          setActivities={setActivities}
          addNotification={addNotification}
          schoolName={schoolSettings.schoolName}
          schoolLogo={schoolSettings.logo}
          schoolYear={schoolYear}
        />;
      case ViewState.SCOLARITY:
        return <Scolarity
          records={feeRecords}
          setRecords={setFeeRecords}
          students={students}
          setStudents={setStudents}
          classes={classesWithCount}
          setClasses={setClasses}
          addNotification={addNotification}
          addLog={addLog}
          schoolName={schoolSettings.schoolName}
          schoolLogo={schoolSettings.logo}
          schoolYear={schoolYear}
          setCanteenSubscriptions={setCanteenSubscriptions}
          setTransportSubscriptions={setTransportSubscriptions}
          feeConfigs={feeConfigs}
          setFeeConfigs={setFeeConfigs}
          filterMode={scolarityFilter}
          setFilterMode={setScolarityFilter}
          currentUserRole={validatedUser?.role}
        />;
      case ViewState.EXPENSES:
        return <Expenses 
          addNotification={addNotification} 
          transactions={transactions}
          students={students}
          feeRecords={feeRecords}
          addLog={addLog}
          schoolYear={schoolYear}
          setSchoolYear={setSchoolYear}
          entries={schoolExpenses}
          setEntries={setSchoolExpenses}
          budgets={schoolBudgets}
          setBudgets={setSchoolBudgets}
        />;
      case ViewState.REPORTS:
        return <Reports
          addNotification={addNotification}
          students={students}
          feeRecords={feeRecords}
          classes={classesWithCount}
          transactions={transactions}
          canteenSubscriptions={canteenSubscriptions}
          transportSubscriptions={transportSubscriptions}
          activities={activities}
          staffList={staffList}
          schoolSettings={schoolSettings}
        />;
      case ViewState.HISTORY:
        return <History logs={historyLogs} />;
      case ViewState.STATISTICS:
        return <Statistics students={students} transactions={transactions} />;
      case ViewState.SETTINGS:
        return <Settings
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          schoolYear={schoolYear}
          setSchoolYear={setSchoolYear}
          settingsData={schoolSettings}
          setSettingsData={setSchoolSettings}
          addNotification={addNotification}
          students={students}
          setStudents={setStudents}
          feeRecords={feeRecords}
          setFeeRecords={setFeeRecords}
          transactions={transactions}
          setTransactions={setTransactions}
          addLog={addLog}
          rolePermissions={safeRolePermissions}
          setRolePermissions={setRolePermissions}
          currentUser={validatedUser}
          userAccounts={userAccounts}
          setUserAccounts={setUserAccounts}
          changePassword={changePassword}
          createUser={createUser}
          deleteUser={deleteUser}
          updateUserRole={updateUserRole}
          setCanteenSubscriptions={setCanteenSubscriptions}
          setTransportSubscriptions={setTransportSubscriptions}
        />;
      case ViewState.NOTES:
        return <Notes
          classes={classesWithCount}
          students={students}
          evaluationSessions={evaluationSessions}
          setEvaluationSessions={setEvaluationSessions}
          addNotification={addNotification}
          schoolName={schoolSettings.schoolName}
          schoolLogo={schoolSettings.logo}
          schoolYear={schoolYear}
          addLog={addLog}
        />;
      default:
        // Rediriger vers le dashboard avec tous les props requis
        setCurrentView(ViewState.DASHBOARD);
        return null;
    }
  };

  const renderViewWithSuspense = () => (
    <Suspense fallback={<PageLoader />}>
      {renderView()}
    </Suspense>
  );

  const handleLogout = async () => {
    await logout();
    addNotification('info', 'Vous avez été déconnecté avec succès.');
  };

  // Afficher un écran de chargement pendant la vérification de session
  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Connexion en cours…</p>
        </div>
      </div>
    );
  }

  if (!validatedUser) {
    return (
      <div className="h-screen w-full">
        <ToastContainer notifications={notifications} removeNotification={removeNotification} />
        <Login
          onLoginSuccess={async (username, password) => {
            const user = await login(username, password);
            if (user) setCurrentView(ViewState.DASHBOARD);
          }}
          addNotification={addNotification}
        />
      </div>
    );
  }

  return (
    <Layout
      currentView={currentView}
      setCurrentView={setCurrentView}
      schoolYear={schoolYear}
      currentUser={validatedUser}
      onLogout={handleLogout}
      rolePermissions={safeRolePermissions}
    >
      <ToastContainer notifications={notifications} removeNotification={removeNotification} />
      {renderViewWithSuspense()}
    </Layout>
  );
};

export default App;
