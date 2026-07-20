
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  UserCheck,
  Utensils,
  Bus,
  Trophy,
  CreditCard,
  FileText,
  BarChart2,
  Settings,
  Menu, 
  X, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  History,
  Calendar,
  Receipt,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  children: React.ReactNode;
  schoolYear: string;
  currentUser?: { username: string; role: string; fullName: string; avatarUrl?: string } | null;
  onLogout?: () => void;
  rolePermissions?: Record<string, string[]>;
}

interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ElementType;
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: (view: ViewState) => void;
  isCollapsed: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isActive, onClick, isCollapsed }) => (
  <button
    onClick={() => onClick(item.id)}
    className={`
      sidebar-nav-btn w-full flex items-center 
      ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3.5'} 
      py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer
      ${isActive 
        ? 'bg-white/20 text-white shadow-sm' 
        : 'text-sky-100 hover:bg-white/10 hover:text-white'}
    `}
    title={isCollapsed ? item.label : undefined}
  >
    <item.icon size={18} strokeWidth={1.5} className={`transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-102'}`} />
    {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-200">{item.label}</span>}
  </button>
);

const Layout: React.FC<LayoutProps> = ({ 
  currentView, 
  setCurrentView, 
  children, 
  schoolYear,
  currentUser,
  onLogout,
  rolePermissions
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const mainNavItems: NavItem[] = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewState.STUDENTS, label: 'Élèves', icon: Users },
    { id: ViewState.CLASSES, label: 'Classes', icon: GraduationCap },
    { id: ViewState.STAFF, label: 'Personnel', icon: UserCheck },
    { id: ViewState.CANTEEN, label: 'Cantine', icon: Utensils },
    { id: ViewState.TRANSPORT, label: 'Transport', icon: Bus },
    { id: ViewState.ACTIVITIES, label: 'Activités', icon: Trophy },
    { id: ViewState.NOTES, label: 'Notes & Éval.', icon: BookOpen },
    { id: ViewState.SCOLARITY, label: 'Scolarité', icon: CreditCard },
    { id: ViewState.EXPENSES, label: 'Dépenses', icon: Receipt },
    { id: ViewState.REPORTS, label: 'Rapports', icon: FileText },
  ].filter(item => !currentUser || !rolePermissions || rolePermissions[currentUser.role]?.includes(item.id));

  const managementNavItems: NavItem[] = [
    { id: ViewState.HISTORY, label: 'Historique', icon: History },
    { id: ViewState.STATISTICS, label: 'Statistiques', icon: BarChart2 },
    { id: ViewState.SETTINGS, label: 'Paramètres', icon: Settings },
  ].filter(item => !currentUser || !rolePermissions || rolePermissions[currentUser.role]?.includes(item.id));

  const handleNavClick = (view: ViewState) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  return (
    <div className="h-screen w-full bg-gray-55 dark:bg-zinc-950 flex flex-col md:flex-row transition-colors duration-200 overflow-hidden font-sans">
      
      {/* ── Logout Confirmation Modal ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-950/40 z-[100] flex justify-center items-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-premium-sm-xl w-full max-w-sm border border-slate-200/60 dark:border-zinc-800 p-6 text-center animate-fade-in-up">
            <div className="flex justify-center mb-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                <AlertTriangle size={28} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Se déconnecter ?</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Voulez-vous vraiment vous déconnecter de votre session GESCO ?
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-gray-600 dark:text-zinc-350 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (onLogout) onLogout();
                }} 
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Top Bar - Only Visible on Mobile */}
      <div className="bg-white dark:bg-zinc-900 pl-2 pr-4 py-2 flex justify-between items-center shadow-sm md:hidden z-20 shrink-0">
        <div className="flex items-center">
          {/* Light Logo */}
          <div className="w-14 h-14 block dark:hidden">
            <img src="/logo-light.png" className="w-full h-full object-contain object-left" alt="GESCO Logo" />
          </div>
          {/* Dark Logo */}
          <div className="w-14 h-14 hidden dark:block">
            <img src="/logo-dark.png" className="w-full h-full object-contain object-left" alt="GESCO Logo" />
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-600 dark:text-gray-300">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar with Dark Background Always */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 h-screen
        ${isCollapsed ? 'md:w-20' : 'md:w-60'} 
        w-60 bg-blue-700 text-white border-r border-blue-800 transform transition-all duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className={`sidebar-logo-wrapper p-3 py-4.5 hidden md:flex items-center ${isCollapsed ? 'justify-center' : 'flex-col justify-center'} border-b border-blue-600/50 shrink-0 relative bg-gradient-to-br from-blue-600 to-blue-800`}>
          {isCollapsed ? (
            <div className="w-14 h-14 shrink-0 transition-transform duration-350 hover:scale-105">
               <img src="/logo-dark.png" className="w-full h-full object-contain" alt="GESCO Logo" />
            </div>
          ) : (
            <div className="w-48 h-48 shrink-0 transition-transform duration-350 hover:scale-105">
               <img src="/logo-dark.png" className="w-full h-full object-contain" alt="GESCO Logo" />
            </div>
          )}
          {!isCollapsed && (
             <button onClick={() => setIsCollapsed(true)} className="absolute right-3 top-3 p-1 text-blue-200 hover:bg-blue-700/50 rounded-lg transition-colors">
               <ChevronLeft size={16} strokeWidth={1.5} />
             </button>
          )}
        </div>
        
        {/* Collapsed Expand Button */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center py-2.5 border-b border-blue-600/50 shrink-0">
            <button onClick={() => setIsCollapsed(false)} className="p-1 text-blue-200 hover:bg-blue-600/50 rounded-lg transition-colors">
               <ChevronRight size={16} strokeWidth={1.5} />
             </button>
          </div>
        )}

        {/* User profile band */}
        {currentUser && !isCollapsed && (
          <div className="sidebar-profile-wrapper px-4.5 py-2.5 border-b border-blue-600/50 flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600/50 flex items-center justify-center overflow-hidden border border-blue-500/50 shrink-0">
              <img src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.username}`} alt={currentUser.fullName} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate text-white leading-tight">{currentUser.fullName}</p>
              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-800/60 text-[8px] font-bold text-sky-100 tracking-wide uppercase">
                {currentUser.role === 'ADMIN_GENERALE' ? 'Admin Général' :
                 currentUser.role === 'CANTINE_TRANSPORT' ? 'Cantine & Car' :
                 currentUser.role === 'SCOLAIRE_ENSEIGNANT' ? 'Scolaire' : 'Finance'}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          <nav className="px-2.5 space-y-1 flex flex-col justify-between min-h-full">
            <div className="space-y-0.5">
              {mainNavItems.map((item) => (
                <NavButton 
                  key={item.id} 
                  item={item} 
                  isActive={currentView === item.id}
                  onClick={handleNavClick}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
            
            <div>
              <div className={`pt-4 pb-2 ${isCollapsed ? 'flex justify-center' : 'px-3.5'}`}>
                {!isCollapsed ? (
                  <p className="text-[10px] font-bold text-sky-200/70 uppercase tracking-wider whitespace-nowrap">Gestion</p>
                ) : (
                  <div className="h-0.5 w-6 bg-blue-500/50 rounded"></div>
                )}
              </div>
              
              <div className="space-y-0.5">
                {managementNavItems.map((item) => (
                  <NavButton 
                    key={item.id} 
                    item={item} 
                    isActive={currentView === item.id}
                    onClick={handleNavClick}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          </nav>
        </div>

        <div className="sidebar-logout-container p-2.5 border-t border-blue-600/50 bg-blue-800/40 shrink-0">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3.5'} py-2.5 text-sky-100 cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition-colors`}
            title={isCollapsed ? "Déconnexion" : undefined}
          >
            <LogOut size={18} strokeWidth={1.5} />
            {!isCollapsed && <span className="text-sm font-semibold whitespace-nowrap">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Right Side Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-gray-55 dark:bg-zinc-900 transition-colors duration-200 relative">
        
        {/* Application Header - Sticky with glassmorphism blurred backdrop */}
        <header className="shrink-0 px-6 md:px-8 py-4 bg-gray-50/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between z-10 transition-colors duration-250 sticky top-0 border-b border-gray-200/50 dark:border-zinc-850/60">
           <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
             {[...mainNavItems, ...managementNavItems].find(n => n.id === currentView)?.label}
           </h1>
           <div className="hidden md:flex items-center gap-4 shrink-0">
             <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-premium-sm border border-gray-250/60 dark:border-slate-700/50 transition-colors">
                <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-350 whitespace-nowrap">
                  Année Scolaire <span className="text-gray-900 dark:text-white font-bold ml-1">{schoolYear}</span>
                </span>
             </div>
           </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0">
           <div className="max-w-[1800px] mx-auto min-h-full flex flex-col animate-fade-in-up">
              {children}
           </div>
        </main>

      </div>
    </div>
  );
};

export default Layout;
