
import React, { useState, useRef } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  Briefcase, 
  CheckCircle, 
  XCircle, 
  UserCheck,
  UserX,
  GraduationCap,
  Save,
  X,
  BookOpen,
  Camera,
  Upload,
  Calendar,
  DollarSign
} from 'lucide-react';
import { StaffMember, NotificationType } from '../types';

interface StaffProps {
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  addNotification: (type: NotificationType, message: string) => void;
  currentUserRole?: string;
  addLog?: (action: string, details: string, module: any, type?: string, oldValue?: string, newValue?: string) => void;
}

// Helper pour générer une couleur cohérente basée sur le nom
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-600 border-red-200',
    'bg-orange-100 text-orange-600 border-orange-200',
    'bg-amber-100 text-amber-600 border-amber-200',
    'bg-yellow-100 text-yellow-600 border-yellow-200',
    'bg-lime-100 text-lime-600 border-lime-200',
    'bg-green-100 text-green-600 border-green-200',
    'bg-emerald-100 text-emerald-600 border-emerald-200',
    'bg-teal-100 text-teal-600 border-teal-200',
    'bg-cyan-100 text-cyan-600 border-cyan-200',
    'bg-sky-100 text-sky-600 border-sky-200',
    'bg-blue-100 text-blue-600 border-blue-200',
    'bg-indigo-100 text-indigo-600 border-indigo-200',
    'bg-violet-100 text-violet-600 border-violet-200',
    'bg-purple-100 text-purple-600 border-purple-200',
    'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200',
    'bg-pink-100 text-pink-600 border-pink-200',
    'bg-rose-100 text-rose-600 border-rose-200',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const Staff: React.FC<StaffProps> = ({ staffList, setStaffList, addNotification, currentUserRole, addLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('Tous');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Selection States
  const [currentMember, setCurrentMember] = useState<StaffMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const initialFormState = {
    firstName: '',
    lastName: '',
    role: 'Enseignant',
    email: '',
    phone: '',
    subject: '',
    photo: '',
    gender: 'Masculin',
    status: 'Actif',
    joinDate: new Date().toISOString().split('T')[0],
    salary: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- STATISTICS ---
  const totalStaff = staffList.length;
  const teachersCount = staffList.filter(s => s.role === 'Enseignant').length;
  const activeCount = staffList.filter(s => s.status === 'Actif').length;
  const onLeaveCount = staffList.filter(s => s.status === 'En congé' || s.status === 'Arrêt maladie').length;

  // --- FILTERING ---
  const filteredStaff = staffList.filter(member => {
    const matchesSearch = 
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'Tous' || member.role === selectedRole;
    
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
    const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // --- ACTIONS ---

  const handleOpenModal = (member?: StaffMember) => {
    if (currentUserRole !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    if (member) {
      setCurrentMember(member);
      setFormData({
        firstName: member.firstName,
        lastName: member.lastName,
        role: member.role,
        email: member.email,
        phone: member.phone,
        subject: member.subject || '',
        photo: member.photo || '',
        gender: member.gender || 'Masculin',
        status: member.status,
        joinDate: member.joinDate,
        salary: member.salary.toString()
      });
    } else {
      setCurrentMember(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleViewMember = (member: StaffMember) => {
    setCurrentMember(member);
    setIsViewModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUserRole !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({ ...prev, photo: event.target?.result as string }));
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSave = () => {
    if (currentUserRole !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    if (!formData.firstName || !formData.lastName) {
      addNotification('error', 'Veuillez remplir les champs obligatoires.');
      return;
    }

    const memberData: StaffMember = {
      id: currentMember ? currentMember.id : `ST-${Date.now()}`,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role as any,
      email: formData.email,
      phone: formData.phone,
      subject: formData.role === 'Enseignant' ? formData.subject : undefined,
      photo: formData.photo,
      gender: formData.gender as 'Masculin' | 'Féminin',
      status: formData.status as any,
      joinDate: formData.joinDate,
      salary: parseFloat(formData.salary) || 0
    };

    if (currentMember) {
      setStaffList(prev => prev.map(s => s.id === currentMember.id ? memberData : s));
      addNotification('success', 'Informations du membre mises à jour.');
      if (addLog) {
        addLog(
          'Modification Personnel',
          `Mise à jour du profil de ${memberData.lastName.toUpperCase()} ${memberData.firstName}`,
          'RH',
          'update',
          `Rôle: ${currentMember.role}, Statut: ${currentMember.status}, Salaire: ${currentMember.salary} CFA`,
          `Rôle: ${memberData.role}, Statut: ${memberData.status}, Salaire: ${memberData.salary} CFA`
        );
      }
    } else {
      setStaffList(prev => [...prev, memberData]);
      addNotification('success', 'Nouveau membre du personnel ajouté.');
      if (addLog) {
        addLog(
          'Nouveau Collaborateur',
          `Ajout de ${memberData.lastName.toUpperCase()} ${memberData.firstName} au personnel`,
          'RH',
          'create',
          undefined,
          `Rôle: ${memberData.role}, Statut: ${memberData.status}, Salaire: ${memberData.salary} CFA`
        );
      }
    }
    setIsModalOpen(false);
  };

  const confirmDelete = (id: string) => {
    if (currentUserRole !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = () => {
    if (currentUserRole !== 'ADMIN_GENERALE') {
      addNotification('error', 'Action réservée à l\'Administrateur Général.');
      return;
    }
    if (deleteId) {
      const deletedMember = staffList.find(s => s.id === deleteId);
      setStaffList(prev => prev.filter(s => s.id !== deleteId));
      addNotification('success', 'Membre du personnel supprimé.');
      if (addLog && deletedMember) {
        addLog(
          'Suppression Collaborateur',
          `Suppression de ${deletedMember.lastName.toUpperCase()} ${deletedMember.firstName} du personnel`,
          'RH',
          'delete',
          `Rôle: ${deletedMember.role}, Statut: ${deletedMember.status}, Salaire: ${deletedMember.salary} CFA`,
          undefined
        );
      }
      setDeleteId(null);
      setIsDeleteModalOpen(false);
    }
  };

  // --- HELPERS ---

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'Direction': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'Enseignant': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Administratif': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Support': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col font-sans">
      
      {/* STATS HEADER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        
        <div className="card-premium-pattern card-premium-indigo p-5 rounded-xl flex items-center justify-between">
           <div>
             <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Total Personnel</p>
             <h3 className="text-xl font-bold mt-1">{totalStaff}</h3>
           </div>
           <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg">
             <Users size={16} />
           </div>
        </div>

        <div className="card-premium-pattern card-premium-blue p-5 rounded-xl flex items-center justify-between">
           <div>
             <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Enseignants</p>
             <h3 className="text-xl font-bold mt-1">{teachersCount}</h3>
           </div>
           <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg">
             <GraduationCap size={16} />
           </div>
        </div>

        <div className="card-premium-pattern card-premium-green p-5 rounded-xl flex items-center justify-between">
           <div>
             <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Présents (Actifs)</p>
             <h3 className="text-xl font-bold mt-1">{activeCount}</h3>
           </div>
           <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg">
             <UserCheck size={16} />
           </div>
        </div>

        <div className="card-premium-pattern card-premium-orange p-5 rounded-xl flex items-center justify-between">
           <div>
             <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">En Congé / Abs.</p>
             <h3 className="text-xl font-bold mt-1">{onLeaveCount}</h3>
           </div>
           <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg">
             <UserX size={16} />
           </div>
        </div>

      </div>

      {/* ACTION BAR */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto flex-wrap">
           {currentUserRole === 'ADMIN_GENERALE' && (
             <button 
               onClick={() => handleOpenModal()}
               className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 font-bold text-xs cursor-pointer shrink-0"
             >
               <Plus size={16} /> Ajouter un collaborateur
             </button>
           )}
           <div className="relative w-full md:w-64">
             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
             <input 
                type="text" 
                placeholder="Rechercher par nom..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
              {['Tous', 'Enseignant', 'Administratif', 'Support'].map(role => (
                 <button
                   key={role}
                   onClick={() => setSelectedRole(role)}
                   className={`flex-1 md:flex-initial px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${selectedRole === role ? 'bg-white dark:bg-slate-800 shadow-premium-sm text-blue-650 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'}`}
                 >
                   {role}
                 </button>
              ))}
           </div>
        </div>
      </div>

      {/* STAFF LIST */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full min-w-[800px] text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-55 dark:bg-zinc-950 text-[10px] font-bold text-slate-450 dark:text-slate-450 uppercase tracking-wider border-b border-slate-200/60 dark:border-zinc-800/80 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="p-4.5 pl-6">Membre</th>
                <th className="p-4.5">Rôle</th>
                <th className="p-4.5">Coordonnées</th>
                <th className="p-4.5">Matière / Poste</th>
                <th className="p-4.5 text-center">Statut</th>
                <th className="p-4.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/70">
              {filteredStaff.length === 0 ? (
                <tr>
                   <td colSpan={6} className="p-12 text-center text-slate-400">
                      <Users size={36} className="mx-auto mb-3 opacity-20" />
                      <p className="text-xs font-bold">Aucun membre du personnel trouvé.</p>
                   </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  return (
                    <tr 
                      key={member.id} 
                      className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/60/45 transition-colors group cursor-pointer"
                      onClick={() => handleViewMember(member)}
                    >
                      <td className="p-4.5 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center border overflow-hidden bg-slate-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm shrink-0">
                            <img 
                              src={member.photo || (member.gender === 'Féminin' 
                                ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lydia&skinColor=9e563b&hairColor=2c1b18' 
                                : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus&skinColor=9e563b&hairColor=2c1b18')} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{member.lastName.toUpperCase()} {member.firstName}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">ID: {member.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4.5">
                         <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${getRoleBadgeColor(member.role)}`}>
                           {member.role}
                         </span>
                      </td>
                      <td className="p-4.5">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-650 dark:text-slate-350 font-medium flex items-center gap-1.5">
                            <Mail size={12} className="text-slate-400" />
                            {member.email || '-'}
                          </p>
                          <p className="text-[10px] text-slate-450 dark:text-slate-450 font-semibold flex items-center gap-1.5">
                            <Phone size={12} className="text-slate-400" />
                            {member.phone || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="p-4.5">
                         <span className="text-xs font-bold text-slate-750 dark:text-slate-350">
                           {member.role === 'Enseignant' ? (member.subject || 'Général') : 'Non applicable'}
                         </span>
                      </td>
                      <td className="p-4.5 text-center">
                         <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                           member.status === 'Actif' 
                             ? 'bg-green-105/15 text-green-700 dark:bg-green-950/20 dark:text-green-400' 
                             : 'bg-orange-105/15 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400'
                         }`}>
                           <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'Actif' ? 'bg-green-500' : 'bg-orange-500'}`} />
                           {member.status}
                         </span>
                      </td>
                      <td className="p-4.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                         <div className="flex justify-end gap-1.5">
                           <button onClick={() => handleViewMember(member)} className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer" title="Voir Fiche">
                             <Briefcase size={15} />
                           </button>
                           {currentUserRole === 'ADMIN_GENERALE' && (
                              <>
                                <button onClick={() => handleOpenModal(member)} className="p-1.5 text-blue-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-955/20 rounded-xl transition-all cursor-pointer" title="Modifier">
                                  <Edit2 size={15} />
                                </button>
                                <button onClick={() => confirmDelete(member.id)} className="p-1.5 text-red-650 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-xl transition-all cursor-pointer" title="Supprimer">
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 z-[60] flex justify-center items-center p-4 backdrop-blur-md animate-fade-in">
           <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-premium-sm-xl w-full max-w-2xl border border-slate-200/60/70 dark:border-zinc-850 flex flex-col max-h-[90vh] animate-fade-in-up overflow-hidden">
               <div className="p-6 flex justify-between items-center bg-white dark:bg-zinc-900 border-b border-slate-200/60 dark:border-zinc-850 shrink-0">
                   <h2 className="text-base font-bold text-slate-850 dark:text-white flex items-center gap-2">
                      <Briefcase size={16} className="text-blue-600"/>
                      {currentMember ? 'Modifier la fiche collaborateur' : 'Ajouter un nouveau membre'}
                   </h2>
                   <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-white p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"><X size={18} /></button>
               </div>
               
               <div className="p-6 overflow-y-auto space-y-5 flex-1">
                   
                   {/* Photo Upload */}
                   <div className="flex justify-center mb-4">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="group w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden shadow-inner"
                        title="Changer la photo"
                      >
                        {formData.photo ? (
                          <>
                            <img src={formData.photo} alt="Aperçu" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="text-white" size={20} />
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-slate-400 group-hover:text-blue-500 transition-colors">
                            <Camera className="mx-auto mb-1" size={20} />
                            <span className="text-[9px] font-bold uppercase tracking-wider block">Ajouter</span>
                          </div>
                        )}
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handlePhotoUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nom de famille *</label>
                          <input 
                            type="text" 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-750"
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Prénom *</label>
                          <input 
                            type="text" 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-750"
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          />
                       </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rôle / Catégorie</label>
                          <select 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-bold text-slate-850 dark:text-white cursor-pointer"
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                          >
                             <option value="Direction">Direction</option>
                             <option value="Enseignant">Enseignant</option>
                             <option value="Administratif">Administratif</option>
                             <option value="Support">Support</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Genre (Sexe)</label>
                          <select 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-bold text-slate-850 dark:text-white cursor-pointer"
                            value={formData.gender}
                            onChange={(e) => setFormData({...formData, gender: e.target.value})}
                          >
                             <option value="Masculin">Masculin</option>
                             <option value="Féminin">Féminin</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Statut activité</label>
                          <select 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-bold text-slate-850 dark:text-white cursor-pointer"
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                          >
                             <option value="Actif">Actif</option>
                             <option value="En congé">En congé</option>
                             <option value="Arrêt maladie">Arrêt maladie</option>
                             <option value="Suspendu">Suspendu</option>
                          </select>
                       </div>
                   </div>

                   {formData.role === 'Enseignant' && (
                     <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Matière principale</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Mathématiques, Français..."
                          className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-500"
                          value={formData.subject}
                          onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        />
                     </div>
                   )}

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Adresse Email</label>
                          <input 
                            type="email" 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-750"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Numéro de téléphone</label>
                          <input 
                            type="tel" 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-750"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          />
                       </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date d'embauche</label>
                          <input 
                            type="date" 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white cursor-pointer"
                            value={formData.joinDate}
                            onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Salaire mensuel (CFA) *</label>
                          <input 
                            type="number" 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-750"
                            value={formData.salary}
                            onChange={(e) => setFormData({...formData, salary: e.target.value})}
                          />
                       </div>
                   </div>

               </div>

               <div className="p-6 pt-4 flex justify-end gap-3 bg-white dark:bg-zinc-900 border-t border-slate-200/60 dark:border-zinc-850 shrink-0">
                    <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl text-xs font-bold text-slate-650 dark:text-slate-350 border border-gray-250 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
                       Annuler
                    </button>
                    <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-500/10 cursor-pointer">
                       Enregistrer
                    </button>
               </div>
           </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isViewModalOpen && currentMember && (
          <div className="fixed inset-0 bg-slate-950/40 z-[60] flex justify-center items-center p-4 backdrop-blur-md animate-fade-in">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-premium-sm-xl w-full max-w-md border border-slate-200/60/70 dark:border-zinc-850 flex flex-col max-h-[90vh] animate-fade-in-up overflow-hidden relative">
                  
                  <button 
                      onClick={() => setIsViewModalOpen(false)} 
                      className="absolute top-4 right-4 p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-10 cursor-pointer"
                  >
                      <X size={15} />
                  </button>

                  <div className="p-6 overflow-y-auto">
                      <div className="flex flex-col items-center mb-6 mt-4">
                          <div className="w-20 h-20 rounded-full border-4 border-white dark:border-zinc-850 shadow-premium-sm-lg overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-zinc-950">
                              <img 
                                  src={currentMember.photo || (currentMember.gender === 'Féminin' 
                                    ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lydia&skinColor=9e563b&hairColor=2c1b18' 
                                    : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus&skinColor=9e563b&hairColor=2c1b18')} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                              />
                          </div>
                          <h2 className="text-lg font-bold text-slate-850 dark:text-white mt-3">{currentMember.firstName} {currentMember.lastName}</h2>
                          <span className={`inline-block mt-1 px-3 py-0.5 rounded-lg text-[10px] font-bold ${getRoleBadgeColor(currentMember.role)}`}>
                              {currentMember.role}
                          </span>
                      </div>

                      <div className="space-y-4">
                           <div className="grid grid-cols-2 gap-3">
                               <div className="p-3 bg-slate-50 dark:bg-slate-955/20 rounded-xl border border-slate-200/60/40 dark:border-zinc-850/80">
                                   <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                       <Mail size={12} />
                                       <p className="text-[9px] font-bold uppercase">Email</p>
                                   </div>
                                   <p className="text-[11px] font-bold text-slate-800 dark:text-slate-300 truncate" title={currentMember.email}>{currentMember.email || '-'}</p>
                               </div>
                               <div className="p-3 bg-slate-50 dark:bg-slate-955/20 rounded-xl border border-slate-200/60/40 dark:border-zinc-850/80">
                                   <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                       <Phone size={12} />
                                       <p className="text-[9px] font-bold uppercase">Téléphone</p>
                                   </div>
                                   <p className="text-[11px] font-bold text-slate-800 dark:text-slate-300 truncate">{currentMember.phone || '-'}</p>
                               </div>
                           </div>

                           <div className="grid grid-cols-3 gap-3">
                               <div className="p-3 bg-slate-50 dark:bg-slate-955/20 rounded-xl border border-slate-200/60/40 dark:border-zinc-850/80">
                                   <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                       <CheckCircle size={12} />
                                       <p className="text-[8px] font-bold uppercase">Statut</p>
                                   </div>
                                   <span className="text-[10px] font-bold text-slate-850 dark:text-white flex items-center gap-1">
                                       <div className={`w-1.5 h-1.5 rounded-full ${currentMember.status === 'Actif' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                       {currentMember.status}
                                   </span>
                               </div>
                               <div className="p-3 bg-slate-50 dark:bg-slate-955/20 rounded-xl border border-slate-200/60/40 dark:border-zinc-850/80">
                                   <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                       <Users size={12} />
                                       <p className="text-[8px] font-bold uppercase">Sexe</p>
                                   </div>
                                   <p className="text-[10px] font-bold text-slate-800 dark:text-slate-350">{currentMember.gender || 'Masculin'}</p>
                               </div>
                               <div className="p-3 bg-slate-50 dark:bg-slate-955/20 rounded-xl border border-slate-200/60/40 dark:border-zinc-850/80">
                                   <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                       <Calendar size={12} />
                                       <p className="text-[8px] font-bold uppercase">Recrutement</p>
                                   </div>
                                   <p className="text-[10px] font-bold text-slate-850 dark:text-white truncate">{new Date(currentMember.joinDate).toLocaleDateString()}</p>
                               </div>
                           </div>

                           {currentMember.role === 'Enseignant' && (
                               <div className="p-3 bg-blue-50 dark:bg-blue-955/10 border border-blue-100/50 dark:border-blue-900/30 rounded-xl flex items-center gap-3">
                                   <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-650 rounded-xl shrink-0">
                                       <BookOpen size={16} />
                                   </div>
                                   <div>
                                       <p className="text-[9px] font-bold text-blue-650 dark:text-blue-400 uppercase">Matière principale</p>
                                       <p className="text-xs font-bold text-slate-850 dark:text-white mt-0.5">{currentMember.subject || 'Général'}</p>
                                   </div>
                               </div>
                           )}

                           {currentUserRole === 'ADMIN_GENERALE' && (
                              <div className="pt-3 border-t border-slate-100 dark:border-zinc-850">
                                  <h4 className="text-[9px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                      <Briefcase size={12} /> Informations financières
                                  </h4>
                                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-955/20 rounded-xl border border-slate-200/60/40 dark:border-zinc-850/80">
                                      <div className="flex items-center gap-2">
                                          <div className="p-1.5 bg-green-50 dark:bg-green-955/20 text-green-600 rounded-lg">
                                              <DollarSign size={14} />
                                          </div>
                                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-450">Salaire de base</span>
                                      </div>
                                      <span className="text-xs font-black text-slate-850 dark:text-white tabular-nums">{(currentMember.salary || 0).toLocaleString()} CFA</span>
                                  </div>
                              </div>
                           )}
                      </div>

                      <div className="mt-6 flex gap-3">
                          {currentUserRole === 'ADMIN_GENERALE' && (
                            <button 
                                onClick={() => { setIsViewModalOpen(false); handleOpenModal(currentMember); }} 
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Edit2 size={13} /> Modifier
                            </button>
                          )}
                          <button 
                              onClick={() => setIsViewModalOpen(false)} 
                              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                          >
                              Fermer
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 z-[80] flex justify-center items-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-premium-sm-xl w-full max-w-md border border-slate-200/60/70 dark:border-zinc-850 p-6 text-center animate-fade-in-up">
             <div className="w-12 h-12 bg-red-50 dark:bg-red-955/20 text-red-650 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} />
             </div>
             <h2 className="text-sm font-bold text-slate-850 dark:text-white mb-2">Confirmer la suppression</h2>
             <p className="text-[11px] text-slate-400 font-semibold mb-6">
               Êtes-vous sûr de vouloir retirer ce collaborateur de la liste du personnel ? Cette opération est irréversible.
             </p>
             <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold text-slate-650 dark:text-slate-350 border border-gray-250 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  onClick={executeDelete}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-red-500/10 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  Retirer
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Staff;
