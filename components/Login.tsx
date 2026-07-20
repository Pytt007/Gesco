import React, { useState } from 'react';
import { Lock, User, LogIn, Eye, EyeOff } from 'lucide-react';
import { NotificationType } from '../types';

interface LoginProps {
  onLoginSuccess: (username: string, password: string) => Promise<void>;
  addNotification: (type: NotificationType, message: string) => void;
}

// hashPassword déplacé dans utils/hashPassword.ts pour éviter le warning HMR de Vite
// (exporter une fonction non-composant depuis un module de composant React casse le Fast Refresh)
export { hashPassword } from '../utils/hashPassword';

const Login: React.FC<LoginProps> = ({ onLoginSuccess, addNotification }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      addNotification('error', 'Veuillez remplir tous les champs.');
      return;
    }

    setIsLoading(true);
    try {
      await onLoginSuccess(username.trim(), password.trim());
    } catch (err: any) {
      addNotification('error', err?.message || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100 font-sans">
      
      {/* Decorative background shapes */}
      <div className="absolute top-[-30%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-blue-600/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-30%] right-[-20%] w-[80vw] h-[80vw] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-8 animate-fade-in-up">
        
        {/* Logo and Brand */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="w-full max-w-[400px] h-40 shrink-0 animate-float">
            <img src="/logo-dark.png" className="w-full h-full object-contain" alt="GESCO Logo" />
          </div>
          <p className="text-xs text-slate-400 font-medium">Plateforme intégrée de gestion scolaire</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-premium-sm-xl space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Connexion</h2>
            <p className="text-xs text-slate-400">Saisissez vos identifiants pour accéder à votre tableau de bord</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identifiant</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/65 border border-slate-800 rounded-xl text-xs font-semibold text-white outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all placeholder:text-slate-700"
                  placeholder="admin, finance, scolarite..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-10 pr-10 py-3 bg-slate-950/65 border border-slate-800 rounded-xl text-xs font-semibold text-white outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all placeholder:text-slate-700"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer ${
                isLoading ? 'opacity-55 cursor-wait' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={13} /> Se connecter
                </>
              )}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};

export default Login;
