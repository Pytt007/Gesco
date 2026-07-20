
import React, { useEffect, useState } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { Notification, NotificationType } from '../types';

interface ToastProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

const ToastContainer: React.FC<ToastProps> = ({ notifications, removeNotification }) => {
  return (
    // z-[9999] assure que les notifications sont TOUJOURS au-dessus de tout (modales, sidebar, etc.)
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
      {notifications.map((notification) => (
        <ToastItem 
          key={notification.id} 
          notification={notification} 
          onRemove={() => removeNotification(notification.id)} 
        />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ notification: Notification; onRemove: () => void }> = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Petit délai pour permettre le rendu initial avant de déclencher l'animation d'entrée
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    // Timer pour la fermeture automatique
    const closeTimer = setTimeout(() => {
      handleClose();
    }, 6000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(closeTimer);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // On attend la fin de l'animation de sortie (300ms) avant de supprimer du DOM
    setTimeout(() => {
      onRemove();
    }, 300);
  };

  // Configuration visuelle
  const getConfig = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          icon: Check,
          bg: 'bg-green-100 dark:bg-green-900/40',
          iconColor: 'text-green-600 dark:text-green-400',
          title: 'Succès'
        };
      case 'error':
        return {
          icon: X,
          bg: 'bg-red-100 dark:bg-red-900/40',
          iconColor: 'text-red-600 dark:text-red-400',
          title: 'Erreur'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bg: 'bg-orange-100 dark:bg-orange-900/40',
          iconColor: 'text-orange-600 dark:text-orange-400',
          title: 'Attention'
        };
      case 'info':
      default:
        return {
          icon: Info,
          bg: 'bg-blue-100 dark:bg-blue-900/40',
          iconColor: 'text-blue-600 dark:text-blue-400',
          title: 'Information'
        };
    }
  };

  const config = getConfig(notification.type);
  const Icon = config.icon;

  return (
    <div 
      className={`
        pointer-events-auto relative overflow-hidden
        bg-white dark:bg-zinc-900 
        rounded-xl 
        shadow-premium-sm-lg border border-slate-200/60/80 dark:border-zinc-850/80 
        p-4.5 flex gap-4 w-full
        transition-all duration-300 ease-out transform
        ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
      `}
    >
      {/* Accent Indicator Bar */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : notification.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'}`} />

      {/* Icon Container */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg} ${config.iconColor}`}>
         <Icon size={20} strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
         <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-tight mb-1 pl-1">
            {config.title}
         </h4>
         <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed pl-1">
            {notification.message}
         </p>
      </div>

      {/* Close Button */}
      <button 
        onClick={handleClose}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 h-fit cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default ToastContainer;
