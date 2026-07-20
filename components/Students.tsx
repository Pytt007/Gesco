
import React, { useState, useRef } from 'react';
import { 
  Search, 
  X, 
  Edit2, 
  Eye,
  Users,
  Phone,
  MapPin,
  Heart,
  CheckCircle,
  XCircle,
  Camera,
  ChevronDown
} from 'lucide-react';
import { MOCK_CLASSES } from '../constants';
import { Student, ClassGroup, SchoolFeeRecord, NotificationType, ActivityLog } from '../types';

interface StudentsProps {
  classesList?: ClassGroup[];
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  feeRecords: SchoolFeeRecord[];
  setFeeRecords: React.Dispatch<React.SetStateAction<SchoolFeeRecord[]>>;
  addNotification: (type: NotificationType, message: string) => void;
  addLog?: (action: string, details: string, module: ActivityLog['module'], type: ActivityLog['type']) => void;
  currentUserRole?: string;
  feeConfigs?: any[];
}

// Helper pour générer une couleur cohérente basée sur le nom
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-650 border-red-200',
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

const Students: React.FC<StudentsProps> = ({ 
  classesList = MOCK_CLASSES,
  students,
  setStudents,
  feeRecords,
  setFeeRecords,
  addNotification,
  addLog,
  currentUserRole,
  feeConfigs = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Toutes');
  const [sortOrder, setSortOrder] = useState<'alpha' | 'recent'>('alpha');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null); 
  
  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null); // Pour la photo

  // Form State
  const initialFormState = {
    firstName: '',
    lastName: '',
    age: '',
    grade: '',
    parentName: '',
    parentPhone: '',
    emergencyContact: '',
    address: '',
    medicalInfo: '',
    photo: '',
    gender: 'Masculin',
    status: 'Actif'
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- HELPERS ---
  const uniqueClasses = ['Toutes', ...Array.from(new Set(classesList.map(c => c.name))).sort()];

  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'Toutes' || s.grade === selectedClass;
    return matchesSearch && matchesClass;
  }).sort((a, b) => {
    if (sortOrder === 'recent') {
      const dateA = a.joinDate ? new Date(a.joinDate).getTime() : 0;
      const dateB = b.joinDate ? new Date(b.joinDate).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      // Fallback to numeric comparison of the ID
      const tsA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const tsB = parseInt(b.id.replace(/\D/g, '')) || 0;
      if (tsB !== tsA) return tsB - tsA;
    }
    const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
    const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchChange = (value: string) => { setSearchTerm(value); setCurrentPage(1); };
  const handleClassChange = (value: string) => { setSelectedClass(value); setCurrentPage(1); };

  // --- CRUD ACTIONS ---

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setCurrentStudent(student);
      setFormData({
        firstName: student.firstName,
        lastName: student.lastName,
        age: student.age ? student.age.toString() : '',
        grade: student.grade,
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        emergencyContact: student.emergencyContact || '',
        address: student.address || '',
        medicalInfo: student.medicalInfo || '',
        photo: student.photo || '',
        gender: student.gender || 'Masculin',
        status: student.status
      });
      setIsModalOpen(true);
    }
    // Note: Create mode is removed from UI, strictly Edit now
  };

  const handleViewStudent = (student: Student) => {
    setCurrentStudent(student);
    setIsViewModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!formData.firstName || !formData.lastName || !formData.grade) {
      addNotification('error', 'Veuillez remplir les champs obligatoires (Nom, Prénom, Classe).');
      return;
    }

    // Only Update Logic remains reachable
    if (currentStudent) {
      const updatedStudentData: Student = {
        ...currentStudent,
        firstName: formData.firstName,
        lastName: formData.lastName,
        grade: formData.grade,
        status: formData.status as 'Actif' | 'Inactif',
        age: parseInt(formData.age) || undefined,
        parentName: formData.parentName,
        parentPhone: formData.parentPhone,
        emergencyContact: formData.emergencyContact,
        address: formData.address,
        medicalInfo: formData.medicalInfo,
        photo: formData.photo,
        gender: formData.gender as 'Masculin' | 'Féminin',
      };

      // 1. Update Student List
      setStudents(prev => prev.map(s => s.id === currentStudent.id ? updatedStudentData : s));
      
      // 2. Update matching feeRecords (Sync Name and Class, and dynamically recalculate financials if class changed)
      const updatedName = `${updatedStudentData.lastName.toUpperCase()} ${updatedStudentData.firstName}`;
      const config = feeConfigs.find(c => updatedStudentData.grade === c.grade) ||
                     feeConfigs.find(c => updatedStudentData.grade.startsWith(c.grade));

      setFeeRecords(prev => prev.map(r => {
        if (r.studentId === currentStudent.id) {
          if (r.class !== updatedStudentData.grade && config) {
            const baseTuition = config.tuitionAmount;
            const baseRegistration = config.registrationAmount;
            const initialAmount = baseTuition + baseRegistration;
            const discountAmount = (baseTuition * r.discount) / 100;
            const netDue = initialAmount - discountAmount;
            
            const sumInstallments = (insts: Record<string, any> = {}) => {
              return Object.values(insts).reduce((acc: number, curr: any) => {
                const amt = typeof curr === 'number' ? curr : (curr?.amount || 0);
                return acc + amt;
              }, 0);
            };
            const totalPaid = r.registration + sumInstallments(r.installments);
            const remainingGlobal = Math.max(0, netDue - totalPaid);

            return {
              ...r,
              studentName: updatedName,
              class: updatedStudentData.grade,
              initialTuition: baseTuition,
              initialRegistration: baseRegistration,
              initialAmount,
              discountAmount,
              netDue,
              totalPaid,
              remainingGlobal
            };
          }
          return {
            ...r,
            studentName: updatedName,
            class: updatedStudentData.grade
          };
        }
        return r;
      }));
      
      addNotification('success', 'Informations de l\'élève mises à jour.');
      if (addLog) addLog('Mise à jour Élève', `Modification profil de ${updatedStudentData.firstName} ${updatedStudentData.lastName}`, 'Scolarité', 'update');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col font-sans">
      
      {/* HEADER TITLE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-850 dark:text-white">Gestion des Élèves</h1>
          <p className="text-slate-400 dark:text-slate-400 text-xs font-semibold mt-1">
            Liste des élèves inscrits via le Grand Livre (Scolarité).
          </p>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 flex flex-col xl:flex-row gap-4 items-center shrink-0">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text"
            placeholder="Rechercher un élève..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-slate-900 dark:text-white text-xs font-semibold"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 items-center">
           <div className="relative min-w-[180px]">
             <select
               className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-slate-350 border border-gray-200 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-bold cursor-pointer text-gray-900"
               value={selectedClass}
               onChange={(e) => handleClassChange(e.target.value)}
             >
               {uniqueClasses.map(c => (
                 <option key={c} value={c} className="text-gray-900 bg-white">{c}</option>
               ))}
             </select>
             <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
           </div>

           <div className="relative min-w-[180px]">
             <select
               className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-slate-350 border border-gray-200 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-bold cursor-pointer text-gray-900"
               value={sortOrder}
               onChange={(e) => setSortOrder(e.target.value as 'alpha' | 'recent')}
             >
               <option value="alpha" className="text-gray-900 bg-white">Trier : Nom (A-Z)</option>
               <option value="recent" className="text-gray-900 bg-white">Trier : Plus récent</option>
             </select>
             <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
           </div>
           
           <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-zinc-900/50 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-350 whitespace-nowrap">
              {filteredStudents.length} élèves inscrits
           </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-premium-sm border border-slate-200/60 dark:border-zinc-800/80 flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-zinc-950 text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-zinc-800/80 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="p-4.5 pl-6">Élève</th>
                <th className="p-4.5">Classe</th>
                <th className="p-4.5">Statut</th>
                <th className="p-4.5">Frais de scolarité</th>
                <th className="p-4.5">Présence</th>
                <th className="p-4.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/70">
              {filteredStudents.length === 0 ? (
                <tr>
                   <td colSpan={6} className="p-12 text-center text-slate-400">
                      <Users size={36} className="mx-auto mb-3 opacity-20" />
                      <p className="text-xs font-bold">Aucun élève trouvé pour cette recherche.</p>
                   </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  return (
                    <tr 
                      key={student.id} 
                      className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/60/45 transition-colors group cursor-pointer"
                      onClick={() => handleViewStudent(student)}
                    >
                      <td className="p-4.5 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center border overflow-hidden bg-slate-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm shrink-0">
                            <img 
                              src={student.photo || (student.gender === 'Féminin' 
                                ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&skinColor=9e563b&hairColor=000000' 
                                : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&skinColor=9e563b&hairColor=000000')} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{student.lastName.toUpperCase()} {student.firstName}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">ID: {student.id.substring(0,8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4.5">
                         <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-350 border border-gray-200/50 dark:border-slate-700/50">
                           {student.grade}
                         </span>
                      </td>
                      <td className="p-4.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 w-fit ${student.status === 'Actif' ? 'bg-green-100 text-green-700 dark:bg-green-955/20 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${student.status === 'Actif' ? 'bg-green-500' : 'bg-slate-400'}`} />
                          {student.status}
                        </span>
                      </td>
                      <td className="p-4.5">
                        <span className={`
                          px-2 py-0.5 rounded-lg text-[10px] font-bold
                          ${student.feesStatus === 'Payé' ? 'bg-green-100 text-green-700 dark:bg-green-955/20 dark:text-green-400' : ''}
                          ${student.feesStatus === 'En retard' ? 'bg-red-100 text-red-700 dark:bg-red-955/20 dark:text-red-400' : ''}
                          ${student.feesStatus === 'Partiel' || student.feesStatus === 'En attente' ? 'bg-orange-100 text-orange-700 dark:bg-orange-955/20 dark:text-orange-400' : ''}
                        `}>
                          {student.feesStatus}
                        </span>
                      </td>
                      <td className="p-4.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${student.attendance >= 90 ? 'bg-green-500' : student.attendance >= 75 ? 'bg-orange-500' : 'bg-red-500'}`}
                              style={{ width: `${student.attendance}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{student.attendance}%</span>
                        </div>
                      </td>
                      <td className="p-4.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleViewStudent(student)} className="p-1.5 text-slate-550 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer" title="Voir">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => handleOpenModal(student)} className="p-1.5 text-blue-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-955/20 rounded-xl transition-all cursor-pointer" title="Modifier">
                            <Edit2 size={15} />
                          </button>
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

      {/* EDIT STUDENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 z-[60] flex justify-center items-center p-4 backdrop-blur-md animate-fade-in">
           <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-premium-sm-xl w-full max-w-2xl border border-slate-200/60/70 dark:border-zinc-850 flex flex-col max-h-[90vh] animate-fade-in-up overflow-hidden">
               <div className="p-6 flex justify-between items-center bg-white dark:bg-zinc-900 border-b border-slate-200/60 dark:border-zinc-850 shrink-0">
                   <h2 className="text-base font-bold text-slate-850 dark:text-white flex items-center gap-2">
                      <Edit2 size={16} className="text-blue-600"/>
                      Modifier la fiche de l'élève
                   </h2>
                   <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"><X size={18} /></button>
               </div>
               
               <div className="p-6 overflow-y-auto space-y-5 flex-1">
                   
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

                   <div className="grid grid-cols-2 gap-4">
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

                   <div className="grid grid-cols-3 gap-4">
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Âge (Années)</label>
                          <input 
                            type="number" 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-750"
                            value={formData.age}
                            onChange={(e) => setFormData({...formData, age: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Niveau / Classe *</label>
                          <select 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-bold text-slate-850 dark:text-white cursor-pointer text-gray-900"
                            value={formData.grade}
                            onChange={(e) => setFormData({...formData, grade: e.target.value})}
                          >
                             <option value="" className="text-gray-900 bg-white">Sélectionner</option>
                             {uniqueClasses.filter(c => c !== 'Toutes').map(c => (
                               <option key={c} value={c} className="text-gray-900 bg-white">{c}</option>
                             ))}
                          </select>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Genre (Sexe)</label>
                          <select 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-bold text-slate-850 dark:text-white cursor-pointer text-gray-900"
                            value={formData.gender}
                            onChange={(e) => setFormData({...formData, gender: e.target.value})}
                          >
                             <option value="Masculin" className="text-gray-900 bg-white">Masculin</option>
                             <option value="Féminin" className="text-gray-900 bg-white">Féminin</option>
                          </select>
                       </div>
                   </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Statut inscription</label>
                           <select 
                             className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-bold text-slate-850 dark:text-white cursor-pointer text-gray-900"
                             value={formData.status}
                             onChange={(e) => setFormData({...formData, status: e.target.value})}
                           >
                              <option value="Actif" className="text-gray-900 bg-white">Actif</option>
                              <option value="Inactif" className="text-gray-900 bg-white">Inactif</option>
                           </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nom du parent/tuteur</label>
                          <input 
                            type="text" 
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-750"
                            value={formData.parentName}
                            onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Téléphone du parent</label>
                           <input 
                             type="tel" 
                             className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-750"
                             value={formData.parentPhone}
                             onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                           />
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contact d'urgence</label>
                           <input 
                             type="tel" 
                             className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-750"
                             value={formData.emergencyContact}
                             onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                           />
                        </div>
                    </div>

                    <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Adresse résidentielle</label>
                       <input 
                         type="text" 
                         className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white placeholder-slate-750"
                         value={formData.address}
                         onChange={(e) => setFormData({...formData, address: e.target.value})}
                       />
                    </div>

                    <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Informations médicales (optionnel)</label>
                       <textarea 
                         className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/15 transition-all text-xs font-semibold text-slate-850 dark:text-white resize-none placeholder-slate-750"
                         rows={2}
                         value={formData.medicalInfo}
                         onChange={(e) => setFormData({...formData, medicalInfo: e.target.value})}
                       ></textarea>
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
      {isViewModalOpen && currentStudent && (
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
                                  src={currentStudent.photo || (currentStudent.gender === 'Féminin' 
                                    ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&skinColor=9e563b&hairColor=000000' 
                                    : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&skinColor=9e563b&hairColor=000000')} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                              />
                          </div>
                          <h2 className="text-lg font-bold text-slate-850 dark:text-white mt-3">{currentStudent.lastName.toUpperCase()} {currentStudent.firstName}</h2>
                          <span className="inline-block mt-1 px-3 py-0.5 bg-blue-50 dark:bg-blue-955/20 text-blue-700 dark:text-blue-400 rounded-lg text-[10px] font-bold">
                              {currentStudent.grade} • {currentStudent.age ? `${currentStudent.age} ans` : 'Âge non renseigné'}
                          </span>
                      </div>

                      <div className="space-y-4">
                           <div className="grid grid-cols-3 gap-3">
                               <div className="p-3 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-200/60/40 dark:border-zinc-850/80">
                                   <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Statut</p>
                                   <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold ${currentStudent.status === 'Actif' ? 'bg-green-50 text-green-700 dark:bg-green-950/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                       {currentStudent.status}
                                   </span>
                                </div>
                               <div className="p-3 bg-slate-50 dark:bg-slate-955/20 rounded-xl border border-slate-200/60/40 dark:border-zinc-850/80">
                                   <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Genre</p>
                                   <p className="font-bold text-slate-700 dark:text-slate-350 text-[10px]">{currentStudent.gender || 'Masculin'}</p>
                               </div>
                               <div className="p-3 bg-slate-50 dark:bg-slate-955/20 rounded-xl border border-slate-200/60/40 dark:border-zinc-850/80">
                                   <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">ID Élève</p>
                                   <p className="font-mono font-bold text-slate-750 dark:text-slate-350 text-[10px] truncate" title={currentStudent.id}>{currentStudent.id.substring(0, 8)}...</p>
                               </div>
                           </div>

                           <div className="space-y-3.5 border-t border-slate-100 dark:border-zinc-850 pt-4.5">
                               <div className="flex items-start gap-3">
                                   <div className="p-2 bg-blue-50 dark:bg-blue-955/20 text-blue-600 rounded-xl mt-0.5">
                                       <Users size={16} />
                                   </div>
                                   <div>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase">Parent / Tuteur</p>
                                       <p className="text-xs font-bold text-slate-850 dark:text-white mt-0.5">{currentStudent.parentName || 'Non renseigné'}</p>
                                       <p className="text-[10px] text-slate-500 font-semibold">{currentStudent.parentPhone || '-'}</p>
                                   </div>
                               </div>
                               
                               <div className="flex items-start gap-3">
                                   <div className="p-2 bg-red-50 dark:bg-red-955/20 text-red-600 rounded-xl mt-0.5">
                                       <Phone size={16} />
                                   </div>
                                   <div>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase">Urgence</p>
                                       <p className="text-xs font-bold text-slate-850 dark:text-white mt-0.5">{currentStudent.emergencyContact || 'Non renseigné'}</p>
                                   </div>
                               </div>

                               <div className="flex items-start gap-3">
                                   <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl mt-0.5">
                                       <MapPin size={16} />
                                   </div>
                                   <div>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase">Adresse</p>
                                       <p className="text-xs font-bold text-slate-850 dark:text-white mt-0.5">{currentStudent.address || 'Non renseignée'}</p>
                                   </div>
                               </div>

                               {currentStudent.medicalInfo && (
                                   <div className="p-3.5 bg-red-50 dark:bg-red-955/20 border border-red-100/50 dark:border-red-900/30 rounded-xl mt-4">
                                       <div className="flex items-center gap-2 mb-1.5 text-red-700 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider">
                                           <Heart size={13} />
                                           Info Médicale
                                       </div>
                                       <p className="text-xs text-red-650 dark:text-red-300 font-medium">{currentStudent.medicalInfo}</p>
                                   </div>
                               )}
                           </div>
                           
                           {/* Footer Actions */}
                           <div className="mt-6 flex gap-3">
                               <button 
                                   onClick={() => { setIsViewModalOpen(false); handleOpenModal(currentStudent); }} 
                                   className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                               >
                                   <Edit2 size={13} /> Modifier
                               </button>
                               <button 
                                   onClick={() => setIsViewModalOpen(false)} 
                                   className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-350 font-bold rounded-xl text-xs transition-all cursor-pointer"
                               >
                                   Fermer
                               </button>
                           </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Students;
