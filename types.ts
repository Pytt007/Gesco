
// Fix: Import React to resolve namespace error for React.ReactNode
import React from 'react';

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS',
  CLASSES = 'CLASSES',
  STAFF = 'STAFF',
  CANTEEN = 'CANTEEN',
  TRANSPORT = 'TRANSPORT',
  ACTIVITIES = 'ACTIVITIES',
  SCOLARITY = 'SCOLARITY',
  EXPENSES = 'EXPENSES',
  REPORTS = 'REPORTS',
  HISTORY = 'HISTORY',
  STATISTICS = 'STATISTICS',
  SETTINGS = 'SETTINGS',
  NOTES = 'NOTES'
}

// ─────────────────────────────────────────────────────────────
// MODULE NOTES ET ÉVALUATIONS — Types académiques
// ─────────────────────────────────────────────────────────────

/** Catégories de niveaux scolaires */
export type SchoolLevelCategory =
  | 'PRESCOLAIRE'  // Garderie, Ptesection, Moysection, Grdsection
  | 'CP'           // CP1, CP2
  | 'CE'           // CE1, CE2
  | 'CM1'          // CM1 uniquement
  | 'CM2';         // CM2 uniquement

/** Types d'évaluations disponibles */
export type EvaluationType =
  | 'PRESCOLAIRE'
  | 'MENSUELLE'
  | 'IEP'
  | 'EXAMEN_BLANC';

/** Appréciations qualitatives pour le préscolaire */
export type PrescolaireAppréciation = 'Non acquis' | 'En cours d\'acquisition' | 'Acquis';

/** Appréciations qualitatives pour les matières complémentaires */
export type ComplementaryAppréciation =
  | 'Mauvais'
  | 'Insuffisant'
  | 'Passable'
  | 'Assez bien'
  | 'Bien'
  | 'Très bien'
  | 'Excellent';

/** Statut de présence d'un élève lors d'une évaluation */
export type AttendanceStatus = 'Présent' | 'Absent' | 'Absent justifié';

/** Définition d'une matière dans une évaluation */
export interface AcademicSubject {
  id: string;
  name: string;         // ex: 'Lecture', 'Mathématiques'
  maxScore: number;     // ex: 10, 20, 30, 50
  isComplementary: boolean; // true → appréciations uniquement, ne compte pas dans la moyenne
}

/** Note d'un élève pour une matière dans une session d'évaluation */
export interface SubjectGrade {
  subjectId: string;
  /** Note numérique (null si absent ou matière complémentaire) */
  score: number | null;
  /** Appréciation préscolaire (si niveau préscolaire) */
  prescolaireAppréciation?: PrescolaireAppréciation;
  /** Appréciation matière complémentaire */
  complementaryAppréciation?: ComplementaryAppréciation;
}

/** Entrée de résultat d'un élève dans une session d'évaluation */
export interface StudentEvaluationEntry {
  studentId: string;
  studentName: string;
  attendance: AttendanceStatus;
  grades: SubjectGrade[];
  /** Calculé automatiquement par le moteur */
  average?: number | null;
  /** Calculé automatiquement par le moteur */
  rank?: number | null;
  /** Calculé automatiquement par le moteur */
  appreciation?: string;
}

/** Une session d'évaluation (ex: Composition Mensuelle 1, IEP 2, Examen Blanc 1…) */
export interface EvaluationSession {
  id: string;
  classId: string;
  className: string;
  levelCategory: SchoolLevelCategory;
  evaluationType: EvaluationType;
  /** Numéro de séquence de la session (1, 2, 3…) */
  sessionNumber: number;
  /** Libellé affiché (ex: 'Composition Mensuelle 1', 'IEP 2') */
  label: string;
  schoolYear: string;
  date: string; // ISO YYYY-MM-DD
  subjects: AcademicSubject[];
  entries: StudentEvaluationEntry[];
  isLocked: boolean; // true = saisie terminée
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

export interface SchoolSettingsData {
  schoolName: string;
  directorName: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
}

export interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  grade: string;
  status: 'Actif' | 'Inactif';
  feesStatus: 'Payé' | 'En retard' | 'Partiel' | 'En attente';
  attendance: number; // Percentage
  // Nouveaux champs détaillés
  age?: number;
  photo?: string;
  gender?: 'Masculin' | 'Féminin';
  parentName?: string;
  parentPhone?: string;
  emergencyContact?: string;
  address?: string;
  medicalInfo?: string;
  joinDate?: string;
  grades?: Grade[];
}

export interface Grade {
  id: string;
  subject: string;
  value: number;
  maxGrade?: number; // Maximum grade for this note
  trimester: string; // monthly period name
  date: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  phone: string;
}

export interface Subject {
  id: string;
  name: string;
  coef: number;
  maxGrade?: number; // Maximum grade (e.g. 10, 20, 30, 50)
  teacher: string; // Name of the teacher
}

export interface ScheduleSlot {
  id: string;
  day: string; // 'Lundi', 'Mardi', etc.
  startTime: string; // '08:00'
  endTime: string; // '10:00'
  subject: string; // Subject name
  type: 'Cours' | 'TP' | 'TD' | 'Sport';
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: 'Direction' | 'Enseignant' | 'Administratif' | 'Support';
  email: string;
  phone: string;
  subject?: string; // Optionnel, seulement pour les enseignants
  photo?: string; // Optionnel, URL ou base64
  gender?: 'Masculin' | 'Féminin';
  status: 'Actif' | 'En congé' | 'Arrêt maladie' | 'Terminé' | 'Suspendu';
  joinDate: string;
  salary: number;
}

export interface ClassGroup {
  id: string;
  name: string;
  teacherId: string;
  studentCount: number;
  capacity: number;
  subjects: Subject[];
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: React.ReactNode;
  color: string;
}

export interface CanteenMenu {
  id: string;
  date?: string; // Format ISO YYYY-MM-DD
  day: string;
  main: string;
  vegetarian: string;
  dessert: string;
}

export interface BusRoute {
  id: string;
  name: string;
  driver: string;
  phone: string;        // Nouveau champ
  licensePlate: string; // Nouveau champ
  capacity: number;
  registered: number;
}

export interface ActivityRegistration {
  studentId: string;
  studentName: string;
  studentClass: string;
  amountPaid: number; // Montant réellement versé (supporte paiement partiel)
  date: string;
}

export interface Activity {
  id: string;
  name: string;
  day: string;
  time: string;
  instructor: string;
  spots: number;
  price: number; // Nouveau champ
  registrations: ActivityRegistration[]; // Nouveau champ
}

export interface ActivityLog {
  id: string;
  action: string; // Titre de l'action
  details: string; // Description détaillée
  module: 'Scolarité' | 'Finance' | 'RH' | 'Système' | 'Communication' | 'Cantine' | 'Transport' | 'Classes' | 'Élèves' | 'Activités';
  user: string; // Qui a fait l'action
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'warning' | 'info';
  oldValue?: string;
  newValue?: string;
}

export interface InstallmentDetails {
  amount: number;
  date: string; // Format YYYY-MM-DD
  method: string; // 'Mobile Money' | 'Virement' | 'Chèque'
}

export interface SchoolFeeRecord {
  id: string;
  studentId?: string; // Clé de liaison avec l'élève
  studentName: string;
  class: string;
  registration: number; // INSCRP
  registrationMethod?: string;
  registrationDate?: string;
  installments: {
    v1: number | InstallmentDetails;
    v2: number | InstallmentDetails;
    v3: number | InstallmentDetails;
    v4: number | InstallmentDetails;
    v5: number | InstallmentDetails;
    v6: number | InstallmentDetails;
    v7: number | InstallmentDetails;
    v8: number | InstallmentDetails;
  };
  discount: number; // Remise en %
  totalTuition: number; // Total Scolarité (Montant dû après remise)
  totalPaid: number; // Total Déjà payé
  initialTuition: number; // Montant Scolarité Théorique
  initialRegistration: number; // Montant Inscription Théorique
  initialAmount: number; // Montant Initial Total (Scolarité + Inscription)
  netDue: number; // Avoir Net (Scolarité + Inscription - Remise)
  remainingGlobal: number; // Restant Global
}

export interface FeeConfiguration {
  id: string;
  grade: string; // Classe/Niveau (ex: 6ème)
  tuitionAmount: number; // Montant Scolarité Annuelle
  registrationAmount: number; // Montant Inscription
  installmentCount: number; // Nombre de versements (ex: 8)
}

export interface TransportSubscription {
  id: string;
  studentId?: string; // BUG-008 FIX: Stable link to student — survives name changes
  studentName: string;
  class: string;
  routeId: string; // Ligne de bus assignée
  periods: {
    p1: number; // Sept-Nov
    p2: number; // Dec-Fev
    p3: number; // Mars-Mai
  };
  discountPercent: number; // Remise (%)
  discountAmount: number; // Remise (CFA)

  initialTotal: number; // Total par année (CFA) avant remise
  netTotal: number; // Total à encaisser par année (CFA)

  paidP1: number; // Déjà payé T1
  paidP2: number; // Déjà payé T2
  paidP3: number; // Déjà payé T3
  totalPaid: number; // Total Déjà Payé Global

  remaining: number; // Reste à Payer
  status: 'Soldé' | 'Partiel' | 'Impayé';
  zone?: string; // Zone de tarification (ex: Zone Rosier-Mockeyville)
  isCanteenSubscribed?: boolean; // Inscrit à la cantine (oui/non)
}

export interface UserAccount {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  role: 'ADMIN_GENERALE' | 'CANTINE_TRANSPORT' | 'SCOLAIRE_ENSEIGNANT' | 'FINANCE';
  avatarUrl?: string;
}
