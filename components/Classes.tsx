
import React, { useState, useMemo, useEffect } from 'react';
import {
    GraduationCap,
    Users,
    BookOpen,
    Clock,
    Edit2,
    Trash2,
    Plus,
    Search,
    Calendar,
    ArrowLeft,
    MapPin,
    TrendingUp,
    Award,
    AlertTriangle,
    FileText,
    Download,
    Printer,
    BarChart2,
    LineChart as LineChartIcon,
    Book,
    User,
    X,
    Save,
    AlertCircle,
    ChevronDown
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, Legend
} from 'recharts';
import { StaffMember, Student, NotificationType, Subject, ScheduleSlot, Grade } from '../types';

// Interface matching the structure from App.tsx generateInitialClasses
interface ClassData {
    id: string;
    name: string;
    teacherId: string;
    studentCount: number;
    capacity: number;
    level: string;
    room: string;
    subjects: Subject[];
    schedule: ScheduleSlot[];
    description: string;
}

interface ClassesProps {
    staffList: StaffMember[];
    students: Student[];
    classes: any[];
    setClasses: React.Dispatch<React.SetStateAction<any[]>>;
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    addNotification: (type: NotificationType, message: string) => void;
    currentUserRole?: string;
}

// Palette de couleurs pastel pour diversifier l'affichage des classes
const PASTEL_PALETTE = [
    { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
    { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
    { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
    { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-600 dark:text-lime-400', border: 'border-lime-200 dark:border-lime-800' },
    { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', text: 'text-fuchsia-600 dark:text-fuchsia-400', border: 'border-fuchsia-200 dark:border-fuchsia-800' },
    { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
];

// Initial Subjects Data (Editable State)
const INITIAL_SUBJECTS = [
    { id: 'SUB1', name: 'Mathématiques', coef: 3, teacher: '' },
    { id: 'SUB2', name: 'Français', coef: 3, teacher: '' },
    { id: 'SUB3', name: 'Anglais', coef: 2, teacher: '' },
    { id: 'SUB4', name: 'Histoire-Géo', coef: 2, teacher: '' },
    { id: 'SUB5', name: 'SVT', coef: 2, teacher: '' },
    { id: 'SUB6', name: 'Physique-Chimie', coef: 2, teacher: '' },
    { id: 'SUB7', name: 'EPS', coef: 1, teacher: '' },
];

// Mock Evaluations Data
const MOCK_EVALUATIONS: any[] = [];

const WEEK_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const isPreschoolClass = (className: string): boolean => {
    const name = className.toLowerCase();
    return (
        name.includes('garderie') ||
        name.includes('section') ||
        name.includes('maternelle') ||
        name.includes('pre')
    );
};

// Returns the default max grade based on class level name
export const getDefaultMaxGrade = (className: string, subjectName?: string): number => {
    const name = className.toLowerCase();
    const isCE = name.includes('ce1') || name.includes('ce2') || name.includes('ce ');
    if (isCE && subjectName) {
        const sub = subjectName.toLowerCase();
        if (sub.includes('orthographe')) return 10;
        if (sub.includes('texte')) return 30;
        if (sub.includes('milieu') || sub.includes('histoire') || sub.includes('sciences') || sub.includes('géographie') || sub.includes('géo') || sub.includes('geo')) return 30;
        if (sub.includes('math')) return 30;
    }
    if (name.includes('cp') || name.includes('cours préparatoire') || name.includes('cours preparatoire')) return 10;
    if (name.includes('ce') || name.includes('cours élémentaire') || name.includes('cours elementaire')) return 30;
    // CM and others default to 20
    return 20;
};

const getPreschoolAcquisitionRate = (student: Student, trimester?: string) => {
    const grades = student.grades || [];
    const filtered = trimester ? grades.filter(g => g.trimester === trimester) : grades;
    if (filtered.length === 0) return 0;
    
    const totalPoints = filtered.reduce((sum, g) => {
        if (g.value === 1) return sum + 1;
        if (g.value === 0.5) return sum + 0.5;
        return sum;
    }, 0);
    
    return totalPoints / filtered.length;
};

const PRIMARY_SUBJECTS = [
    "Lecture",
    "Écriture",
    "Copie",
    "Orthographe",
    "Grammaire / Conj",
    "Vocabulaire",
    "Etude de texte",
    "Expression écrite",
    "Histoire - Géographie",
    "Sciences",
    "Mathématiques",
    "Chant - Récitation",
    "Dessin",
    "EDHC",
    "A.P.E",
    "Anglais",
    "Informatique"
];

const Classes: React.FC<ClassesProps> = ({ staffList, students, classes, setClasses, setStudents, addNotification, currentUserRole }) => {
    const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'matieres' | 'emploi' | 'eleves'>('info');
    const [searchTerm, setSearchTerm] = useState('');
    const [classStudentsSortOrder, setClassStudentsSortOrder] = useState<'alpha' | 'recent'>('alpha');

    // State for Classes CRUD
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassData | null>(null);
    const [classForm, setClassForm] = useState({
        name: '',
        level: '',
        teacherId: '',
        room: '',
        capacity: '30',
        description: ''
    });
    const [classToDelete, setClassToDelete] = useState<string | null>(null);

    // State for Subjects Management
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<any | null>(null);
    const [subjectForm, setSubjectForm] = useState({ name: '', coef: '1', maxGrade: '', teacher: '' });
    const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);

    // State for individual student performance modal
    const [selectedStudentStats, setSelectedStudentStats] = useState<any | null>(null);

    // BUG-015 FIX: classSchedule must reflect the currently selected class, not hardcoded mock data
    const [classSchedule, setClassSchedule] = useState<any[]>([]);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        day: 'Lundi',
        startTime: '08:00',
        endTime: '10:00',
        subject: '',
        type: 'Cours'
    });

    // State for Grade Management
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<Student | null>(null);
    const [gradeForm, setGradeForm] = useState({
        subject: '',
        value: '',
        trimester: 'Octobre'
    });
    const [preschoolMonths, setPreschoolMonths] = useState<string[]>([
        'Octobre', 'Novembre', 'Décembre', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'
    ]);
    const [primaryCompositions, setPrimaryCompositions] = useState<string[]>([
        'Composition École 1', 'Composition IEP 1', 'Composition École 2', 'Composition IEP 2', 'Composition École 3', 'Composition IEP 3'
    ]);
    const [activeAddGradeTrimester, setActiveAddGradeTrimester] = useState<string | null>(null); // Replaces isAddGradeOpen

    // BUG-018 FIX: Replace window.prompt() with an inline React modal
    const [showAddPeriodModal, setShowAddPeriodModal] = useState(false);
    const [addPeriodValue, setAddPeriodValue] = useState('');

    // BUG-015 FIX: Sync local schedule display with the selected class's persisted schedule
    useEffect(() => {
        setClassSchedule(selectedClass?.schedule || []);
    }, [selectedClass]);

    // Alias for compatibility
    const currentClass = selectedClass;

    // Derived preschool flag — used throughout the JSX
    const isPreschool = currentClass ? isPreschoolClass(currentClass.name) : false;
    const periods = isPreschool ? preschoolMonths : primaryCompositions;

    // Ensure subjects fallback for CE1/CE2
    const currentClassSubjects = useMemo(() => {
        if (!currentClass) return [];
        if (!currentClass.subjects || currentClass.subjects.length === 0) {
            const name = currentClass.name.toLowerCase();
            if (name.includes('ce1') || name.includes('ce2')) {
                return [
                    { id: 'DEF-SUB1', name: 'Orthographe', coef: 1, maxGrade: 10, teacher: 'Non assigné' },
                    { id: 'DEF-SUB2', name: 'Étude de texte', coef: 1, maxGrade: 30, teacher: 'Non assigné' },
                    { id: 'DEF-SUB3', name: 'Étude du milieu (histoire geo et sciences)', coef: 1, maxGrade: 30, teacher: 'Non assigné' },
                    { id: 'DEF-SUB4', name: 'Mathématiques', coef: 1, maxGrade: 30, teacher: 'Non assigné' }
                ];
            }
        }
        return currentClass.subjects || [];
    }, [currentClass]);

    const filteredClasses = useMemo(() => {
        if (currentClass) return []; // Skip calculation in detailed view
        return classes.filter((c: ClassData) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.teacherId && staffList.find(s => s.id === c.teacherId)?.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [classes, searchTerm, staffList, currentClass]);

    const currentClassStudentCount = useMemo(() => {
        if (!currentClass) return 0;
        const normalize = (str: any) => String(str || '').trim().toLowerCase();
        return students.filter(s => normalize(s.grade) === normalize(currentClass.name)).length;
    }, [students, currentClass]);

    const handleClassClick = (cls: ClassData) => {
        setSelectedClass(cls);
        setActiveTab('info');
    };

    const handleBack = () => {
        setSelectedClass(null);
    };

    const getTeacherName = (id: string) => {
        const teacher = staffList.find(s => s.id === id);
        return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Non assigné';
    };

    const handleExportBulletin = () => {
        addNotification('success', 'Génération des bulletins en cours... Le téléchargement démarrera bientôt.');
    };

    // --- CLASS CRUD HANDLERS ---
    const handleOpenAddClass = () => {
        if (currentUserRole !== 'ADMIN_GENERALE') {
            addNotification('error', 'Action réservée à l\'Administrateur Général.');
            return;
        }
        setEditingClass(null);
        setClassForm({ name: '', level: '', teacherId: '', room: '', capacity: '30', description: '' });
        setIsClassModalOpen(true);
    };

    const handleOpenEditClass = (cls: ClassData, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingClass(cls);
        setClassForm({
            name: cls.name,
            level: cls.level,
            teacherId: cls.teacherId,
            room: cls.room,
            capacity: cls.capacity.toString(),
            description: cls.description
        });
        setIsClassModalOpen(true);
    };

    const handleSaveClass = () => {
        if (!classForm.name || !classForm.level) {
            addNotification('error', 'Le nom et le niveau sont requis.');
            return;
        }

        const newClassData = {
            name: classForm.name,
            level: classForm.level,
            teacherId: classForm.teacherId,
            room: classForm.room || 'Non assignée',
            capacity: parseInt(classForm.capacity) || 30,
            description: classForm.description,
            studentCount: editingClass ? editingClass.studentCount : 0,
            subjects: editingClass ? editingClass.subjects : [],
            schedule: editingClass ? editingClass.schedule : []
        };

        if (editingClass) {
            setClasses(prev => prev.map(c => c.id === editingClass.id ? { ...c, ...newClassData } : c));
            // Update detail view if currently viewing this class
            if (selectedClass && selectedClass.id === editingClass.id) {
                setSelectedClass({ ...selectedClass, ...newClassData });
            }
            addNotification('success', 'Classe modifiée avec succès.');
        } else {
            if (currentUserRole !== 'ADMIN_GENERALE') {
                addNotification('error', 'Action réservée à l\'Administrateur Général.');
                return;
            }
            const newClass = {
                id: `CLS-${Date.now()}`,
                ...newClassData
            };
            setClasses(prev => [...prev, newClass]);
            addNotification('success', 'Nouvelle classe ajoutée.');
        }
        setIsClassModalOpen(false);
    };

    const handleDeleteClassClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentUserRole !== 'ADMIN_GENERALE') {
            addNotification('error', 'Action réservée à l\'Administrateur Général.');
            return;
        }
        setClassToDelete(id);
    };

    const confirmDeleteClass = () => {
        if (currentUserRole !== 'ADMIN_GENERALE') {
            addNotification('error', 'Action réservée à l\'Administrateur Général.');
            return;
        }
        if (classToDelete) {
            setClasses(prev => prev.filter(c => c.id !== classToDelete));
            addNotification('success', 'Classe supprimée.');
            setClassToDelete(null);
            if (selectedClass && selectedClass.id === classToDelete) {
                setSelectedClass(null);
            }
        }
    };

    // --- SUBJECTS MANAGEMENT HANDLERS ---
    const handleOpenAddSubject = () => {
        setEditingSubject(null);
        setSubjectForm({ name: '', coef: '1', maxGrade: '', teacher: '' });
        setIsSubjectModalOpen(true);
    };

    const handleOpenEditSubject = (subject: any) => {
        setEditingSubject(subject);
        setSubjectForm({
            name: subject.name,
            coef: subject.coef.toString(),
            maxGrade: subject.maxGrade ? subject.maxGrade.toString() : '',
            teacher: subject.teacher
        });
        setIsSubjectModalOpen(true);
    };

    const handleSaveSubject = () => {
        if (!subjectForm.name) {
            addNotification('error', 'Le nom de la matière est requis.');
            return;
        }

        const newSubject: Subject = {
            id: editingSubject ? editingSubject.id : `SUB-${Date.now()}`,
            name: subjectForm.name,
            coef: parseInt(subjectForm.coef) || 1,
            maxGrade: subjectForm.maxGrade ? parseInt(subjectForm.maxGrade) : undefined,
            teacher: subjectForm.teacher || 'Non assigné'
        };

        if (currentClass) {
            const updatedSubjects = editingSubject
                ? currentClass.subjects.map(s => s.id === editingSubject.id ? newSubject : s)
                : [...currentClass.subjects, newSubject];

            const updatedClass = { ...currentClass, subjects: updatedSubjects };

            setClasses(prev => prev.map(c => c.id === currentClass.id ? updatedClass : c));
            setSelectedClass(updatedClass);

            addNotification('success', editingSubject ? 'Matière modifiée.' : 'Matière ajoutée.');
        }
        setIsSubjectModalOpen(false);
    };

    const handleDeleteSubjectClick = (id: string) => {
        setSubjectToDelete(id);
    };

    const confirmDeleteSubject = () => {
        if (subjectToDelete && currentClass) {
            const updatedSubjects = currentClass.subjects.filter(s => s.id !== subjectToDelete);
            const updatedClass = { ...currentClass, subjects: updatedSubjects };

            setClasses(prev => prev.map(c => c.id === currentClass.id ? updatedClass : c));
            setSelectedClass(updatedClass);

            addNotification('success', 'Matière supprimée.');
            setSubjectToDelete(null);
        }
    };

    // --- GRADE MANAGEMENT HANDLERS ---
    const handleOpenGrades = (student: Student) => {
        setSelectedStudentForGrades(student);
        const isPreschool = currentClass ? isPreschoolClass(currentClass.name) : false;
        setGradeForm({ 
            subject: currentClassSubjects[0]?.name || '', 
            value: '', 
            trimester: isPreschool ? 'Octobre' : 'Composition École 1' 
        });
        setIsGradeModalOpen(true);
        setActiveAddGradeTrimester(null);
    };

    const handleAddPeriod = () => {
        // BUG-018 FIX: Show inline modal instead of browser prompt()
        setAddPeriodValue('');
        setShowAddPeriodModal(true);
    };

    const handleConfirmAddPeriod = () => {
        if (!addPeriodValue.trim()) {
            setShowAddPeriodModal(false);
            return;
        }
        if (isPreschool) {
            setPreschoolMonths([...preschoolMonths, addPeriodValue.trim()]);
        } else {
            setPrimaryCompositions([...primaryCompositions, addPeriodValue.trim()]);
        }
        setShowAddPeriodModal(false);
        setAddPeriodValue('');
    };

    const handleSaveGrade = () => {
        if (!selectedStudentForGrades || !gradeForm.subject || !gradeForm.value) {
            addNotification('error', 'Matière et note sont requises.');
            return;
        }

        const isPreschool = currentClass ? isPreschoolClass(currentClass.name) : false;
        const gradeValue = parseFloat(gradeForm.value);

        const selectedSubject = currentClassSubjects.find(s => s.name === gradeForm.subject);
        const gradeMax = selectedSubject?.maxGrade ?? getDefaultMaxGrade(currentClass?.name || '', gradeForm.subject);

        if (isPreschool) {
            if (isNaN(gradeValue) || (gradeValue !== 0 && gradeValue !== 0.5 && gradeValue !== 1)) {
                addNotification('error', "Veuillez sélectionner Acquis, En cours d'acquisition ou Non acquis.");
                return;
            }
        } else {
            if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > gradeMax) {
                addNotification('error', `La note doit être comprise entre 0 et ${gradeMax}.`);
                return;
            }
        }

        const newGrade: Grade = {
            id: `GRD-${Date.now()}`,
            subject: gradeForm.subject,
            value: gradeValue,
            maxGrade: gradeMax,
            trimester: gradeForm.trimester,
            date: new Date().toISOString().split('T')[0]
        };

        const updatedStudent = {
            ...selectedStudentForGrades,
            grades: [...(selectedStudentForGrades.grades || []), newGrade]
        };

        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
        setSelectedStudentForGrades(updatedStudent);
        setGradeForm({ ...gradeForm, value: '' }); // Reset value but keep subject/trimester
        addNotification('success', 'Note ajoutée.');
        setActiveAddGradeTrimester(null);
    };

    const handleDeleteGrade = (gradeId: string) => {
        if (selectedStudentForGrades) {
            const updatedGrades = selectedStudentForGrades.grades?.filter(g => g.id !== gradeId) || [];
            const updatedStudent = { ...selectedStudentForGrades, grades: updatedGrades };

            setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
            setSelectedStudentForGrades(updatedStudent);
            addNotification('success', 'Note supprimée.');
        }
    };

    const getTrimesterAverage = (student: Student, trimester: string) => {
        const grades = student.grades?.filter(g => g.trimester === trimester) || [];
        if (grades.length === 0) return '0.00';

        const isCE = currentClass ? (currentClass.name.toLowerCase().includes('ce1') || currentClass.name.toLowerCase().includes('ce2')) : false;

        if (isCE) {
            let totalPoints = 0;
            let totalMax = 0;
            grades.forEach(grade => {
                const subject = currentClassSubjects.find(s => s.name === grade.subject);
                const maxGrade = grade.maxGrade ?? subject?.maxGrade ?? getDefaultMaxGrade(currentClass?.name || '', grade.subject);
                totalPoints += grade.value;
                totalMax += maxGrade;
            });
            if (totalMax === 0) return '0.00';
            return ((totalPoints / totalMax) * 20).toFixed(2);
        }

        let totalPoints = 0;
        let totalCoef = 0;

        grades.forEach(grade => {
            const subject = currentClassSubjects.find(s => s.name === grade.subject);
            const coef = subject ? subject.coef : 1; // Default to 1 if subject not found
            const maxGrade = grade.maxGrade ?? subject?.maxGrade ?? getDefaultMaxGrade(currentClass?.name || '', grade.subject);
            
            // Normalize to a base of 20
            const normalizedValue = maxGrade > 0 ? (grade.value / maxGrade) * 20 : 0;
            totalPoints += normalizedValue * coef;
            totalCoef += coef;
        });

        if (totalCoef === 0) return '0.00';
        return (totalPoints / totalCoef).toFixed(2);
    };

    const getGlobalAverage = (student: Student) => {
        if (!student.grades || student.grades.length === 0) return '0.00';

        // Identify unique trimesters with grades
        const trimestersWithGrades = Array.from(new Set(student.grades.map(g => g.trimester)));

        if (trimestersWithGrades.length === 0) return '0.00';

        let sumTrimesterAverages = 0;

        trimestersWithGrades.forEach(trimester => {
            sumTrimesterAverages += parseFloat(getTrimesterAverage(student, trimester));
        });

        return (sumTrimesterAverages / trimestersWithGrades.length).toFixed(2);
    };

    // --- SCHEDULE HANDLERS ---
    const getSubjectColor = (subjectName: string) => {
        const colors = [
            { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'group-hover:border-blue-300 border-blue-200 dark:border-blue-800' },
            { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'group-hover:border-green-300 border-green-200 dark:border-green-800' },
            { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'group-hover:border-purple-300 border-purple-200 dark:border-purple-800' },
            { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'group-hover:border-orange-300 border-orange-200 dark:border-orange-800' },
            { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'group-hover:border-pink-300 border-pink-200 dark:border-pink-800' },
            { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'group-hover:border-indigo-300 border-indigo-200 dark:border-indigo-800' },
        ];
        let hash = 0;
        for (let i = 0; i < subjectName.length; i++) {
            hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const handleOpenAddSlot = () => {
        setScheduleForm({
            day: 'Lundi',
            startTime: '08:00',
            endTime: '10:00',
            subject: currentClass?.subjects[0]?.name || '',
            type: 'Cours'
        });
        setIsScheduleModalOpen(true);
    };

    const handleSaveSlot = () => {
        if (!scheduleForm.subject) {
            addNotification('error', 'Veuillez sélectionner une matière.');
            return;
        }

        if (currentClass) {
            const newSlot: ScheduleSlot = {
                id: `SLOT-${Date.now()}`,
                day: scheduleForm.day,
                startTime: scheduleForm.startTime,
                endTime: scheduleForm.endTime,
                subject: scheduleForm.subject,
                type: scheduleForm.type as any
            };

            const updatedSchedule = [...currentClass.schedule, newSlot];
            const updatedClass = { ...currentClass, schedule: updatedSchedule };

            setClasses(prev => prev.map(c => c.id === currentClass.id ? updatedClass : c));
            setSelectedClass(updatedClass);

            addNotification('success', 'Créneau ajouté.');
        }
        setIsScheduleModalOpen(false);
    };

    const handleDeleteSlot = (id: string) => {
        if (currentClass) {
            const updatedSchedule = currentClass.schedule.filter(s => s.id !== id);
            const updatedClass = { ...currentClass, schedule: updatedSchedule };
            setClasses(prev => prev.map(c => c.id === currentClass.id ? updatedClass : c));
            setSelectedClass(updatedClass);
            addNotification('success', 'Créneau supprimé.');
        }
    };



    // --- ACADEMIC DATA CALCULATION (MOCKED FOR DEMO) ---
    const academicData = useMemo(() => {
        if (!currentClass) return null;

        const normalize = (str: any) => String(str || '').trim().toLowerCase();
        const classStudents = students.filter(s => normalize(s.grade) === normalize(currentClass.name));

        // Assign fake averages to students
        // Calculate real averages based on grades
        const isPreschool = isPreschoolClass(currentClass.name);
        const periods = isPreschool ? preschoolMonths : primaryCompositions;
        const studentsWithGrades = classStudents.map(s => {
            const annual = isPreschool ? getPreschoolAcquisitionRate(s) : parseFloat(getGlobalAverage(s));
            const evolution = periods.map(m => {
                const val = isPreschool
                    ? getPreschoolAcquisitionRate(s, m)
                    : parseFloat(getTrimesterAverage(s, m));
                return { month: m.slice(0, 15), value: val };
            });

            return {
                ...s,
                average: annual,
                evolution
            };
        }).sort((a, b) => {
            if (classStudentsSortOrder === 'recent') {
                const dateA = a.joinDate ? new Date(a.joinDate).getTime() : 0;
                const dateB = b.joinDate ? new Date(b.joinDate).getTime() : 0;
                if (dateB !== dateA) return dateB - dateA;

                const tsA = parseInt(a.id.replace(/\D/g, '')) || 0;
                const tsB = parseInt(b.id.replace(/\D/g, '')) || 0;
                if (tsB !== tsA) return tsB - tsA;
            }
            const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
            const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        const totalAvg = studentsWithGrades.reduce((acc, s) => acc + s.average, 0);
        const classAverage = studentsWithGrades.length > 0 ? (totalAvg / studentsWithGrades.length).toFixed(2) : '0';

        const bestStudent = studentsWithGrades.length > 0 ? studentsWithGrades.reduce((prev, curr) => (prev.average > curr.average) ? prev : curr) : null;
        const worstStudent = studentsWithGrades.length > 0 ? studentsWithGrades.reduce((prev, curr) => (prev.average < curr.average) ? prev : curr) : null;

        // Grade Distribution
        const distribution = [
            { name: '0-5', count: 0, fill: '#EF4444' },
            { name: '5-10', count: 0, fill: '#F59E0B' },
            { name: '10-15', count: 0, fill: '#3B82F6' },
            { name: '15-20', count: 0, fill: '#10B981' },
        ];

        studentsWithGrades.forEach(s => {
            if (isPreschool) {
                if (s.average < 0.25) distribution[0].count++;
                else if (s.average < 0.5) distribution[1].count++;
                else if (s.average < 0.75) distribution[2].count++;
                else distribution[3].count++;
            } else {
                if (s.average < 5) distribution[0].count++;
                else if (s.average < 10) distribution[1].count++;
                else if (s.average < 15) distribution[2].count++;
                else distribution[3].count++;
            }
        });

        const sortedStudents = [...studentsWithGrades].sort((a, b) => b.average - a.average);
        const top3 = sortedStudents.slice(0, 3);
        const atRisk = sortedStudents.filter(s => (isPreschool ? s.average < 0.5 : s.average < 10) && s.grades && s.grades.length > 0);

        // New Statistics Calculations
        const evaluatedStudents = studentsWithGrades.filter(s => s.grades && s.grades.length > 0);
        const evaluatedCount = evaluatedStudents.length;
        const totalStudents = studentsWithGrades.length;

        const successCount = evaluatedStudents.filter(s => isPreschool ? s.average >= 0.5 : s.average >= 10).length;
        const successRate = evaluatedCount > 0 ? ((successCount / evaluatedCount) * 100).toFixed(1) : '0.0';

        const excellentCount = evaluatedStudents.filter(s => isPreschool ? s.average === 1 : s.average >= 16).length;

        return {
            classAverage,
            bestStudent,
            worstStudent,
            distribution,
            top3,
            atRisk,
            studentsWithGrades,
            successRate,
            evaluatedCount,
            totalStudents,
            excellentCount
        };
    }, [currentClass, students]);

    const handleViewPerformance = (student: any) => {
        const isPreschool = currentClass ? isPreschoolClass(currentClass.name) : false;
        const performanceData = {
            student,
            subjects: currentClass?.subjects.map(sub => {
                const realGradeObj = student.grades?.find((g: any) => g.subject.toLowerCase() === sub.name.toLowerCase());
                const sAvg = realGradeObj ? realGradeObj.value : student.average || 0;
                const cAvg = realGradeObj?.classAvg || parseFloat(academicData?.classAverage || (isPreschool ? '0.5' : '10'));
                return {
                    subject: sub.name,
                    student: parseFloat(sAvg.toFixed(2)),
                    classAvg: parseFloat(cAvg.toFixed(2)),
                    fullMark: isPreschool ? 1 : 20
                };
            }) || [],
            comments: []
        };
        setSelectedStudentStats(performanceData);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {!currentClass ? (
                <>
                    {/* LIST VIEW */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 shrink-0">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <GraduationCap size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Gestion des Classes</h2>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            {currentUserRole === 'ADMIN_GENERALE' && (
                                <button
                                    onClick={handleOpenAddClass}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors text-sm font-bold shadow-sm shrink-0"
                                >
                                    <Plus size={18} /> Nouvelle Classe
                                </button>
                            )}
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher une classe..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all dark:text-white text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto p-1 custom-scrollbar">
                        {filteredClasses.map((cls: ClassData, index: number) => {
                            const studentCount = students.filter(s => s.grade === cls.name).length;
                            const fillPercentage = (studentCount / cls.capacity) * 100;
                            const theme = PASTEL_PALETTE[index % PASTEL_PALETTE.length];

                            return (
                                <div
                                    key={cls.id}
                                    onClick={() => handleClassClick(cls)}
                                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-6 hover:shadow-md transition-all cursor-pointer group relative ${theme.border}`}
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors truncate">{cls.name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 mt-1 inline-block`}>{cls.level}</span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* Action Buttons - Inside Card Flow */}
                                            <button
                                                onClick={(e) => handleOpenEditClass(cls, e)}
                                                className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-gray-200 dark:border-gray-600 hover:border-blue-300 shadow-sm transition-colors z-20"
                                                title="Modifier"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            {currentUserRole === 'ADMIN_GENERALE' && (
                                                <button
                                                    onClick={(e) => handleDeleteClassClick(cls.id, e)}
                                                    className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 border border-gray-200 dark:border-gray-600 hover:border-red-300 shadow-sm transition-colors z-20"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${theme.bg} ${theme.text}`}>
                                                <BookOpen size={20} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Salle & Prof */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400 uppercase font-bold mb-0.5">Salle</span>
                                                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    <MapPin size={14} className="text-gray-400" />
                                                    <span className="truncate">{cls.room}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400 uppercase font-bold mb-0.5">Professeur</span>
                                                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    <GraduationCap size={14} className="text-gray-400" />
                                                    <span className="truncate">{getTeacherName(cls.teacherId).split(' ').pop()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-200/60 dark:border-gray-700 pt-3">
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <span className="text-xs text-gray-400 uppercase font-bold block mb-0.5">Effectif</span>
                                                    <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-white">
                                                        <Users size={14} className="text-gray-400" />
                                                        {studentCount} / {cls.capacity}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-sm font-bold ${fillPercentage >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {Math.round(fillPercentage)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${fillPercentage >= 100 ? 'bg-red-500' : fillPercentage >= 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                                                    style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* CLASS MODAL (ADD/EDIT) */}
                </>
            ) : (
                <div className="flex flex-col h-full">
                    {/* DETAILED VIEW HEADER */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 shrink-0 mb-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleBack}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{currentClass.name}</h2>
                                    <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium border border-blue-200 dark:border-blue-800">
                                        {currentClass.level}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1.5">
                                        <Users size={16} /> {currentClassStudentCount} élèves
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <GraduationCap size={16} /> {getTeacherName(currentClass.teacherId)}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <MapPin size={16} /> {currentClass.room}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={(e) => handleOpenEditClass(currentClass, e)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm font-medium"
                            >
                                <Edit2 size={18} className="text-blue-600" />
                                <span>Modifier</span>
                            </button>
                            <button
                                onClick={(e) => handleDeleteClassClick(currentClass.id, e)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors shadow-sm font-medium"
                            >
                                <Trash2 size={18} />
                                <span>Supprimer</span>
                            </button>
                        </div>
                    </div>

                    {/* TABS NAVIGATION */}
                    <div className="flex gap-1 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl mb-6 w-fit">
                        {[
                            { id: 'info', label: 'Vue d\'ensemble', icon: BarChart2 },
                            { id: 'eleves', label: 'Élèves', icon: Users },
                            { id: 'matieres', label: 'Matières', icon: Book },
                            { id: 'emploi', label: 'Emploi du temps', icon: Calendar },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${activeTab === tab.id
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}
                        `}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* TAB CONTENT PLACEHOLDER */}
                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-6 overflow-y-auto custom-scrollbar">
                        {activeTab === 'matieres' ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Liste des matières</h3>
                                    <button
                                        onClick={handleOpenAddSubject}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm shadow-blue-500/30"
                                    >
                                        <Plus size={18} /> Ajouter une matière
                                    </button>
                                </div>

                                {currentClassSubjects && currentClassSubjects.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {currentClassSubjects.map((subject: Subject) => (
                                            <div key={subject.id} className="p-4 border border-slate-200/60 dark:border-gray-700 rounded-xl hover:shadow-md transition-all bg-white dark:bg-gray-800 group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-gray-800 dark:text-white text-lg">{subject.name}</h4>
                                                    <div className="flex gap-1">
                                                        {!(currentClass.name.toLowerCase().includes('ce1') || currentClass.name.toLowerCase().includes('ce2')) && (
                                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md text-xs font-bold border border-gray-200 dark:border-gray-600">
                                                                Coef. {subject.coef}
                                                            </span>
                                                        )}
                                                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-xs font-bold border border-blue-100 dark:border-blue-800">
                                                            sur {subject.maxGrade ?? getDefaultMaxGrade(currentClass.name, subject.name)}
                                                        </span>
                                                        <button
                                                            onClick={() => handleOpenEditSubject(subject)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSubjectClick(subject.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                    <User size={14} />
                                                    <span>{subject.teacher}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                        <BookOpen size={48} className="mb-4 opacity-20" />
                                        <p className="font-medium">Aucune matière configurée</p>
                                        <p className="text-sm mt-1">Commencez par ajouter une matière à cette classe.</p>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'eleves' ? (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
                                <div className="p-4 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800">
                                    <span className="text-sm font-bold text-gray-750 dark:text-gray-300">
                                        Effectif : {academicData?.studentsWithGrades.length} élèves
                                    </span>
                                    <select 
                                        className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-800 dark:text-white cursor-pointer outline-none focus:ring-2 focus:ring-primary/50"
                                        value={classStudentsSortOrder} 
                                        onChange={(e) => setClassStudentsSortOrder(e.target.value as 'alpha' | 'recent')}
                                    >
                                        <option value="alpha">Trier : Nom (A-Z)</option>
                                        <option value="recent">Trier : Plus récent</option>
                                    </select>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[600px] whitespace-nowrap">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-slate-200/60 dark:border-gray-700">
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Élève</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Âge</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    {currentClass && isPreschoolClass(currentClass.name) ? 'Acquisition' : 'Moyenne'}
                                                </th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {academicData?.studentsWithGrades.map((student: any) => (
                                                <tr
                                                    key={student.id}
                                                    onClick={() => handleOpenGrades(student)}
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm">
                                                                {student.firstName[0]}{student.lastName[0]}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                                    {student.firstName} {student.lastName}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {student.age ? `${student.age} ans` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className="font-bold text-gray-900 dark:text-white">
                                                            {currentClass && isPreschoolClass(currentClass.name)
                                                                ? `${Math.round(student.average * 100)}%`
                                                                : student.average.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                            currentClass && isPreschoolClass(currentClass.name)
                                                                ? (student.average >= 0.5
                                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300')
                                                                : (student.average >= 10
                                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300')
                                                            }`}>
                                                            {currentClass && isPreschoolClass(currentClass.name)
                                                                ? (student.average >= 0.5 ? 'Favorable' : 'À renforcer')
                                                                : (student.average >= 10 ? 'Admis' : 'En difficulté')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : activeTab === 'emploi' ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Calendrier hebdomadaire</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Glissez-déposez une matière ci-dessous dans un jour pour l'ajouter</p>
                                    </div>
                                    <button
                                        onClick={handleOpenAddSlot}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm shadow-blue-500/30"
                                    >
                                        <Plus size={18} /> Ajouter un créneau
                                    </button>
                                </div>

                                {/* Draggable Subjects Bar */}
                                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-slate-200/60 dark:border-gray-700 space-y-3">
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Matières disponibles :</p>
                                    <div className="flex flex-wrap gap-2">
                                        {currentClass.subjects && currentClass.subjects.length > 0 ? (
                                            currentClass.subjects.map(subject => (
                                                <div
                                                    key={subject.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('text/plain', `subject:${subject.name}`);
                                                        e.dataTransfer.effectAllowed = 'copy';
                                                    }}
                                                    className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm select-none"
                                                >
                                                    {subject.name}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">Aucune matière configurée pour cette classe. Ajoutez des matières dans l'onglet précédent pour les planifier.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {WEEK_DAYS.map(day => {
                                        const daySlots = currentClass.schedule
                                            ? currentClass.schedule
                                                .filter((s: ScheduleSlot) => s.day === day)
                                                .sort((a: ScheduleSlot, b: ScheduleSlot) => a.startTime.localeCompare(b.startTime))
                                            : [];

                                        return (
                                            <div 
                                                key={day} 
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = 'copy';
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    const dragData = e.dataTransfer.getData('text/plain');
                                                    if (!dragData) return;

                                                    if (dragData.startsWith('slot:')) {
                                                        const sourceSlotId = dragData.substring(5);
                                                        // Move slot to new day
                                                        if (currentClass) {
                                                            const updatedSchedule = currentClass.schedule.map(s => 
                                                                s.id === sourceSlotId ? { ...s, day } : s
                                                            );
                                                            const updatedClass = { ...currentClass, schedule: updatedSchedule };
                                                            setClasses(prev => prev.map(c => c.id === currentClass.id ? updatedClass : c));
                                                            setSelectedClass(updatedClass);
                                                            addNotification('success', `Cours déplacé au ${day}.`);
                                                        }
                                                    } else {
                                                        // It's a subject
                                                        const subjectName = dragData.startsWith('subject:') ? dragData.substring(8) : dragData;
                                                        setScheduleForm({
                                                            day,
                                                            startTime: '08:00',
                                                            endTime: '10:00',
                                                            subject: subjectName,
                                                            type: 'Cours'
                                                        });
                                                        setIsScheduleModalOpen(true);
                                                    }
                                                }}
                                                className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 flex flex-col h-full hover:border-blue-500/50 hover:shadow-md transition-all"
                                            >
                                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-slate-200/60 dark:border-gray-700 text-center font-bold text-gray-800 dark:text-white">
                                                    {day}
                                                </div>
                                                <div className="p-3 space-y-2 flex-1 min-h-[180px]">
                                                    {daySlots.length > 0 ? (
                                                        daySlots.map((slot: ScheduleSlot) => (
                                                            <div 
                                                                key={slot.id} 
                                                                draggable
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.setData('text/plain', `slot:${slot.id}`);
                                                                    e.dataTransfer.effectAllowed = 'move';
                                                                }}
                                                                className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-sm relative group/slot cursor-grab active:cursor-grabbing hover:border-blue-400 dark:hover:border-blue-800 transition-colors select-none"
                                                            >
                                                                <div className="font-bold text-blue-800 dark:text-blue-300">{slot.subject}</div>
                                                                <div className="text-gray-500 dark:text-gray-400 text-xs flex justify-between mt-1.5">
                                                                    <span>{slot.startTime} - {slot.endTime}</span>
                                                                    <span className="uppercase text-[9px] font-bold bg-white dark:bg-gray-800 px-1 rounded border border-blue-100 dark:border-blue-800">{slot.type}</span>
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleDeleteSlot(slot.id)}
                                                                    className="absolute top-1.5 right-1.5 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded opacity-0 group-hover/slot:opacity-100 transition-opacity"
                                                                    title="Supprimer"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                                                            Aucun cours
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : activeTab === 'info' ? (
                            <div className="space-y-6">
                                {/* STATS GRID */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {/* Card 1: Moyenne de classe */}
                                    <div className="card-premium-pattern card-premium-blue p-6 rounded-xl flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-sm font-bold opacity-80">
                                                    {currentClass && isPreschoolClass(currentClass.name) ? "Taux d'acquisition moyen" : "Moyenne de classe"}
                                                </span>
                                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl"><TrendingUp size={20} /></div>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight">
                                                {currentClass && isPreschoolClass(currentClass.name)
                                                    ? `${Math.round(parseFloat(academicData?.classAverage || '0') * 100)}%`
                                                    : academicData?.classAverage}
                                            </div>
                                        </div>
                                        <div className="text-xs opacity-70 mt-2">
                                            {currentClass && isPreschoolClass(currentClass.name) ? "Base 100%" : "Moyenne sur 20"}
                                        </div>
                                    </div>

                                    {/* Card 2: Taux de réussite */}
                                    <div className="card-premium-pattern card-premium-green p-6 rounded-xl flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-sm font-bold opacity-80">
                                                    {currentClass && isPreschoolClass(currentClass.name) ? "Taux d'acquisition global" : "Taux de réussite"}
                                                </span>
                                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl"><Award size={20} /></div>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight">
                                                {academicData?.successRate}%
                                            </div>
                                        </div>
                                        <div className="text-xs opacity-70 mt-2">
                                            {currentClass && isPreschoolClass(currentClass.name) ? "Acquisition ≥ 50%" : "Moyenne ≥ 10/20"}
                                        </div>
                                    </div>

                                    {/* Card 3: Élèves évalués */}
                                    <div className="card-premium-pattern card-premium-indigo p-6 rounded-xl flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-sm font-bold opacity-80">Élèves évalués</span>
                                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl"><Users size={20} /></div>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight">
                                                {academicData?.evaluatedCount}/{academicData?.totalStudents}
                                            </div>
                                        </div>
                                        <div className="text-xs opacity-70 mt-2">
                                            Sur l'effectif de la classe
                                        </div>
                                    </div>

                                    {/* Card 4: Excellents élèves */}
                                    <div className="card-premium-pattern card-premium-cyan p-6 rounded-xl flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-sm font-bold opacity-80">
                                                    {currentClass && isPreschoolClass(currentClass.name) ? "Acquis sur 100%" : "Excellents élèves"}
                                                </span>
                                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl"><Award size={20} /></div>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight">
                                                {academicData?.excellentCount}
                                            </div>
                                        </div>
                                        <div className="text-xs opacity-70 mt-2">
                                            {currentClass && isPreschoolClass(currentClass.name) ? "Toutes notions acquises" : "Moyenne ≥ 16/20"}
                                        </div>
                                    </div>

                                    {/* Card 5: En difficulté */}
                                    <div className="card-premium-pattern card-premium-rose p-6 rounded-xl flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-sm font-bold opacity-80">
                                                    {currentClass && isPreschoolClass(currentClass.name) ? "À renforcer" : "En difficulté"}
                                                </span>
                                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl"><AlertCircle size={20} /></div>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight">
                                                {academicData?.atRisk.length}
                                            </div>
                                        </div>
                                        <div className="text-xs opacity-70 mt-2">
                                            {currentClass && isPreschoolClass(currentClass.name) ? "< 50% acquis" : "Moyenne < 10/20"}
                                        </div>
                                    </div>

                                    {/* Card 6: Meilleure moyenne */}
                                    <div className="card-premium-pattern card-premium-purple p-6 rounded-xl flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-sm font-bold opacity-80">
                                                    {currentClass && isPreschoolClass(currentClass.name) ? "Meilleur score" : "Meilleure moyenne"}
                                                </span>
                                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl"><TrendingUp size={20} /></div>
                                            </div>
                                            <div className="text-3xl font-bold tracking-tight">
                                                {currentClass && isPreschoolClass(currentClass.name)
                                                    ? `${Math.round((academicData?.bestStudent?.average || 0) * 100)}%`
                                                    : (academicData?.bestStudent ? academicData.bestStudent.average.toFixed(2) : '0.00')}
                                            </div>
                                        </div>
                                        <div className="text-xs opacity-70 mt-2">
                                            {currentClass && isPreschoolClass(currentClass.name) ? "Score maximal" : "Plus haute moyenne"}
                                        </div>
                                    </div>
                                </div>

                                {/* NEXT COURSE & INFO */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Next Course Widget */}
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700">
                                        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                            <Clock size={20} className="text-blue-600" /> Prochain cours
                                        </h3>
                                        {(() => {
                                            // Simple logic to find next course (mocked for demo as "Lundi 08:00" or just first slot)
                                            // In a real app, compare with current Date
                                            const today = WEEK_DAYS[0]; // Mocking 'Lundi'
                                            const nextSlot = currentClass.schedule.find((s: ScheduleSlot) => s.day === today);

                                            if (nextSlot) {
                                                const color = getSubjectColor(nextSlot.subject);
                                                return (
                                                    <div className={`p-4 rounded-xl border ${color.bg} ${color.border} flex justify-between items-center`}>
                                                        <div>
                                                            <div className={`font-bold text-lg ${color.text}`}>{nextSlot.subject}</div>
                                                            <div className="text-gray-600 dark:text-gray-300 text-sm mt-1 flex items-center gap-2">
                                                                <Clock size={14} /> {nextSlot.startTime} - {nextSlot.endTime}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{nextSlot.day}</div>
                                                            <div className={`inline-block px-2 py-1 rounded text-xs font-bold bg-white/50 dark:bg-black/20 ${color.text}`}>
                                                                {nextSlot.type}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-slate-200/60 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 italic">
                                                        Aucun cours prévu aujourd'hui
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>

                                    {/* General Info Widget */}
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700">
                                        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                            <BookOpen size={20} className="text-purple-600" /> Informations
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                                <span className="text-gray-500 dark:text-gray-400 text-sm">Professeur Principal</span>
                                                <span className="font-bold text-gray-800 dark:text-white">{getTeacherName(currentClass.teacherId)}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                                <span className="text-gray-500 dark:text-gray-400 text-sm">Salle de classe</span>
                                                <span className="font-bold text-gray-800 dark:text-white">{currentClass.room}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                                <span className="text-gray-500 dark:text-gray-400 text-sm">Capacité</span>
                                                <span className="font-bold text-gray-800 dark:text-white">{currentClass.capacity} élèves</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <p>Contenu de l'onglet {activeTab} pour {currentClass.name}</p>
                            </div>
                        )}
                    </div>
                </div >
            )}
            {
                isClassModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200/60 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in duration-200">
                            <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-xl">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    {editingClass ? <Edit2 size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />}
                                    {editingClass ? 'Modifier la classe' : 'Nouvelle classe'}
                                </h3>
                                <button onClick={() => setIsClassModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nom de la classe</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                            placeholder="Ex: 6ème A"
                                            value={classForm.name}
                                            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Niveau</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                            placeholder="Ex: 6ème"
                                            value={classForm.level}
                                            onChange={(e) => setClassForm({ ...classForm, level: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Professeur Principal</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={classForm.teacherId}
                                        onChange={(e) => setClassForm({ ...classForm, teacherId: e.target.value })}
                                    >
                                        <option value="">Non assigné</option>
                                        {staffList.filter(s => s.role === 'Enseignant').map(t => (
                                            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Salle</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                            placeholder="Ex: Salle 101"
                                            value={classForm.room}
                                            onChange={(e) => setClassForm({ ...classForm, room: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Capacité</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                            placeholder="30"
                                            value={classForm.capacity}
                                            onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Description</label>
                                    <textarea
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                        rows={3}
                                        placeholder="Description de la classe..."
                                        value={classForm.description}
                                        onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800 rounded-b-xl">
                                <button onClick={() => setIsClassModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all">Annuler</button>
                                <button onClick={handleSaveClass} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20">Enregistrer</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* DELETE CLASS CONFIRMATION MODAL */}
            {
                classToDelete && (
                    <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-200/60 dark:border-gray-700">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Supprimer la classe ?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Cette action est irréversible.</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setClassToDelete(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Annuler</button>
                                <button onClick={confirmDeleteClass} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Supprimer</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODALS... (PERFORMANCE, SUBJECT, DELETE) */}
            {/* ... existing modals ... */}

            {/* STUDENT PERFORMANCE MODAL */}
            {
                selectedStudentStats && (
                    <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl border border-slate-200/60 dark:border-gray-700 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg font-bold">
                                        {selectedStudentStats.student.firstName[0]}{selectedStudentStats.student.lastName[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                            {selectedStudentStats.student.lastName.toUpperCase()} {selectedStudentStats.student.firstName}
                                        </h2>
                                        <p className="text-sm text-gray-500">Performance Académique</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedStudentStats(null)} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={24} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">

                                {/* EVOLUTION GRAPH */}
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <TrendingUp size={18} className="text-blue-600" /> {currentClass && isPreschoolClass(currentClass.name) ? "Évolution des acquisitions" : "Évolution de la moyenne"}
                                    </h3>
                                    <div className="h-64 w-full bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-slate-200/60 dark:border-gray-700">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={selectedStudentStats.student.evolution}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF' }} />
                                                <YAxis 
                                                    domain={currentClass && isPreschoolClass(currentClass.name) ? [0, 1] : [0, 20]} 
                                                    tickFormatter={(v) => currentClass && isPreschoolClass(currentClass.name) ? `${Math.round(v * 100)}%` : v}
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: '#9CA3AF' }} 
                                                />
                                                <Tooltip 
                                                    formatter={(value: any) => currentClass && isPreschoolClass(currentClass.name) ? [`${Math.round(value * 100)}% Acquis`, 'Évaluation'] : [value, 'Moyenne']}
                                                    contentStyle={{ borderRadius: '8px', border: 'none' }} 
                                                />
                                                <Legend />
                                                <Line type="monotone" dataKey="value" name={currentClass && isPreschoolClass(currentClass.name) ? "Taux d'acquisition" : "Moyenne Élève"} stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* RADAR COMPARISON */}
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <BarChart2 size={18} className="text-purple-600" /> Comparaison Classe (Par Matière)
                                    </h3>
                                    <div className="h-72 w-full bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-slate-200/60 dark:border-gray-700">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={selectedStudentStats.subjects} layout="vertical" margin={{ left: 40, right: 40 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                                                <XAxis 
                                                    type="number" 
                                                    domain={currentClass && isPreschoolClass(currentClass.name) ? [0, 1] : [0, 20]} 
                                                    tickFormatter={(v) => currentClass && isPreschoolClass(currentClass.name) ? `${Math.round(v * 100)}%` : v}
                                                    hide 
                                                />
                                                <YAxis dataKey="subject" type="category" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                                <Tooltip 
                                                    formatter={(value: any) => currentClass && isPreschoolClass(currentClass.name) ? [`${Math.round(value * 100)}% Acquis`, 'Évaluation'] : [value, 'Moyenne']}
                                                    cursor={{ fill: 'transparent' }} 
                                                />
                                                <Legend />
                                                <Bar dataKey="student" name={currentClass && isPreschoolClass(currentClass.name) ? "Taux Élève" : "Élève"} fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={10} />
                                                <Bar dataKey="classAvg" name={currentClass && isPreschoolClass(currentClass.name) ? "Moyenne Classe (Taux)" : "Moyenne Classe"} fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={10} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* TEACHER COMMENTS */}
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <FileText size={18} className="text-orange-600" /> Observations
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedStudentStats.comments && selectedStudentStats.comments.length > 0 ? (
                                            selectedStudentStats.comments.map((com: any, i: number) => (
                                                <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 rounded-r-lg text-sm">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="font-bold text-gray-800 dark:text-white">{com.author}</span>
                                                        <span className="text-gray-500 text-xs">{com.date}</span>
                                                    </div>
                                                    <p className="text-gray-700 dark:text-gray-300">{com.text}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 text-gray-400 text-sm italic">
                                                Aucune observation saisie pour cet élève.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* DELETE SUBJECT CONFIRMATION MODAL */}
            {
                subjectToDelete && (
                    <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-200/60 dark:border-gray-700">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Supprimer la matière ?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Cette action est irréversible.</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setSubjectToDelete(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Annuler</button>
                                <button onClick={confirmDeleteSubject} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Supprimer</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* SUBJECT MODAL (ADD/EDIT) */}
            {
                isSubjectModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in duration-200">
                            <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-xl">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    {editingSubject ? <Edit2 size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />}
                                    {editingSubject ? 'Modifier Matière' : 'Nouvelle Matière'}
                                </h3>
                                <button onClick={() => setIsSubjectModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nom de la matière</label>
                                    <div className="relative mb-2">
                                        <select
                                            className="w-full appearance-none pl-3 pr-10 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-medium"
                                            value={PRIMARY_SUBJECTS.includes(subjectForm.name) ? subjectForm.name : ""}
                                            onChange={(e) => {
                                                if (e.target.value !== "") {
                                                    setSubjectForm({ ...subjectForm, name: e.target.value });
                                                }
                                            }}
                                        >
                                            <option value="">-- Sélectionner une matière type --</option>
                                            {PRIMARY_SUBJECTS.map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Ou saisissez un nom personnalisé..."
                                        value={subjectForm.name}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Coefficient</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="1"
                                        value={subjectForm.coef}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, coef: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Note maximale (sur)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder={currentClass ? getDefaultMaxGrade(currentClass.name, subjectForm.name).toString() : "20"}
                                        value={subjectForm.maxGrade}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, maxGrade: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Enseignant (Optionnel)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Ex: M. Dupont"
                                        value={subjectForm.teacher}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, teacher: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800 rounded-b-xl">
                                <button onClick={() => setIsSubjectModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all">Annuler</button>
                                <button onClick={handleSaveSubject} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20">Enregistrer</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* SCHEDULE MODAL (ADD SLOT) */}
            {
                isScheduleModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in duration-200">
                            <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-xl">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Plus size={18} className="text-blue-600" /> Ajouter un créneau
                                </h3>
                                <button onClick={() => setIsScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Jour</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={scheduleForm.day}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, day: e.target.value })}
                                    >
                                        {WEEK_DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Début</label>
                                        <input
                                            type="time"
                                            className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                            value={scheduleForm.startTime}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Fin</label>
                                        <input
                                            type="time"
                                            className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                            value={scheduleForm.endTime}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Matière</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={scheduleForm.subject}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, subject: e.target.value })}
                                    >
                                        {currentClass?.subjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Type</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={scheduleForm.type}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                                    >
                                        <option value="Cours">Cours</option>
                                        <option value="TP">TP</option>
                                        <option value="TD">TD</option>
                                        <option value="Sport">Sport</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200/60 dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800 rounded-b-xl">
                                <button onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all">Annuler</button>
                                <button onClick={handleSaveSlot} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20">Ajouter</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* GRADE MANAGEMENT MODAL */}
            {
                isGradeModalOpen && selectedStudentForGrades && (
                    <div className="fixed inset-0 bg-black/50 z-[90] flex justify-center items-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200/60 dark:border-gray-700 flex flex-col animate-in fade-in zoom-in duration-200 max-h-[90vh]">
                            <div className="p-5 border-b border-slate-200/60 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-xl">
                                <div>
                                    <h3 className="font-bold text-xl text-gray-800 dark:text-white">
                                        {isPreschool ? "Appréciations de" : "Notes de"} {selectedStudentForGrades.firstName} {selectedStudentForGrades.lastName}
                                    </h3>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {isPreschool ? "Taux d'acquisition global :" : "Moyenne générale :"} <span className="text-2xl font-bold text-blue-600 ml-2">
                                            {isPreschool 
                                                ? `${Math.round(getPreschoolAcquisitionRate(selectedStudentForGrades) * 100)}%`
                                                : getGlobalAverage(selectedStudentForGrades)}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setIsGradeModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleAddPeriod}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-bold text-sm"
                                    >
                                        <Plus size={16} /> {isPreschool ? "Ajouter un mois" : "Ajouter une composition"}
                                    </button>
                                </div>

                                {periods.map((trimester) => (
                                    <div key={trimester} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-lg text-gray-800 dark:text-white">{trimester}</h4>
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300">
                                                    {isPreschool 
                                                        ? `Acquisition: ${Math.round(getPreschoolAcquisitionRate(selectedStudentForGrades, trimester) * 100)}%`
                                                        : `Moyenne: ${getTrimesterAverage(selectedStudentForGrades, trimester)}`}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (activeAddGradeTrimester === trimester) {
                                                            setActiveAddGradeTrimester(null);
                                                        } else {
                                                            setActiveAddGradeTrimester(trimester);
                                                            setGradeForm(prev => ({ ...prev, trimester: trimester }));
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                                                >
                                                    <Plus size={14} /> Ajouter une note
                                                </button>
                                            </div>
                                        </div>

                                        {activeAddGradeTrimester === trimester && (
                                            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-slate-200/60 dark:border-gray-700 animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex gap-3 items-end">
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Matière</label>
                                                        <select
                                                            className="w-full p-2 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900"
                                                            value={gradeForm.subject}
                                                            onChange={(e) => setGradeForm({ ...gradeForm, subject: e.target.value })}
                                                        >
                                                            <option value="" className="text-gray-900 bg-white">Sélectionner...</option>
                                                            {currentClass?.subjects.map(sub => (
                                                                <option key={sub.id} value={sub.name} className="text-gray-900 bg-white">{sub.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className={isPreschool ? "w-36" : "w-24"}>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                                            {isPreschool ? "Évaluation" : `Note /${currentClassSubjects.find(s => s.name === gradeForm.subject)?.maxGrade ?? getDefaultMaxGrade(currentClass?.name || '', gradeForm.subject)}`}
                                                        </label>
                                                        {isPreschool ? (
                                                            <select
                                                                className="w-full p-2 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900"
                                                                value={gradeForm.value}
                                                                onChange={(e) => setGradeForm({ ...gradeForm, value: e.target.value })}
                                                            >
                                                                <option value="" className="text-gray-900 bg-white">Choisir...</option>
                                                                <option value="1" className="text-gray-900 bg-white">Acquis</option>
                                                                <option value="0.5" className="text-gray-900 bg-white">En cours d'acquisition</option>
                                                                <option value="0" className="text-gray-900 bg-white">Non acquis</option>
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                className="w-full p-2 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                                                                placeholder="15"
                                                                value={gradeForm.value}
                                                                onChange={(e) => setGradeForm({ ...gradeForm, value: e.target.value })}
                                                            />
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={handleSaveGrade}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-sm"
                                                    >
                                                        OK
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {selectedStudentForGrades.grades && selectedStudentForGrades.grades.filter(g => g.trimester === trimester).length > 0 ? (
                                                selectedStudentForGrades.grades
                                                    .filter(g => g.trimester === trimester)
                                                    .map(grade => (
                                                        <div key={grade.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-700 rounded-lg group hover:border-blue-200 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                {isPreschool ? (
                                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                                        grade.value === 1 
                                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30" 
                                                                            : grade.value === 0.5
                                                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30"
                                                                                : "bg-red-100 text-red-700 dark:bg-red-900/30"
                                                                    }`}>
                                                                        {grade.value === 1 ? "Acquis" : grade.value === 0.5 ? "En cours d'acquisition" : "Non acquis"}
                                                                    </span>
                                                                ) : (
                                                                    <div className="flex items-baseline gap-0.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                                        <span className="font-black text-blue-600 dark:text-blue-400 text-sm">{grade.value}</span>
                                                                        <span className="text-[10px] font-bold text-blue-400 dark:text-blue-500">/{grade.maxGrade ?? getDefaultMaxGrade(currentClass?.name || '', grade.subject)}</span>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="font-bold text-gray-800 dark:text-white text-sm">{grade.subject}</div>
                                                                    <div className="text-xs text-gray-400">{grade.date}</div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteGrade(grade.id)}
                                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))
                                            ) : (
                                                <div className="text-center py-6 text-gray-400 text-sm italic">
                                                    Aucune note pour ce mois
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>
                    </div>
                )
            }

            {/* BUG-018 FIX: Inline modal to replace window.prompt() for adding periods */}
            {showAddPeriodModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowAddPeriodModal(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            {isPreschool ? 'Ajouter un mois' : 'Ajouter une composition'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isPreschool ? 'Entrez le nom du mois (ex: Septembre)' : 'Entrez le nom de la composition (ex: Composition École 4)'}
                        </p>
                        <input
                            type="text"
                            value={addPeriodValue}
                            onChange={e => setAddPeriodValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleConfirmAddPeriod(); if (e.key === 'Escape') setShowAddPeriodModal(false); }}
                            placeholder={isPreschool ? 'Septembre' : 'Composition École 4'}
                            autoFocus
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowAddPeriodModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                Annuler
                            </button>
                            <button onClick={handleConfirmAddPeriod} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                                Ajouter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};



export default Classes;
