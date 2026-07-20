import React, { useState } from 'react';
import { printHtml } from '../services/printService';
import {
   FileText,
   Download,
   Printer,
   Users,
   DollarSign,
   Utensils,
   Bus,
   Briefcase,
   ChevronRight,
   Search,
   Filter,
   Eye,
   GraduationCap
} from 'lucide-react';
import * as XLSX from '@e965/xlsx';
import {
   NotificationType,
   Student,
   SchoolFeeRecord,
   ClassGroup,
   Transaction,
   StaffMember,
   TransportSubscription,
   SchoolSettingsData
} from '../types';
import { getDefaultMaxGrade } from './Classes';

interface ReportsProps {
   addNotification: (type: NotificationType, message: string) => void;
   students: Student[];
   feeRecords: SchoolFeeRecord[];
   classes: ClassGroup[];
   transactions: Transaction[];
   canteenSubscriptions: any[];
   transportSubscriptions: TransportSubscription[];
   activities: any[];
   staffList: StaffMember[];
   schoolSettings: SchoolSettingsData;
}

type ReportCategory = 'scolarity' | 'finance' | 'services' | 'hr';

interface ReportDefinition {
   id: string;
   title: string;
   description: string;
   category: ReportCategory;
   icon: React.ReactNode;
   generate: (params?: any) => any[];
   columns: { header: string; key: string; width?: number }[];
}

const Reports: React.FC<ReportsProps> = ({
   addNotification,
   students,
   feeRecords,
   classes,
   transactions,
   canteenSubscriptions,
   transportSubscriptions,
   staffList,
   schoolSettings
}) => {
   const [activeCategory, setActiveCategory] = useState<ReportCategory>('scolarity');
   const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
   const [previewData, setPreviewData] = useState<any[]>([]);
   const [filterValue, setFilterValue] = useState('');
   const [selectedClass, setSelectedClass] = useState<string>('Toutes');

   // --- REPORT GENERATORS ---

   const generateClassList = () => {
      let data = students;
      if (selectedClass !== 'Toutes') {
         data = data.filter(s => s.grade === selectedClass);
      }
      return [...data].sort((a, b) => {
         const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
         const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
         return nameA.localeCompare(nameB);
      }).map(s => ({
         nom: s.lastName.toUpperCase(),
         prenom: s.firstName,
         classe: s.grade,
         statut: s.status,
         parent: s.parentName || '-',
         contact: s.parentPhone || '-'
      }));
   };

     const calculateStudentGlobalAverage = (student: Student) => {
        if (!student.grades || student.grades.length === 0) return 'N/A';
        
        let totalPoints = 0;
        let totalMax = 0;
        student.grades.forEach(grade => {
           const studentClass = classes.find(c => c.name === student.grade);
           const subject = studentClass?.subjects.find(s => s.name === grade.subject);
           const maxGrade = grade.maxGrade ?? subject?.maxGrade ?? getDefaultMaxGrade(student.grade || '', grade.subject);
           totalPoints += grade.value;
           totalMax += maxGrade;
        });
        if (totalMax === 0) return 'N/A';
        return ((totalPoints / totalMax) * 20).toFixed(2);
     };

    const generateBulletinList = () => {
       let data = students;
       if (selectedClass !== 'Toutes') {
          data = data.filter(s => s.grade === selectedClass);
       }
       return [...data].sort((a, b) => {
          const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
          const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
          return nameA.localeCompare(nameB);
       }).map(s => ({
          id: s.id, // Keep ID for action
          nom: s.lastName.toUpperCase(),
          prenom: s.firstName,
          classe: s.grade,
          moyenne: calculateStudentGlobalAverage(s),
          action: 'download' // Marker for action button
       }));
    };

   const generateFinancialStatus = () => {
      let data = feeRecords;
      if (selectedClass !== 'Toutes') {
         data = data.filter(r => r.class === selectedClass);
      }
      return [...data].sort((a, b) => a.studentName.toLowerCase().localeCompare(b.studentName.toLowerCase())).map(r => ({
         eleve: r.studentName,
         classe: r.class,
         total_du: r.netDue,
         paye: r.totalPaid,
         reste: r.remainingGlobal,
         statut: r.remainingGlobal <= 0 ? 'Soldé' : 'Impayé'
      }));
   };

   const generateTransactionsReport = () => {
      return transactions.map(t => ({
         date: new Date(t.date).toLocaleDateString('fr-FR'),
         type: t.type === 'income' ? 'Recette' : 'Dépense',
         categorie: t.category,
         description: t.description,
         montant: t.amount
      }));
   };

   const generateCanteenList = () => {
      let data = canteenSubscriptions;
      if (selectedClass !== 'Toutes') {
         data = data.filter(s => s.class === selectedClass);
      }
      return [...data].sort((a, b) => a.studentName.toLowerCase().localeCompare(b.studentName.toLowerCase())).map(s => ({
         eleve: s.studentName,
         classe: s.class,
         formule: 'Standard', // À adapter si plusieurs formules
         statut_paiement: s.status
      }));
   };

   const generateTransportList = () => {
      return [...transportSubscriptions].sort((a, b) => a.studentName.toLowerCase().localeCompare(b.studentName.toLowerCase())).map(s => ({
         eleve: s.studentName,
         classe: s.class,
         ligne: s.routeId, // Idéalement mapper avec le nom de la route
         statut: s.status
      }));
   };

   const generateStaffList = () => {
      return [...staffList].sort((a, b) => {
         const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
         const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
         return nameA.localeCompare(nameB);
      }).map(s => ({
         nom: s.lastName.toUpperCase(),
         prenom: s.firstName,
         role: s.role,
         email: s.email,
         telephone: s.phone,
         statut: s.status
      }));
   };

   // --- REPORT DEFINITIONS ---

   const reports: ReportDefinition[] = [
      {
         id: 'class_list',
         title: 'Liste des Élèves',
         description: 'Liste alphabétique des élèves avec contacts parents.',
         category: 'scolarity',
         icon: <Users size={20} />,
         generate: generateClassList,
         columns: [
            { header: 'Nom', key: 'nom', width: 20 },
            { header: 'Prénom', key: 'prenom', width: 20 },
            { header: 'Classe', key: 'classe', width: 10 },
            { header: 'Statut', key: 'statut', width: 10 },
            { header: 'Parent', key: 'parent', width: 20 },
            { header: 'Contact', key: 'contact', width: 15 }
         ]
      },
      {
         id: 'bulletins',
         title: 'Bulletins de Notes',
         description: 'Génération et impression des bulletins scolaires.',
         category: 'scolarity',
         icon: <GraduationCap size={20} />,
         generate: generateBulletinList,
         columns: [
            { header: 'Nom', key: 'nom', width: 20 },
            { header: 'Prénom', key: 'prenom', width: 20 },
            { header: 'Classe', key: 'classe', width: 10 },
            { header: 'Moyenne', key: 'moyenne', width: 10 },
            { header: 'Action', key: 'action', width: 10 }
         ]
      },
      {
         id: 'finance_status',
         title: 'État des Scolarités',
         description: 'Suivi des paiements et restes à payer par élève.',
         category: 'finance',
         icon: <DollarSign size={20} />,
         generate: generateFinancialStatus,
         columns: [
            { header: 'Élève', key: 'eleve', width: 25 },
            { header: 'Classe', key: 'classe', width: 10 },
            { header: 'Total Dû', key: 'total_du', width: 15 },
            { header: 'Payé', key: 'paye', width: 15 },
            { header: 'Reste', key: 'reste', width: 15 },
            { header: 'Statut', key: 'statut', width: 10 }
         ]
      },
      {
         id: 'transactions_log',
         title: 'Journal des Transactions',
         description: 'Historique complet des recettes et dépenses.',
         category: 'finance',
         icon: <FileText size={20} />,
         generate: generateTransactionsReport,
         columns: [
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Type', key: 'type', width: 10 },
            { header: 'Catégorie', key: 'categorie', width: 20 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Montant', key: 'montant', width: 15 }
         ]
      },
      {
         id: 'canteen_subscribers',
         title: 'Inscrits Cantine',
         description: 'Liste des élèves inscrits à la cantine.',
         category: 'services',
         icon: <Utensils size={20} />,
         generate: generateCanteenList,
         columns: [
            { header: 'Élève', key: 'eleve', width: 25 },
            { header: 'Classe', key: 'classe', width: 10 },
            { header: 'Formule', key: 'formule', width: 15 },
            { header: 'Paiement', key: 'statut_paiement', width: 15 }
         ]
      },
      {
         id: 'transport_subscribers',
         title: 'Inscrits Transport',
         description: 'Liste des élèves inscrits au transport scolaire.',
         category: 'services',
         icon: <Bus size={20} />,
         generate: generateTransportList,
         columns: [
            { header: 'Élève', key: 'eleve', width: 25 },
            { header: 'Classe', key: 'classe', width: 10 },
            { header: 'Ligne', key: 'ligne', width: 15 },
            { header: 'Statut', key: 'statut', width: 15 }
         ]
      },
      {
         id: 'staff_list',
         title: 'Liste du Personnel',
         description: 'Annuaire du personnel enseignant et administratif.',
         category: 'hr',
         icon: <Briefcase size={20} />,
         generate: generateStaffList,
         columns: [
            { header: 'Nom', key: 'nom', width: 20 },
            { header: 'Prénom', key: 'prenom', width: 20 },
            { header: 'Rôle', key: 'role', width: 15 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Téléphone', key: 'telephone', width: 15 }
         ]
      }
   ];

   const handleSelectReport = (report: ReportDefinition) => {
      setSelectedReport(report);
      setPreviewData(report.generate());
   };

   // Update preview when filters change
   React.useEffect(() => {
      if (selectedReport) {
         setPreviewData(selectedReport.generate());
      }
   }, [selectedClass, selectedReport]);

   const handleExportExcel = () => {
      if (!selectedReport || previewData.length === 0) return;

      // Filter out action column for export
      const dataToExport = previewData.map(({ action, id, ...rest }) => rest);

      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Adjust column widths
      const wscols = selectedReport.columns.filter(c => c.key !== 'action').map(col => ({ wch: col.width || 15 }));
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rapport");

      const fileName = `${selectedReport.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      addNotification('success', 'Rapport exporté avec succès.');
   };

   const handlePrint = () => {
      window.print();
   };

   const handlePrintBulletin = (studentId: string) => {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const today = new Date().toLocaleDateString('fr-FR');
      const studentClass = classes.find(c => c.name === student.grade);

      // 1. Determine level
      const studentGrade = student.grade || '';
      const lowerGrade = studentGrade.toLowerCase();
      let level: 'PRESCOLAIRE' | 'CP' | 'CE' | 'CM1' | 'CM2' = 'CM2';
      if (lowerGrade.includes('cp1') || lowerGrade.includes('cp2') || lowerGrade.includes('cp')) {
         level = 'CP';
      } else if (lowerGrade.includes('ce1') || lowerGrade.includes('ce2') || lowerGrade.includes('ce')) {
         level = 'CE';
      } else if (lowerGrade.includes('cm1')) {
         level = 'CM1';
      } else if (lowerGrade.includes('cm2')) {
         level = 'CM2';
      } else if (lowerGrade.includes('mater') || lowerGrade.includes('gard') || lowerGrade.includes('presco') || lowerGrade.includes('petite') || lowerGrade.includes('moyenne') || lowerGrade.includes('grande')) {
         level = 'PRESCOLAIRE';
      }

      const scale = (level === 'CM1' || level === 'CM2') ? 20 : 10;

      // 2. Select subjects
      let subjectsToUse = [];
      if (studentClass?.subjects && studentClass.subjects.length > 0) {
         subjectsToUse = studentClass.subjects.map(s => ({
            name: s.name,
            coef: s.coef || 1,
            maxGrade: s.maxGrade || (scale === 10 ? 10 : 20)
         }));
      } else {
         if (level === 'PRESCOLAIRE') {
            subjectsToUse = [
               { name: 'Langage', coef: 1, maxGrade: 3 },
               { name: 'Mathématiques', coef: 1, maxGrade: 3 },
               { name: 'AEM', coef: 1, maxGrade: 3 },
               { name: 'AEC', coef: 1, maxGrade: 3 }
            ];
         } else if (level === 'CP') {
            subjectsToUse = [
               { name: 'Lecture', coef: 1, maxGrade: 10 },
               { name: 'Écriture', coef: 1, maxGrade: 10 },
               { name: 'Copie', coef: 1, maxGrade: 10 },
               { name: 'Orthographe', coef: 1, maxGrade: 10 },
               { name: 'Expression écrite', coef: 1, maxGrade: 10 },
               { name: 'Mathématiques', coef: 1, maxGrade: 10 },
               { name: 'Chant - Récitation', coef: 1, maxGrade: 10 },
               { name: 'Dessin', coef: 1, maxGrade: 10 },
               { name: 'EDHC', coef: 1, maxGrade: 10 }
            ];
         } else if (level === 'CE') {
            subjectsToUse = [
               { name: 'Orthographe', coef: 1, maxGrade: 10 },
               { name: 'Étude de texte', coef: 1, maxGrade: 30 },
               { name: 'Étude du milieu (Histoire + Géo + Sci)', coef: 1, maxGrade: 30 },
               { name: 'Mathématiques', coef: 1, maxGrade: 30 }
            ];
         } else { // CM1 & CM2
            subjectsToUse = [
               { name: 'Orthographe', coef: 1, maxGrade: 20 },
               { name: 'Étude de texte', coef: 1, maxGrade: 50 },
               { name: 'Étude du milieu (Histoire + Géo + Sci)', coef: 1, maxGrade: 50 },
               { name: 'Mathématiques', coef: 1, maxGrade: 50 }
            ];
         }
      }

      // For each subject, check if the student has grades.
      const getStudentSubjectData = (subjectName: string) => {
         if (!student.grades || student.grades.length === 0) return null;
         const subjectGrades = student.grades.filter(g => g.subject === subjectName);
         if (subjectGrades.length === 0) return null;
         
         let totalPoints = 0;
         subjectGrades.forEach(g => {
            totalPoints += g.value;
         });
         const avg = totalPoints / subjectGrades.length;
         return { avg, isActual: true };
      };

      const semester1 = [
         {
            ue: "MATIÈRES ENSEIGNÉES",
            credits: subjectsToUse.reduce((acc, s) => acc + s.maxGrade, 0),
            subjects: subjectsToUse.map(s => {
               const actualData = getStudentSubjectData(s.name);
               const maxGrade = s.maxGrade;
               if (actualData) {
                  return {
                     name: s.name,
                     cc: actualData.avg,
                     exam: actualData.avg,
                     coef: s.coef,
                     maxGrade: maxGrade,
                     avg: actualData.avg,
                     isActual: true
                  };
               }
               return {
                  name: s.name,
                  cc: 0,
                  exam: 0,
                  coef: s.coef,
                  maxGrade: maxGrade,
                  avg: 0,
                  isActual: false
               };
            })
         }
      ];

      const calculateSubjectAvg = (s: any) => s.isActual ? s.avg : 0;

      const processedSem1 = semester1.map(ue => {
         const subjects = ue.subjects.map(s => ({
            ...s,
            avg: calculateSubjectAvg(s)
         }));
         const totalPoints = subjects.reduce((acc, s) => acc + s.avg, 0);
         const totalCoef = subjects.reduce((acc, s) => acc + s.maxGrade, 0);
         const ueAvg = (totalPoints / totalCoef) * scale;
         return { ...ue, subjects, ueAvg, validated: ueAvg >= (scale / 2) };
      });

      const generalAvg = processedSem1.reduce((acc, ue) => acc + ue.ueAvg, 0) / processedSem1.length;
      const hasAnyActual = semester1.some(ue => ue.subjects.some(s => s.isActual));

      const htmlContent = `
        <html>
          <head>
            <title>Relevé de Notes - ${student.lastName} ${student.firstName}</title>
            <style>
              body { font-family: 'Times New Roman', serif; padding: 20px; color: #000; font-size: 11px; max-width: 210mm; margin: 0 auto; }
              .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
              .header-left { text-align: center; width: 30%; font-size: 9px; font-weight: bold; text-transform: uppercase; }
              .header-center { text-align: center; width: 30%; }
              .header-right { text-align: center; width: 35%; font-size: 9px; font-weight: bold; text-transform: uppercase; }
              .doc-title { text-align: center; color: #1e3a8a; font-weight: bold; font-size: 14px; margin: 15px 0; text-transform: uppercase; letter-spacing: 1px; }
              .student-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 20px; margin-bottom: 20px; font-size: 11px; }
              .info-row { display: flex; }
              .info-label { font-weight: bold; width: 140px; color: #1e3a8a; }
              .info-value { font-weight: bold; text-transform: uppercase; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
              th, td { border: 1px solid #000; padding: 4px; text-align: center; }
              .col-subject { text-align: left; width: 45%; }
              thead th { background-color: #f3f4f6; text-transform: uppercase; font-size: 9px; }
              .footer-summary { margin-top: 10px; border: 1px solid #000; display: flex; }
              .summary-col { flex: 1; border-right: 1px solid #000; padding: 5px; }
              .summary-col:last-child { border-right: none; }
              .summary-label { font-weight: bold; font-size: 10px; margin-bottom: 4px; }
              .summary-value { font-weight: bold; font-size: 12px; }
              .signatures { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 20px; }
              .sig-box { text-align: center; }
              .sig-title { font-weight: bold; text-decoration: underline; margin-bottom: 40px; font-size: 11px; }
              .footer-text { margin-top: 30px; text-align: center; font-size: 9px; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="header-container">
               <div class="header-left">MINISTÈRE DE L'ÉDUCATION NATIONALE<br/>----------------<br/>DIRECTION RÉGIONALE<br/>----------------<br/>INSPECTION ACADÉMIQUE</div>
               <div class="header-center">
                  <img src="${schoolSettings.logo || '/logo-light.png'}" alt="Logo" style="height: 60px; object-fit: contain;" />
               </div>
               <div class="header-right">${schoolSettings.schoolName.toUpperCase()}<br/>${schoolSettings.address}<br/>Tél: ${schoolSettings.phone}<br/>Email: ${schoolSettings.email}</div>
            </div>
            <div class="doc-title">RELEVÉ DE NOTES</div>
            <div class="student-info-grid">
               <div class="info-row"><span class="info-label">ANNÉE SCOLAIRE :</span> <span class="info-value">2024-2025</span></div>
               <div class="info-row"><span class="info-label">NÉ(E) LE :</span> <span class="info-value">01/01/2010</span></div>
               <div class="info-row"><span class="info-label">PRÉNOM :</span> <span class="info-value">${student.firstName}</span></div>
               <div class="info-row"><span class="info-label">MATRICULE :</span> <span class="info-value">${student.matricule || student.id}</span></div>
               <div class="info-row"><span class="info-label">NOM :</span> <span class="info-value">${student.lastName.toUpperCase()}</span></div>
               <div class="info-row"><span class="info-label">NIVEAU :</span> <span class="info-value">${student.grade}</span></div>
            </div>

             <table>
                <thead>
                   <tr>
                      <th class="col-subject" style="text-align: left; padding-left: 10px;">MATIÈRES</th>
                      <th>NOTE OBTENUE</th>
                      <th>NOTE MAXIMALE</th>
                      <th>APPRÉCIATION</th>
                   </tr>
                </thead>
                <tbody>
                   <tr style="background-color: #d1d5db;">
                      <td colspan="4" style="text-align: left; font-weight: bold; padding: 6px;">COMPOSITION</td>
                   </tr>
                   ${processedSem1.map(ue => `
                        ${ue.subjects.map((sub) => {
                           const val = sub.avg;
                           const max = sub.maxGrade;
                           const isEvaluated = sub.isActual;
                           const displayVal = isEvaluated ? sub.avg.toFixed(1) : '-';
                           let appreciation = '-';
                           if (isEvaluated) {
                              const ratio = val / max;
                              if (ratio >= 0.85) appreciation = 'Très Bien';
                              else if (ratio >= 0.7) appreciation = 'Bien';
                              else if (ratio >= 0.5) appreciation = 'Assez Bien';
                              else if (ratio >= 0.4) appreciation = 'Passable';
                              else appreciation = 'Insuffisant';
                           }
                           return `
                           <tr>
                              <td style="text-align: left; padding-left: 20px; font-weight: bold;">${sub.name}</td>
                              <td style="font-weight: bold; font-size: 11px;">${displayVal}</td>
                              <td style="font-weight: bold;">${sub.maxGrade}</td>
                              <td>${appreciation}</td>
                           </tr>`;
                        }).join('')}
                    `).join('')}
                </tbody>
             </table>

             <!-- FOOTER SUMMARY -->
             <div class="footer-summary">
                <div class="summary-col">
                   <div class="summary-label">Note Totale</div>
                   <div class="summary-value">
                      ${hasAnyActual ? processedSem1.reduce((sum, ue) => sum + ue.subjects.reduce((s, sub) => s + sub.avg, 0), 0).toFixed(1) : '-'} / 
                      ${processedSem1.reduce((sum, ue) => sum + ue.subjects.reduce((s, sub) => s + sub.maxGrade, 0), 0)}
                   </div>
                </div>
                <div class="summary-col">
                   <div class="summary-label">Moyenne Générale</div>
                   <div class="summary-value">${hasAnyActual ? generalAvg.toFixed(2) + ' / ' + scale : '-'}</div>
                </div>
                <div class="summary-col" style="background-color: ${hasAnyActual ? (generalAvg >= (scale / 2) ? '#dcfce7' : '#fee2e2') : '#f3f4f6'}; font-weight: bold;">
                   <div class="summary-label">Décision Finale</div>
                   <div class="summary-value" style="color: ${hasAnyActual ? (generalAvg >= (scale / 2) ? 'green' : 'red') : '#666'};">${hasAnyActual ? (generalAvg >= (scale / 2) ? 'ADMIS(E)' : 'AJOURNÉ(E)') : 'NON ÉVALUÉ(E)'}</div>
                </div>
             </div>

             <!-- SIGNATURES -->
             <div class="signatures">
                <div class="sig-box">
                   <div class="sig-title">Le Directeur des Études</div>
                </div>
                <div class="sig-box">
                   <div class="sig-title">Le Directeur Général</div>
                   <div style="margin-top: 60px; font-size: 10px; color: #666;">
                      Fait à ${schoolSettings.address.split(',')[1] || 'Grand-Bassam'}, le ${today}
                   </div>
                </div>
             </div>

             <div class="footer-text">
                Ce document est un relevé de notes officiel généré par le système de gestion scolaire ${schoolSettings.schoolName}.
                Il ne peut être délivré qu'un seul exemplaire.
             </div>

          </body>
        </html>
      `;

      printHtml(htmlContent);
   };

   const handlePrintAnnualResult = (studentId: string) => {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const today = new Date().toLocaleDateString('fr-FR');
      const studentClass = classes.find(c => c.name === student.grade);
      
      const classStudents = students.filter(s => s.grade === student.grade);
      const effectif = classStudents.length;

      const rankedStudents = classStudents.map(s => ({
         id: s.id,
         avg: Number(calculateStudentGlobalAverage(s)) || 0
      })).sort((a, b) => b.avg - a.avg);
      const rankIndex = rankedStudents.findIndex(s => s.id === student.id);
      const rank = rankIndex !== -1 ? `${rankIndex + 1}${rankIndex === 0 ? 'er' : 'e'}` : '-';

      const rawAvg = Number(calculateStudentGlobalAverage(student)) || 0;
      
      const studentGrade = student.grade || '';
      const lowerGrade = studentGrade.toLowerCase();
      let level: 'PRESCOLAIRE' | 'CP' | 'CE' | 'CM1' | 'CM2' = 'CM2';
      if (lowerGrade.includes('cp1') || lowerGrade.includes('cp2') || lowerGrade.includes('cp')) {
         level = 'CP';
      } else if (lowerGrade.includes('ce1') || lowerGrade.includes('ce2') || lowerGrade.includes('ce')) {
         level = 'CE';
      } else if (lowerGrade.includes('cm1')) {
         level = 'CM1';
      } else if (lowerGrade.includes('cm2')) {
         level = 'CM2';
      } else if (lowerGrade.includes('mater') || lowerGrade.includes('gard') || lowerGrade.includes('presco') || lowerGrade.includes('petite') || lowerGrade.includes('moyenne') || lowerGrade.includes('grande')) {
         level = 'PRESCOLAIRE';
      }

      const scale = (level === 'CM1' || level === 'CM2') ? 20 : 10;
      const studentAvg = scale === 10 ? rawAvg / 2 : rawAvg;
      
      const isAdmitted = studentAvg >= (scale / 2);

      const htmlContent = `
        <html>
          <head>
            <title>Résultat Fin d'Année - ${student.lastName} ${student.firstName}</title>
            <style>
              body {
                font-family: 'Comic Sans MS', 'Arial', sans-serif;
                padding: 40px;
                color: #333;
                max-width: 180mm;
                margin: 0 auto;
                background-color: #fff;
              }
              .badge-title {
                background-color: #f59e0b;
                color: #1e3a8a;
                font-size: 20px;
                font-weight: bold;
                text-align: center;
                padding: 10px 30px;
                border-radius: 20px;
                width: fit-content;
                margin: 0 auto 20px auto;
                text-transform: uppercase;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              }
              .school-year {
                text-align: center;
                font-size: 16px;
                color: #1e3a8a;
                font-weight: bold;
                margin-bottom: 30px;
              }
              .field-row {
                margin-bottom: 20px;
                font-size: 15px;
                line-height: 1.5;
                display: flex;
                align-items: baseline;
              }
              .field-label {
                font-weight: bold;
                color: #1e3a8a;
                margin-right: 10px;
                white-space: nowrap;
              }
              .field-value {
                border-bottom: 2px dotted #94a3b8;
                flex-grow: 1;
                padding-bottom: 2px;
                font-weight: bold;
                color: #0f172a;
              }
              .grid-3 {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
              }
              .badge-decision {
                background-color: #ef4444;
                color: white;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                padding: 8px 25px;
                border-radius: 15px;
                width: fit-content;
                margin: 30px auto 20px auto;
                text-transform: uppercase;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                border: 2px solid #1e3a8a;
              }
              th, td {
                border: 1px solid #1e3a8a;
                padding: 12px;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
              }
              td.label-col {
                text-align: left;
                color: #1e3a8a;
                width: 65%;
              }
              .strike {
                text-decoration: line-through;
                color: #94a3b8;
                opacity: 0.6;
              }
              .city-date {
                text-align: right;
                font-size: 14px;
                font-weight: bold;
                margin-top: 30px;
                margin-bottom: 40px;
              }
              .signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
              }
              .sig-box {
                text-align: center;
                width: 45%;
              }
              .sig-title {
                font-weight: bold;
                color: #1e3a8a;
                font-size: 14px;
                margin-bottom: 60px;
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="badge-title">RÉSULTAT DE FIN D'ANNÉE</div>
            <div class="school-year">ANNÉE SCOLAIRE 2024 / 2025</div>
            
            <div class="field-row">
               <span class="field-label">Nom &amp; Prénoms :</span>
               <span class="field-value">${student.lastName.toUpperCase()} ${student.firstName}</span>
            </div>

            <div class="grid-3">
               <div class="field-row">
                  <span class="field-label">Matricule :</span>
                  <span class="field-value">${student.matricule || 'N/A'}</span>
               </div>
               <div class="field-row">
                  <span class="field-label">Classe :</span>
                  <span class="field-value">${student.grade}</span>
               </div>
               <div class="field-row">
                  <span class="field-label">Effectif :</span>
                  <span class="field-value">${effectif} élèves</span>
               </div>
            </div>

            <div class="field-row">
               <span class="field-label">Moyenne des Compositions :</span>
               <span class="field-value" style="color: #10b981; font-size: 18px;">${studentAvg.toFixed(2)} sur ${scale}</span>
            </div>

            <div class="field-row" style="margin-top: 10px;">
               <span class="field-label">Moyenne Annuelle :</span>
               <span class="field-value" style="color: #10b981; font-size: 18px;">${studentAvg.toFixed(2)}</span>
               <span class="field-label" style="margin-left: 20px;">Classement :</span>
               <span class="field-value" style="font-size: 18px;">${rank}</span>
            </div>

            <div class="badge-decision">DÉCISION DU CONSEIL DES MAÎTRES</div>

            <table>
               <tbody>
                  <tr>
                     <td class="label-col">ADMISSION EN CLASSE SUPÉRIEURE</td>
                     <td class="${isAdmitted ? '' : 'strike'}">OUI</td>
                     <td class="${isAdmitted ? 'strike' : ''}">NON</td>
                  </tr>
                  <tr>
                     <td class="label-col">REDOUBLEMENT</td>
                     <td class="${isAdmitted ? 'strike' : ''}">OUI</td>
                     <td class="${isAdmitted ? '' : 'strike'}">NON</td>
                  </tr>
                  <tr>
                     <td class="label-col">EXCLUSION</td>
                     <td class="strike">OUI</td>
                     <td>NON</td>
                  </tr>
               </tbody>
            </table>

            <div class="city-date">
               ${schoolSettings.address.split(',')[1]?.trim() || 'Grand-Bassam'}, le : ${today}
            </div>

            <div class="signatures">
               <div class="sig-box">
                  <div class="sig-title">Le (a) Maître(sse)</div>
               </div>
               <div class="sig-box">
                  <div class="sig-title">Le Directeur des Études</div>
               </div>
            </div>
          </body>
        </html>
      `;

      printHtml(htmlContent);
   };

   const filteredReports = reports.filter(r => r.category === activeCategory);

   return (
      <div className="h-full flex flex-col md:flex-row gap-6">
         {/* SIDEBAR CATEGORIES */}
         <div className="w-full md:w-64 shrink-0 space-y-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-200/60 dark:border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 px-2">Catégories</h3>
               <button onClick={() => setActiveCategory('scolarity')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeCategory === 'scolarity' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <Users size={18} /> Scolarité
               </button>
               <button onClick={() => setActiveCategory('finance')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeCategory === 'finance' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 font-bold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <DollarSign size={18} /> Finance
               </button>
               <button onClick={() => setActiveCategory('services')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeCategory === 'services' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 font-bold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <Utensils size={18} /> Services
               </button>
               <button onClick={() => setActiveCategory('hr')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeCategory === 'hr' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 font-bold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <Briefcase size={18} /> Ressources Humaines
               </button>
            </div>
         </div>

         {/* MAIN CONTENT */}
         <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">

            {/* REPORT SELECTION HEADER */}
            <div className="p-6 border-b border-slate-200/60 dark:border-gray-700">
               <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Rapports Disponibles</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredReports.map(report => (
                     <button
                        key={report.id}
                        onClick={() => handleSelectReport(report)}
                        className={`p-4 rounded-xl border text-left transition-all hover:shadow-md ${selectedReport?.id === report.id ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10 ring-1 ring-primary' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
                     >
                        <div className="flex items-start justify-between mb-2">
                           <div className={`p-2 rounded-lg ${selectedReport?.id === report.id ? 'bg-white text-primary shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
                              {report.icon}
                           </div>
                           {selectedReport?.id === report.id && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                        </div>
                        <h3 className={`font-bold ${selectedReport?.id === report.id ? 'text-primary' : 'text-gray-800 dark:text-white'}`}>{report.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{report.description}</p>
                     </button>
                  ))}
               </div>
            </div>

            {/* PREVIEW AREA */}
            {selectedReport ? (
               <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {/* TOOLBAR */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-slate-200/60 dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center no-print">
                     <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                           <Eye size={18} /> Aperçu : {selectedReport.title}
                        </h3>
                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300">
                           {previewData.length} enregistrements
                        </span>
                     </div>

                     <div className="flex items-center gap-3">
                        {/* FILTERS */}
                        {(selectedReport.category === 'scolarity' || selectedReport.category === 'finance' || selectedReport.category === 'services') && (
                           <select
                              value={selectedClass}
                              onChange={(e) => setSelectedClass(e.target.value)}
                              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none dark:text-white"
                           >
                              <option value="Toutes">Toutes les classes</option>
                              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                           </select>
                        )}

                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

                        <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                           <Printer size={16} /> Imprimer Liste
                        </button>
                        <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-bold shadow-sm transition-colors">
                           <Download size={16} /> Exporter Excel
                        </button>
                     </div>
                  </div>

                  {/* DATA TABLE */}
                  <div className="flex-1 overflow-auto p-0 custom-scrollbar print-area bg-white dark:bg-zinc-900">
                     <table className="w-full min-w-[800px] text-left border-collapse whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                           <tr>
                              {selectedReport.columns.map((col, idx) => (
                                 <th key={idx} className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b dark:border-gray-700 whitespace-nowrap">
                                    {col.header}
                                 </th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                           {previewData.length > 0 ? (
                              previewData.map((row, rIdx) => (
                                 <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    {selectedReport.columns.map((col, cIdx) => (
                                       <td key={cIdx} className="p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                          {col.key === 'action' && row.action === 'download' ? (
                                             <div className="flex gap-2">
                                                <button
                                                   onClick={() => handlePrintBulletin(row.id)}
                                                   className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors"
                                                   title="Télécharger le bulletin trimestriel"
                                                >
                                                   <Download size={12} /> Bulletin
                                                </button>
                                                <button
                                                   onClick={() => handlePrintAnnualResult(row.id)}
                                                   className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-md text-xs font-bold transition-colors"
                                                   title="Imprimer la fiche de résultat annuel"
                                                >
                                                   <Printer size={12} /> Fiche Annuelle
                                                </button>
                                             </div>
                                          ) : (
                                             typeof row[col.key] === 'number' ? row[col.key].toLocaleString() : row[col.key]
                                          )}
                                       </td>
                                    ))}
                                 </tr>
                              ))
                           ) : (
                              <tr>
                                 <td colSpan={selectedReport.columns.length} className="p-12 text-center text-gray-400">
                                    Aucune donnée trouvée pour les filtres sélectionnés.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                     <FileText size={32} className="opacity-50" />
                  </div>
                  <p className="text-lg font-medium">Sélectionnez un rapport pour voir l'aperçu</p>
                  <p className="text-sm">Choisissez une catégorie à gauche puis un rapport ci-dessus.</p>
               </div>
            )}
         </div>
      </div>
   );
};

export default Reports;
