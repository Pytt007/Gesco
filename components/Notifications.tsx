
import React, { useState } from 'react';
import { Send, Sparkles, Copy, Check, Bell } from 'lucide-react';
import { generateCommunicationDraft } from '../services/geminiService';

const Notifications: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('Parents');
  const [tone, setTone] = useState('Professionnel');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Sending state: 'idle' | 'sending' | 'sent'
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    const draft = await generateCommunicationDraft(topic, audience, tone);
    setGeneratedText(draft);
    setLoading(false);
    setCopied(false);
    setSendStatus('idle');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
      if (!generatedText) return;
      setSendStatus('sending');
      setTimeout(() => {
          setSendStatus('sent');
          setTimeout(() => {
              setSendStatus('idle');
              setGeneratedText('');
              setTopic('');
          }, 2000);
      }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Generator */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-primary" size={24} />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Générateur de Notification IA</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Sujet de la notification</label>
              <textarea 
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows={3}
                placeholder="Ex: Fermeture exceptionnelle de la cantine demain..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Destinataires</label>
                <select 
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-gray-900 dark:text-white"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option>Parents</option>
                  <option>Élèves</option>
                  <option>Professeurs</option>
                  <option>Tout le personnel</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Ton</label>
                <select 
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-gray-900 dark:text-white"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  <option>Professionnel</option>
                  <option>Urgent</option>
                  <option>Bienveillant</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={loading || !topic}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? 'Génération...' : 'Générer le message'}
            </button>
          </div>
        </div>

        {/* Recent Notifications List */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 transition-colors">
           <h3 className="font-bold text-gray-800 dark:text-white mb-4">Envoyés Récemment</h3>
           <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-slate-200/60 dark:border-gray-600">
                  <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">Rappel Vaccins</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Hier, 10:00</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">Rappel important concernant la mise à jour des vaccins pour la classe de 6ème B...</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-slate-200/60 dark:border-gray-600">
                  <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">Sortie Scolaire</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Avant-hier</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">N'oubliez pas de signer l'autorisation pour la sortie au musée...</p>
              </div>
           </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 h-full min-h-[400px] flex flex-col transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Aperçu</h2>
          {generatedText && (
            <button 
              onClick={handleCopy}
              className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${copied ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              Copier
            </button>
          )}
        </div>

        <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 relative transition-colors">
            {!generatedText && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <Bell size={48} className="mb-2 opacity-20" />
                <p>En attente de génération...</p>
              </div>
            )}
            
            {loading && (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            )}

            {generatedText && !loading && (
              <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                {generatedText}
              </div>
            )}
        </div>
        
        {generatedText && (
            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleSend}
                disabled={sendStatus !== 'idle'}
                className={`px-6 py-2 rounded-xl flex items-center gap-2 shadow-lg transition-all duration-300 font-medium
                    ${sendStatus === 'sent' 
                        ? 'bg-green-600 text-white shadow-green-500/20' 
                        : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
                    }
                    disabled:opacity-70 disabled:cursor-wait
                `}
              >
                  {sendStatus === 'sending' ? (
                      <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Envoi...
                      </>
                  ) : sendStatus === 'sent' ? (
                      <>
                          <Check size={18} />
                          Envoyé aux {audience.toLowerCase()}
                      </>
                  ) : (
                      <>
                          <Send size={18} />
                          Envoyer aux {audience.toLowerCase()}
                      </>
                  )}
              </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
