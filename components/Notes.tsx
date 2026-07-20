import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  BookOpen, Plus, ChevronRight, Users, BarChart2, FileText,
  Lock, Unlock, Trash2, ChevronDown, Award, TrendingUp,
  Printer, ArrowLeft, Eye, Edit3, Check, X, AlertCircle,
  GraduationCap, ClipboardList, Star, Search
} from 'lucide-react';
import {
  ClassGroup, Student, EvaluationSession, StudentEvaluationEntry,
  SubjectGrade, AcademicSubject, SchoolLevelCategory, EvaluationType,
  AttendanceStatus, PrescolaireAppréciation, ComplementaryAppréciation,
  ActivityLog, NotificationType
} from '../types';
import {
  CLASS_LEVEL_MAP, AVAILABLE_EVAL_TYPES, EVAL_TYPE_LABELS,
  getSubjectsForEval, AVERAGE_CONFIG, COMPLEMENTARY_APPRECIATIONS,
  PRESCOLAIRE_APPRECIATIONS
} from '../constants';
import {
  getLevelForClass, computeSessionResults, formatAverage, formatRank,
  generateSessionId
} from '../services/academicEngine';

// ─────────────────────────────────────────────────────────────
// TYPES LOCAUX
// ─────────────────────────────────────────────────────────────
interface NotesProps {
  classes: ClassGroup[];
  students: Student[];
  evaluationSessions: EvaluationSession[];
  setEvaluationSessions: (sessions: EvaluationSession[] | ((prev: EvaluationSession[]) => EvaluationSession[])) => void;
  addNotification: (type: NotificationType, message: string) => void;
  schoolName: string;
  schoolLogo: string;
  schoolYear: string;
  addLog: (action: string, details: string, module: ActivityLog['module'], type?: ActivityLog['type']) => void;
}

type NotesView = 'LIST' | 'ENTRY' | 'RESULTS' | 'BULLETIN';

// ─────────────────────────────────────────────────────────────
// COULEURS NIVEAU
// ─────────────────────────────────────────────────────────────
const LEVEL_COLORS: Record<SchoolLevelCategory, { bg: string; text: string; border: string; badge: string }> = {
  PRESCOLAIRE: { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  CP:          { bg: 'bg-blue-50 dark:bg-blue-950/30',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-800',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'    },
  CE:          { bg: 'bg-teal-50 dark:bg-teal-950/30',    text: 'text-teal-700 dark:text-teal-300',    border: 'border-teal-200 dark:border-teal-800',    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'    },
  CM1:         { bg: 'bg-amber-50 dark:bg-amber-950/30',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-800',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  CM2:         { bg: 'bg-rose-50 dark:bg-rose-950/30',    text: 'text-rose-700 dark:text-rose-300',    border: 'border-rose-200 dark:border-rose-800',    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'    },
};

// ─────────────────────────────────────────────────────────────
// BADGE NIVEAU
// ─────────────────────────────────────────────────────────────
const LevelBadge: React.FC<{ level: SchoolLevelCategory; evalType: EvaluationType }> = ({ level, evalType }) => {
  const colors = LEVEL_COLORS[level];
  const labels: Record<SchoolLevelCategory, string> = { PRESCOLAIRE: 'Préscolaire', CP: 'CP', CE: 'CE', CM1: 'CM1', CM2: 'CM2' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.badge}`}>
      {labels[level]} • {EVAL_TYPE_LABELS[evalType]}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// BADGE APPRÉCIATION (couleur selon score)
// ─────────────────────────────────────────────────────────────
function getAppreciationColor(avg: number | null | undefined, scale: number): string {
  if (avg === null || avg === undefined) return 'text-slate-400 dark:text-zinc-500';
  const pct = avg / scale;
  if (pct < 0.5)  return 'text-red-600 dark:text-red-400';
  if (pct < 0.7)  return 'text-orange-600 dark:text-orange-400';
  if (pct < 0.8)  return 'text-yellow-600 dark:text-yellow-400';
  if (pct < 0.9)  return 'text-blue-600 dark:text-blue-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function getAverageBg(avg: number | null | undefined, scale: number): string {
  if (avg === null || avg === undefined) return 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400';
  const pct = avg / scale;
  if (pct < 0.5)  return 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300';
  if (pct < 0.7)  return 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300';
  if (pct < 0.8)  return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300';
  if (pct < 0.9)  return 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300';
  return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';
}

function getAveragePremiumBg(avg: number | null | undefined, scale: number): string {
  if (avg === null || avg === undefined) return 'card-premium-pattern card-premium-indigo';
  const pct = avg / scale;
  if (pct < 0.5)  return 'card-premium-pattern card-premium-rose';
  if (pct < 0.7)  return 'card-premium-pattern card-premium-orange';
  if (pct < 0.9)  return 'card-premium-pattern card-premium-blue';
  return 'card-premium-pattern card-premium-green';
}

// ─────────────────────────────────────────────────────────────
// MODAL CRÉATION DE SESSION
// ─────────────────────────────────────────────────────────────
interface CreateSessionModalProps {
  classes: ClassGroup[];
  existingSessions: EvaluationSession[];
  schoolYear: string;
  onClose: () => void;
  onCreate: (session: EvaluationSession) => void;
}

const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ classes, existingSessions, schoolYear, onClose, onCreate }) => {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedEvalType, setSelectedEvalType] = useState<EvaluationType | ''>('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const level: SchoolLevelCategory | null = selectedClass ? getLevelForClass(selectedClass.name) : null;
  const availableTypes = level ? AVAILABLE_EVAL_TYPES[level] : [];

  // Numéro de session automatique
  const nextSessionNumber = useMemo(() => {
    if (!selectedClassId || !selectedEvalType) return 1;
    const existing = existingSessions.filter(
      s => s.classId === selectedClassId && s.evaluationType === selectedEvalType
    );
    return existing.length + 1;
  }, [selectedClassId, selectedEvalType, existingSessions]);

  const sessionLabel = useMemo(() => {
    if (!selectedEvalType) return '';
    return `${EVAL_TYPE_LABELS[selectedEvalType as EvaluationType]} ${nextSessionNumber}`;
  }, [selectedEvalType, nextSessionNumber]);

  const handleCreate = () => {
    if (!selectedClassId || !selectedEvalType || !level || !selectedClass) return;
    const subjects = getSubjectsForEval(level, selectedEvalType as EvaluationType);
    const session: EvaluationSession = {
      id: generateSessionId(selectedClassId, selectedEvalType as EvaluationType, nextSessionNumber),
      classId: selectedClassId,
      className: selectedClass.name,
      levelCategory: level,
      evaluationType: selectedEvalType as EvaluationType,
      sessionNumber: nextSessionNumber,
      label: sessionLabel,
      schoolYear,
      date: sessionDate,
      subjects,
      entries: [],
      isLocked: false,
    };
    onCreate(session);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-zinc-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
              <Plus size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Nouvelle session d'évaluation</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Année {schoolYear}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Classe */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">Classe</label>
            <select
              value={selectedClassId}
              onChange={e => { setSelectedClassId(e.target.value); setSelectedEvalType(''); }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Choisir une classe…</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.studentCount} élèves)</option>
              ))}
            </select>
          </div>

          {/* Niveau détecté */}
          {level && (
            <div className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 ${LEVEL_COLORS[level].bg} ${LEVEL_COLORS[level].border} ${LEVEL_COLORS[level].text}`}>
              <GraduationCap size={14} />
              Niveau détecté : <strong>{level === 'PRESCOLAIRE' ? 'Préscolaire' : level}</strong>
            </div>
          )}

          {/* Type d'évaluation */}
          {level && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">Type d'évaluation</label>
              <div className="grid grid-cols-1 gap-2">
                {availableTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedEvalType(type)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-semibold text-left transition-all cursor-pointer ${
                      selectedEvalType === type
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    {EVAL_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Numéro & libellé auto */}
          {selectedEvalType && (
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3 border border-slate-100 dark:border-zinc-800">
              <p className="text-xs text-slate-500 dark:text-zinc-400">Session créée</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{sessionLabel}</p>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">Date de l'évaluation</label>
            <input
              type="date"
              value={sessionDate}
              onChange={e => setSessionDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer">
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedClassId || !selectedEvalType}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-blue-500/20"
          >
            Créer la session
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VUE LISTE DES SESSIONS
// ─────────────────────────────────────────────────────────────
interface SessionListProps {
  sessions: EvaluationSession[];
  classes: ClassGroup[];
  onNew: () => void;
  onOpen: (session: EvaluationSession) => void;
  onDelete: (id: string) => void;
  onResults: (session: EvaluationSession) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const SessionList: React.FC<SessionListProps> = ({ sessions, classes, onNew, onOpen, onDelete, onResults, searchQuery, setSearchQuery }) => {
  const filtered = sessions.filter(s =>
    s.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouper par classe
  const grouped = filtered.reduce((acc, s) => {
    if (!acc[s.className]) acc[s.className] = [];
    acc[s.className].push(s);
    return acc;
  }, {} as Record<string, EvaluationSession[]>);

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={onNew}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          Nouvelle session
        </button>
        <div className="relative w-full sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une session ou une classe…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Résumé stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['PRESCOLAIRE', 'CP', 'CE', 'CM1', 'CM2'] as SchoolLevelCategory[]).map(level => {
          const count = sessions.filter(s => s.levelCategory === level).length;
          if (count === 0) return null;
          const colors = LEVEL_COLORS[level];
          const labels: Record<SchoolLevelCategory, string> = { PRESCOLAIRE: 'Préscolaire', CP: 'CP', CE: 'CE', CM1: 'CM1', CM2: 'CM2' };
          return (
            <div key={level} className={`p-3 rounded-xl border ${colors.bg} ${colors.border} flex items-center gap-3`}>
              <div className={`text-2xl font-black ${colors.text}`}>{count}</div>
              <div>
                <p className={`text-xs font-bold ${colors.text}`}>{labels[level]}</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500">session{count > 1 ? 's' : ''}</p>
              </div>
            </div>
          );
        }).filter(Boolean)}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
            <BookOpen size={32} className="text-slate-400 dark:text-zinc-500" />
          </div>
          <p className="text-base font-bold text-slate-700 dark:text-zinc-300">Aucune session d'évaluation</p>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1 mb-4">Créez votre première session pour commencer la saisie des notes.</p>
          <button onClick={onNew} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
            <Plus size={16} />Créer une session
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-zinc-500">
          <Search size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucun résultat pour « {searchQuery} »</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(grouped) as [string, EvaluationSession[]][]).map(([className, classSessions]) => {
            const level = getLevelForClass(className);
            const colors = level ? LEVEL_COLORS[level] : LEVEL_COLORS.CP;
            return (
              <div key={className}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${colors.bg} ${colors.border} border mb-3`}>
                  <GraduationCap size={15} className={colors.text} />
                  <span className={`text-sm font-bold ${colors.text}`}>{className}</span>
                  <span className={`ml-auto text-[10px] font-bold ${colors.text} opacity-60`}>{classSessions.length} session{classSessions.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2 pl-2">
                  {classSessions.sort((a, b) => b.date.localeCompare(a.date)).map(session => {
                    const completedEntries = session.entries.filter(e => e.average !== undefined).length;
                    const totalStudents = session.entries.length;
                    return (
                      <div key={session.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 p-4 flex items-center gap-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{session.label}</p>
                            <LevelBadge level={session.levelCategory} evalType={session.evaluationType} />
                            {session.isLocked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                                <Lock size={9} />Verrouillée
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500 dark:text-zinc-400">
                              {new Date(session.date).toLocaleDateString('fr-CI', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                            {totalStudents > 0 && (
                              <span className="text-xs text-slate-400 dark:text-zinc-500">
                                {completedEntries}/{totalStudents} élèves notés
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onResults(session)}
                            title="Voir les résultats"
                            className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all cursor-pointer"
                          >
                            <BarChart2 size={16} />
                          </button>
                          <button
                            onClick={() => onOpen(session)}
                            title="Saisir les notes"
                            className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => onDelete(session.id)}
                            title="Supprimer"
                            className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                          <ChevronRight size={16} className="text-slate-400 dark:text-zinc-600 group-hover:translate-x-0.5 group-hover:text-blue-600 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VUE SAISIE DES NOTES
// ─────────────────────────────────────────────────────────────
interface NoteEntryViewProps {
  session: EvaluationSession;
  students: Student[];
  onSave: (session: EvaluationSession) => void;
  onBack: () => void;
  onViewResults: () => void;
  addNotification: (type: NotificationType, message: string) => void;
}

const NoteEntryView: React.FC<NoteEntryViewProps> = ({ session, students, onSave, onBack, onViewResults, addNotification }) => {
  const isPrescolaire = session.levelCategory === 'PRESCOLAIRE';
  const scale = AVERAGE_CONFIG[session.levelCategory].scale;
  const mainSubjects = session.subjects.filter(s => !s.isComplementary);
  const compSubjects  = session.subjects.filter(s => s.isComplementary);

  // Initialiser les entrées si vide
  const initEntries = useCallback((): StudentEvaluationEntry[] => {
    const classStudents = students.filter(s => s.grade === session.className && s.status === 'Actif');
    if (session.entries.length > 0) {
      // Merge : ajouter de nouveaux élèves s'il y en a
      const existing = new Set(session.entries.map(e => e.studentId));
      const newStudents = classStudents.filter(s => !existing.has(s.id));
      return [
        ...session.entries,
        ...newStudents.map(s => ({
          studentId: s.id,
          studentName: `${s.lastName} ${s.firstName}`,
          attendance: 'Présent' as AttendanceStatus,
          grades: session.subjects.map(sub => ({ subjectId: sub.id, score: null })),
        })),
      ];
    }
    return classStudents.map(s => ({
      studentId: s.id,
      studentName: `${s.lastName} ${s.firstName}`,
      attendance: 'Présent' as AttendanceStatus,
      grades: session.subjects.map(sub => ({ subjectId: sub.id, score: null })),
    }));
  }, [students, session]);

  const [entries, setEntries] = useState<StudentEvaluationEntry[]>(initEntries);
  const [locked, setLocked] = useState(session.isLocked);
  const [hasChanges, setHasChanges] = useState(false);

  const updateAttendance = (studentId: string, status: AttendanceStatus) => {
    setEntries(prev => prev.map(e => e.studentId === studentId ? { ...e, attendance: status } : e));
    setHasChanges(true);
  };

  const updateGrade = (studentId: string, subjectId: string, value: string | number | null) => {
    setEntries(prev => prev.map(e => {
      if (e.studentId !== studentId) return e;
      const newGrades = e.grades.map(g => {
        if (g.subjectId !== subjectId) return g;
        return { ...g, score: typeof value === 'number' ? value : null };
      });
      return { ...e, grades: newGrades };
    }));
    setHasChanges(true);
  };

  const updatePrescolaireGrade = (studentId: string, subjectId: string, appr: PrescolaireAppréciation) => {
    setEntries(prev => prev.map(e => {
      if (e.studentId !== studentId) return e;
      const newGrades = e.grades.map(g => {
        if (g.subjectId !== subjectId) return g;
        return { ...g, prescolaireAppréciation: appr, score: null };
      });
      return { ...e, grades: newGrades };
    }));
    setHasChanges(true);
  };

  const updateCompGrade = (studentId: string, subjectId: string, appr: ComplementaryAppréciation) => {
    setEntries(prev => prev.map(e => {
      if (e.studentId !== studentId) return e;
      const newGrades = e.grades.map(g => {
        if (g.subjectId !== subjectId) return g;
        return { ...g, complementaryAppréciation: appr, score: null };
      });
      return { ...e, grades: newGrades };
    }));
    setHasChanges(true);
  };

  const handleSave = (lock = false) => {
    if (lock) {
      const missingGrades = entries.some(entry => {
        if (entry.attendance !== 'Présent') return false;
        return mainSubjects.some(sub => {
          const g = entry.grades.find(grade => grade.subjectId === sub.id);
          if (isPrescolaire) {
            return !g?.prescolaireAppréciation;
          } else {
            return g?.score === null || g?.score === undefined;
          }
        });
      });

      if (missingGrades) {
        addNotification('error', "Impossible de valider et clôturer : certaines notes sont manquantes pour des élèves présents.");
        return;
      }
    }

    const computed = computeSessionResults(entries, session.subjects, session.levelCategory, session.evaluationType);
    const updated: EvaluationSession = { ...session, entries: computed, isLocked: lock };
    onSave(updated);
    setLocked(lock);
    setHasChanges(false);
  };

  const colors = LEVEL_COLORS[session.levelCategory];

  // Live average for one student
  const getLiveAverage = (entry: StudentEvaluationEntry): number | null => {
    if (entry.attendance === 'Absent') return null;
    let total = 0;
    for (const sub of mainSubjects) {
      const g = entry.grades.find(g => g.subjectId === sub.id);
      if (!g) continue;
      if (isPrescolaire) {
        const vals: Record<string, number> = { 'Non acquis': 1, "En cours d'acquisition": 2, 'Acquis': 3 };
        total += vals[g.prescolaireAppréciation ?? ''] ?? 0;
      } else {
        total += g.score ?? 0;
      }
    }
    if (isPrescolaire) return parseFloat(((total / (mainSubjects.length * 3)) * 10).toFixed(2));
    if (session.levelCategory === 'CM1' || session.levelCategory === 'CM2') return parseFloat(((total / 170) * 20).toFixed(2));
    const divisor = AVERAGE_CONFIG[session.levelCategory].divisor(session.evaluationType);
    return parseFloat((total / divisor).toFixed(2));
  };

  const PRES_APPR_COLORS: Record<string, string> = {
    'Non acquis': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
    "En cours d'acquisition": 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    'Acquis': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{session.label}</h2>
            <LevelBadge level={session.levelCategory} evalType={session.evaluationType} />
            {locked && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"><Lock size={9} />Verrouillée</span>}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">{session.className} • {entries.length} élève{entries.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasChanges && !locked && (
            <button onClick={() => handleSave(false)} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 cursor-pointer">
              Enregistrer
            </button>
          )}
          {!locked ? (
            <button onClick={() => handleSave(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 cursor-pointer">
              <Lock size={13} />Valider & Clôturer
            </button>
          ) : (
            <button onClick={() => { setLocked(false); onSave({ ...session, isLocked: false }); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer">
              <Unlock size={13} />Déverrouiller
            </button>
          )}
          <button onClick={onViewResults} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer">
            <BarChart2 size={13} />Résultats
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${colors.border} ${colors.bg}`}>
          <Users size={32} className={`mx-auto mb-2 ${colors.text} opacity-50`} />
          <p className={`text-sm font-bold ${colors.text}`}>Aucun élève actif dans cette classe</p>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Ajoutez des élèves dans le module Élèves.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/60">
                <th className="sticky left-0 z-10 bg-slate-50 dark:bg-zinc-800/60 px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-zinc-300 whitespace-nowrap border-r border-slate-200 dark:border-zinc-700">#</th>
                <th className="sticky left-8 z-10 bg-slate-50 dark:bg-zinc-800/60 px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-zinc-300 whitespace-nowrap border-r border-slate-200 dark:border-zinc-700 min-w-[160px]">Élève</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-slate-600 dark:text-zinc-300 whitespace-nowrap">Présence</th>
                {mainSubjects.map(sub => (
                  <th key={sub.id} className="px-3 py-3 text-center text-xs font-bold text-slate-600 dark:text-zinc-300 min-w-[110px]">
                    <div>{sub.name}</div>
                    {!isPrescolaire && <div className="text-[10px] font-normal text-slate-400 dark:text-zinc-500">/{sub.maxScore}</div>}
                  </th>
                ))}
                {compSubjects.map(sub => (
                  <th key={sub.id} className="px-3 py-3 text-center text-xs font-bold text-slate-400 dark:text-zinc-500 min-w-[130px]">
                    <div>{sub.name}</div>
                    <div className="text-[10px] font-normal">Appréciation</div>
                  </th>
                ))}
                {!isPrescolaire && <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-zinc-300 whitespace-nowrap">Moy.</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {entries.map((entry, idx) => {
                const isAbsent = entry.attendance !== 'Présent';
                const liveAvg = getLiveAverage(entry);
                return (
                  <tr key={entry.studentId} className={`group ${isAbsent ? 'opacity-60' : ''} hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors`}>
                    {/* N° */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 group-hover:bg-slate-50/50 dark:group-hover:bg-zinc-800/30 px-4 py-3 text-xs text-slate-400 dark:text-zinc-500 border-r border-slate-100 dark:border-zinc-800 text-center font-medium">{idx + 1}</td>
                    {/* Nom */}
                    <td className="sticky left-8 z-10 bg-white dark:bg-zinc-900 group-hover:bg-slate-50/50 dark:group-hover:bg-zinc-800/30 px-4 py-2.5 border-r border-slate-100 dark:border-zinc-800">
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 whitespace-nowrap">{entry.studentName}</p>
                    </td>
                    {/* Présence */}
                    <td className="px-3 py-2 text-center">
                      <select
                        value={entry.attendance}
                        disabled={locked}
                        onChange={e => updateAttendance(entry.studentId, e.target.value as AttendanceStatus)}
                        className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                          entry.attendance === 'Présent'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900'
                            : entry.attendance === 'Absent justifié'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <option value="Présent">Présent</option>
                        <option value="Absent">Absent</option>
                        <option value="Absent justifié">Abs. justifié</option>
                      </select>
                    </td>

                    {/* Notes matières principales */}
                    {mainSubjects.map(sub => {
                      const grade = entry.grades.find(g => g.subjectId === sub.id);
                      if (isPrescolaire) {
                        const current = grade?.prescolaireAppréciation;
                        return (
                          <td key={sub.id} className="px-2 py-2 text-center">
                            <div className="flex flex-col gap-1 items-center">
                              {PRESCOLAIRE_APPRECIATIONS.map(appr => (
                                <button
                                  key={appr}
                                  disabled={locked || isAbsent}
                                  onClick={() => updatePrescolaireGrade(entry.studentId, sub.id, appr as PrescolaireAppréciation)}
                                  className={`text-[9px] px-2 py-1 rounded-lg border font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                    current === appr
                                      ? PRES_APPR_COLORS[appr]
                                      : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700 hover:border-slate-300'
                                  }`}
                                >
                                  {appr === 'Non acquis' ? 'Non acq.' : appr === "En cours d'acquisition" ? 'En cours' : 'Acquis'}
                                </button>
                              ))}
                            </div>
                          </td>
                        );
                      }
                      // Note numérique
                      return (
                        <td key={sub.id} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={sub.maxScore}
                            step="0.5"
                            disabled={locked || isAbsent}
                            value={grade?.score ?? ''}
                            onChange={e => {
                              const val = e.target.value === '' ? null : Math.min(sub.maxScore, Math.max(0, parseFloat(e.target.value)));
                              updateGrade(entry.studentId, sub.id, val);
                            }}
                            className="w-16 text-center px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="—"
                          />
                        </td>
                      );
                    })}

                    {/* Matières complémentaires */}
                    {compSubjects.map(sub => {
                      const grade = entry.grades.find(g => g.subjectId === sub.id);
                      return (
                        <td key={sub.id} className="px-2 py-2 text-center">
                          <select
                            disabled={locked || isAbsent}
                            value={grade?.complementaryAppréciation ?? ''}
                            onChange={e => updateCompGrade(entry.studentId, sub.id, e.target.value as ComplementaryAppréciation)}
                            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">—</option>
                            {COMPLEMENTARY_APPRECIATIONS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </td>
                      );
                    })}

                    {/* Moyenne live */}
                    {!isPrescolaire && (
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${getAverageBg(liveAvg, scale)}`}>
                          {liveAvg !== null ? liveAvg.toFixed(2).replace('.', ',') : isAbsent ? 'ABS' : '—'}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info préscolaire */}
      {isPrescolaire && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 text-xs text-violet-700 dark:text-violet-300">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div>
            <strong>Niveau Préscolaire</strong> — Aucune note chiffrée. Aucun classement. Décision finale automatique : <strong>ACQUIS</strong> quel que soit le résultat.
          </div>
        </div>
      )}

      {/* Légende CM */}
      {(session.levelCategory === 'CM1' || session.levelCategory === 'CM2') && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          Formule : <strong>(Total / 170) × 20</strong>. L'Étude du milieu regroupe Histoire, Géographie et Sciences sur une seule note /50.
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VUE RÉSULTATS & CLASSEMENT
// ─────────────────────────────────────────────────────────────
interface ResultsViewProps {
  session: EvaluationSession;
  allSessions: EvaluationSession[];
  onBack: () => void;
  onEntry: () => void;
  onBulletin: (studentId: string) => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ session, allSessions, onBack, onEntry, onBulletin }) => {
  const isPrescolaire = session.levelCategory === 'PRESCOLAIRE';
  const scale = AVERAGE_CONFIG[session.levelCategory].scale;
  const colors = LEVEL_COLORS[session.levelCategory];

  const computed = useMemo(() =>
    computeSessionResults(session.entries, session.subjects, session.levelCategory, session.evaluationType),
    [session]
  );

  const classStats = useMemo(() => {
    const averages = computed.filter(e => e.average !== null).map(e => e.average as number);
    if (averages.length === 0) return null;
    return {
      highest: Math.max(...averages),
      lowest:  Math.min(...averages),
      mean:    parseFloat((averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(2)),
      passed:  averages.filter(a => a >= scale / 2).length,
      total:   computed.length,
    };
  }, [computed, scale]);

  const mainSubjects = session.subjects.filter(s => !s.isComplementary);
  const compSubjects  = session.subjects.filter(s => s.isComplementary);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"><ArrowLeft size={18} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Résultats — {session.label}</h2>
            <LevelBadge level={session.levelCategory} evalType={session.evaluationType} />
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">{session.className} • {new Date(session.date).toLocaleDateString('fr-CI', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={onEntry} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-all">
          <Edit3 size={13} />Modifier
        </button>
      </div>

      {/* Stats rapides */}
      {classStats && !isPrescolaire && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Moyenne de classe', value: formatAverage(classStats.mean), sub: `sur ${scale}`, color: getAveragePremiumBg(classStats.mean, scale) },
            { label: 'Meilleure note', value: formatAverage(classStats.highest), sub: `sur ${scale}`, color: 'card-premium-pattern card-premium-green' },
            { label: 'Note la plus basse', value: formatAverage(classStats.lowest), sub: `sur ${scale}`, color: 'card-premium-pattern card-premium-rose' },
            { label: 'Au-dessus de la moyenne', value: `${classStats.passed}/${classStats.total}`, sub: 'élèves', color: 'card-premium-pattern card-premium-blue' },
          ].map((stat, i) => (
            <div key={i} className={`p-4 rounded-xl ${stat.color}`}>
              <p className="text-[10px] font-semibold opacity-70 uppercase tracking-wide">{stat.label}</p>
              <p className="text-2xl font-black mt-1">{stat.value}</p>
              <p className="text-[10px] opacity-60">{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tableau de classement */}
      {computed.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-zinc-500">
          <ClipboardList size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucune note saisie pour cette session.</p>
          <button onClick={onEntry} className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer transition-all">
            Saisir les notes
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/60">
                <th className="px-3 py-3 text-center text-xs font-bold text-slate-600 dark:text-zinc-300 w-12">Rang</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-zinc-300 min-w-[160px]">Élève</th>
                {!isPrescolaire && mainSubjects.map(sub => (
                  <th key={sub.id} className="px-3 py-3 text-center text-xs font-bold text-slate-500 dark:text-zinc-400 min-w-[80px]">
                    <div className="truncate max-w-[80px]" title={sub.name}>{sub.name.split(' ')[0]}</div>
                    <div className="text-[9px] font-normal">/{sub.maxScore}</div>
                  </th>
                ))}
                {isPrescolaire && mainSubjects.map(sub => (
                  <th key={sub.id} className="px-3 py-3 text-center text-xs font-bold text-slate-500 dark:text-zinc-400 min-w-[90px]">{sub.name}</th>
                ))}
                {compSubjects.map(sub => (
                  <th key={sub.id} className="px-3 py-3 text-center text-xs font-bold text-slate-400 dark:text-zinc-500 min-w-[90px]">{sub.name}</th>
                ))}
                {!isPrescolaire && <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-zinc-300">Moyenne</th>}
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-zinc-300 min-w-[200px]">Appréciation</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 dark:text-zinc-400">Bulletin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {computed.map((entry, idx) => {
                const isAbsent = entry.attendance !== 'Présent';
                return (
                  <tr key={entry.studentId} className={`${entry.rank === 1 ? 'bg-yellow-50/40 dark:bg-yellow-950/10' : ''} hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors`}>
                    {/* Rang */}
                    <td className="px-3 py-3 text-center">
                      {!isPrescolaire && !isAbsent && entry.rank !== null ? (
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black ${
                          entry.rank === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' :
                          entry.rank === 2 ? 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300' :
                          entry.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' :
                          'bg-slate-50 text-slate-500 dark:bg-zinc-800/50 dark:text-zinc-400'
                        }`}>
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : formatRank(entry.rank)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-zinc-650">—</span>
                      )}
                    </td>
                    {/* Nom */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 whitespace-nowrap">{entry.studentName}</p>
                      {isAbsent && <span className="text-[10px] text-red-500 dark:text-red-400">{entry.attendance}</span>}
                    </td>
                    {/* Notes */}
                    {mainSubjects.map(sub => {
                      const grade = entry.grades.find(g => g.subjectId === sub.id);
                      if (isPrescolaire) {
                        const appr = grade?.prescolaireAppréciation;
                        const apprColors: Record<string, string> = {
                          'Non acquis': 'text-red-600 dark:text-red-400',
                          "En cours d'acquisition": 'text-amber-600 dark:text-amber-400',
                          'Acquis': 'text-emerald-600 dark:text-emerald-400',
                        };
                        return (
                          <td key={sub.id} className="px-3 py-3 text-center">
                            <span className={`text-xs font-semibold ${appr ? apprColors[appr] : 'text-slate-300 dark:text-zinc-600'}`}>
                              {appr === 'Non acquis' ? 'Non acq.' : appr === "En cours d'acquisition" ? 'En cours' : appr ?? '—'}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={sub.id} className="px-3 py-3 text-center text-sm font-medium text-slate-700 dark:text-zinc-300">
                          {grade?.score !== null && grade?.score !== undefined ? grade.score.toFixed(1).replace('.', ',') : <span className="text-slate-300 dark:text-zinc-600">—</span>}
                        </td>
                      );
                    })}
                    {/* Complémentaires */}
                    {compSubjects.map(sub => {
                      const grade = entry.grades.find(g => g.subjectId === sub.id);
                      return (
                        <td key={sub.id} className="px-3 py-3 text-center text-xs text-slate-500 dark:text-zinc-400">
                          {grade?.complementaryAppréciation ?? '—'}
                        </td>
                      );
                    })}
                    {/* Moyenne */}
                    {!isPrescolaire && (
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-xl text-sm font-black ${getAverageBg(entry.average, scale)}`}>
                          {formatAverage(entry.average)}
                        </span>
                      </td>
                    )}
                    {/* Appréciation */}
                    <td className="px-4 py-3">
                      <p className={`text-xs font-medium ${getAppreciationColor(entry.average, scale)}`}>
                        {isPrescolaire ? '✓ Acquis' : (entry.appreciation ?? '—')}
                      </p>
                    </td>
                    {/* Bouton bulletin */}
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => onBulletin(entry.studentId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-all cursor-pointer"
                        title="Voir le bulletin"
                      >
                        <FileText size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Note préscolaire */}
      {isPrescolaire && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 text-xs text-violet-700 dark:text-violet-300">
          <Star size={15} className="shrink-0 mt-0.5" />
          Niveau préscolaire : pas de classement, pas de redoublement. Décision finale = <strong>ACQUIS</strong> pour tous.
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VUE BULLETIN
// ─────────────────────────────────────────────────────────────
interface BulletinViewProps {
  studentId: string;
  session: EvaluationSession;
  allSessions: EvaluationSession[];
  schoolName: string;
  schoolLogo: string;
  schoolYear: string;
  onBack: () => void;
}

const BulletinView: React.FC<BulletinViewProps> = ({ studentId, session, allSessions, schoolName, schoolLogo, schoolYear, onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const isPrescolaire = session.levelCategory === 'PRESCOLAIRE';
  const scale = AVERAGE_CONFIG[session.levelCategory].scale;

  const entry = useMemo(() => {
    const computed = computeSessionResults(session.entries, session.subjects, session.levelCategory, session.evaluationType);
    return computed.find(e => e.studentId === studentId);
  }, [session, studentId]);

  const mainSubjects = session.subjects.filter(s => !s.isComplementary);
  const compSubjects  = session.subjects.filter(s => s.isComplementary);

  const handlePrint = () => window.print();

  if (!entry) return (
    <div className="text-center py-16 text-slate-500 dark:text-zinc-500">
      <AlertCircle size={28} className="mx-auto mb-2 opacity-40" />
      <p>Élève non trouvé dans cette session.</p>
      <button onClick={onBack} className="mt-3 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-bold cursor-pointer">Retour</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 no-print flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-pointer"><ArrowLeft size={18} /></button>
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex-1">Bulletin — {entry.studentName}</h2>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 cursor-pointer transition-all shadow-lg shadow-blue-500/20"
        >
          <Printer size={16} />Imprimer
        </button>
      </div>

      <div ref={printRef} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-lg overflow-hidden print-area relative min-h-[820px] p-8 flex flex-col justify-between" style={{ contentVisibility: 'auto', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
        <div className="relative z-10 space-y-6 flex-1">
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {schoolLogo && <img src={schoolLogo} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-slate-200 dark:border-zinc-700" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                <div>
                  <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{schoolName}</h1>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">Année scolaire {schoolYear}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight uppercase">
                  {isPrescolaire ? 'Évaluation' : 'Bulletin de Notes'}
                </h2>
                <div className={`px-2.5 py-0.5 rounded text-[10px] font-bold inline-block mt-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800`}>
                  Classe : {session.className}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Élève</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{entry.studentName}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-slate-500 dark:text-zinc-400">Statut : </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    entry.attendance === 'Présent'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                  }`}>
                    {entry.attendance}
                  </span>
                </div>
              </div>
              <div className="md:text-right flex flex-col md:items-end justify-end">
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Session d'évaluation</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{session.label}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Date de session : <strong>{new Date(session.date).toLocaleDateString('fr-CI', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Résultats académiques</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/60">
                    <th className="bg-blue-600 text-white font-bold p-3 text-left text-xs uppercase tracking-wider rounded-tl-lg">Matière</th>
                    {!isPrescolaire && <th className="bg-slate-800 text-white font-bold p-3 text-center text-xs uppercase tracking-wider w-24">Barème</th>}
                    <th className="bg-blue-600 text-white font-bold p-3 text-center text-xs uppercase tracking-wider rounded-tr-lg w-44">
                      {isPrescolaire ? 'Appréciation' : 'Note obtenue'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mainSubjects.map((sub, idx) => {
                    const grade = entry.grades.find(g => g.subjectId === sub.id);
                    return (
                      <tr key={sub.id} className={`border-b border-slate-100 dark:border-zinc-800 ${idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/40 dark:bg-zinc-800/20'}`}>
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-zinc-200">{sub.name}</td>
                        {!isPrescolaire && <td className="px-4 py-3 text-center text-xs font-medium text-slate-400 dark:text-zinc-500">/{sub.maxScore}</td>}
                        <td className="px-4 py-3 text-center font-bold text-sm">
                          {isPrescolaire ? (
                            <span className={`text-xs ${
                              grade?.prescolaireAppréciation === 'Acquis' ? 'text-emerald-600 dark:text-emerald-400' :
                              grade?.prescolaireAppréciation === "En cours d'acquisition" ? 'text-amber-600 dark:text-amber-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>{grade?.prescolaireAppréciation ?? '—'}</span>
                          ) : (
                            <span className={getAppreciationColor(grade?.score ?? null, sub.maxScore)}>
                              {grade?.score !== null && grade?.score !== undefined ? grade.score.toFixed(2).replace('.', ',') : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {compSubjects.length > 0 && (
                    <tr className="bg-slate-100/60 dark:bg-zinc-800/40 border-b border-slate-200 dark:border-zinc-700">
                      <td colSpan={isPrescolaire ? 2 : 3} className="px-4 py-1.5 text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Matières complémentaires (hors calcul)</td>
                    </tr>
                  )}
                  {compSubjects.map((sub) => {
                    const grade = entry.grades.find(g => g.subjectId === sub.id);
                    return (
                      <tr key={sub.id} className="border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-zinc-400">{sub.name}</td>
                        {!isPrescolaire && <td className="px-4 py-3 text-center text-xs text-slate-350 dark:text-zinc-650">—</td>}
                        <td className="px-4 py-3 text-center text-xs text-slate-500 dark:text-zinc-400 font-semibold">{grade?.complementaryAppréciation ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Observations</p>
                <div className="w-full border-b border-dashed border-slate-350 dark:border-zinc-700 mt-6 h-1"></div>
                <div className="w-full border-b border-dashed border-slate-350 dark:border-zinc-700 mt-6 h-1"></div>
              </div>
              <div className="pt-2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Signature Parents / Tuteurs</p>
                <div className="w-48 border-b border-dashed border-slate-300 dark:border-zinc-600 mt-12"></div>
              </div>
            </div>

            <div className="flex flex-col md:items-end justify-between space-y-4">
              {!isPrescolaire && (
                <div className="space-y-3 md:text-right">
                  <div className="inline-flex rounded-lg overflow-hidden border border-blue-600/30 shadow-sm shrink-0">
                    <div className="bg-blue-600 text-white font-extrabold px-4 py-2 flex items-center justify-center text-xs uppercase tracking-wide">
                      Moyenne
                    </div>
                    <div className="bg-slate-800 text-white font-black px-6 py-2 flex items-center justify-center text-lg tracking-tight">
                      {formatAverage(entry.average)} / {scale}
                    </div>
                  </div>
                  
                  <div className="space-y-1 mt-2">
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Rang de l'élève : <strong className="text-slate-800 dark:text-white text-sm font-black">{formatRank(entry.rank)}</strong>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Appréciation globale : <strong className={`text-sm ${getAppreciationColor(entry.average, scale)}`}>{entry.appreciation}</strong>
                    </p>
                  </div>
                </div>
              )}

              {isPrescolaire && (
                <div className="inline-flex rounded-lg overflow-hidden border border-emerald-900/40 shadow-sm shrink-0 self-end">
                  <div className="bg-emerald-600 text-white font-extrabold px-4 py-2 flex items-center justify-center text-xs uppercase tracking-wide">
                    Décision
                  </div>
                  <div className="bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-black px-6 py-2 flex items-center justify-center text-lg tracking-tight">
                    ACQUIS
                  </div>
                </div>
              )}

              <div className="pt-2 text-center md:text-right w-full">
                <div className="w-48 border-b border-slate-300 dark:border-zinc-700 md:ml-auto mb-1 mt-10"></div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 md:mr-6">Signature de la Direction</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL : Notes
// ─────────────────────────────────────────────────────────────
const Notes: React.FC<NotesProps> = ({
  classes,
  students,
  evaluationSessions,
  setEvaluationSessions,
  addNotification,
  schoolName,
  schoolLogo,
  schoolYear,
  addLog,
}) => {
  const [view, setView] = useState<NotesView>('LIST');
  const [activeSession, setActiveSession] = useState<EvaluationSession | null>(null);
  const [bulletinStudentId, setBulletinStudentId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Créer une session
  const handleCreateSession = (session: EvaluationSession) => {
    setEvaluationSessions(prev => [...prev, session]);
    setShowCreateModal(false);
    setActiveSession(session);
    setView('ENTRY');
    addNotification('success', `Session "${session.label}" créée pour ${session.className}.`);
    addLog('Nouvelle session d\'évaluation', `Session "${session.label}" créée pour la classe ${session.className}.`, 'Scolarité', 'create');
  };

  // Sauvegarder une session
  const handleSaveSession = (updated: EvaluationSession) => {
    setEvaluationSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
    setActiveSession(updated);
    if (updated.isLocked) {
      addNotification('success', `Session "${updated.label}" clôturée avec succès.`);
      addLog('Clôture session', `Session "${updated.label}" (${updated.className}) clôturée.`, 'Scolarité', 'update');
    } else {
      addNotification('info', 'Notes enregistrées.');
    }
  };

  // Supprimer une session
  const handleDeleteSession = (id: string) => {
    const session = evaluationSessions.find(s => s.id === id);
    if (!session) return;
    if (!window.confirm(`Supprimer la session "${session.label}" ?\nCette action est irréversible.`)) return;
    setEvaluationSessions(prev => prev.filter(s => s.id !== id));
    addNotification('success', `Session "${session.label}" supprimée.`);
    addLog('Suppression session', `Session "${session.label}" (${session.className}) supprimée.`, 'Scolarité', 'delete');
  };

  // Ouvrir saisie
  const openEntry = (session: EvaluationSession) => {
    setActiveSession(session);
    setView('ENTRY');
  };

  // Ouvrir résultats
  const openResults = (session: EvaluationSession) => {
    setActiveSession(session);
    setView('RESULTS');
  };

  // Ouvrir bulletin
  const openBulletin = (studentId: string) => {
    setBulletinStudentId(studentId);
    setView('BULLETIN');
  };

  const goBack = () => {
    if (view === 'BULLETIN') {
      setBulletinStudentId(null);
      setView('RESULTS');
    } else {
      setActiveSession(null);
      setView('LIST');
    }
  };

  return (
    <div className="space-y-0">
      {/* Modal création */}
      {showCreateModal && (
        <CreateSessionModal
          classes={classes}
          existingSessions={evaluationSessions}
          schoolYear={schoolYear}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSession}
        />
      )}

      {/* Contenu principal */}
      {view === 'LIST' && (
        <SessionList
          sessions={evaluationSessions}
          classes={classes}
          onNew={() => setShowCreateModal(true)}
          onOpen={openEntry}
          onDelete={handleDeleteSession}
          onResults={openResults}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {view === 'ENTRY' && activeSession && (
        <NoteEntryView
          session={activeSession}
          students={students}
          onSave={handleSaveSession}
          onBack={goBack}
          onViewResults={() => setView('RESULTS')}
          addNotification={addNotification}
        />
      )}

      {view === 'RESULTS' && activeSession && (
        <ResultsView
          session={activeSession}
          allSessions={evaluationSessions}
          onBack={goBack}
          onEntry={() => setView('ENTRY')}
          onBulletin={openBulletin}
        />
      )}

      {view === 'BULLETIN' && activeSession && bulletinStudentId && (
        <BulletinView
          studentId={bulletinStudentId}
          session={activeSession}
          allSessions={evaluationSessions}
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          schoolYear={schoolYear}
          onBack={goBack}
        />
      )}
    </div>
  );
};

export default Notes;
