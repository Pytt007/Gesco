import { describe, it, expect } from 'vitest';
import {
  getLevelForClass,
  calculateAverage,
  getAppreciation,
  rankStudents,
  computeSessionResults,
  getPrescolaireProgression
} from '../services/academicEngine';
import {
  StudentEvaluationEntry,
  AcademicSubject,
  PrescolaireAppréciation
} from '../types';

describe('academicEngine - getLevelForClass', () => {
  it('should resolve levels correctly based on class names', () => {
    expect(getLevelForClass('Garderie')).toBe('PRESCOLAIRE');
    expect(getLevelForClass('Ptesection A')).toBe('PRESCOLAIRE');
    expect(getLevelForClass('CP1A')).toBe('CP');
    expect(getLevelForClass('CP2B')).toBe('CP');
    expect(getLevelForClass('CE1A')).toBe('CE');
    expect(getLevelForClass('CE2B')).toBe('CE');
    expect(getLevelForClass('CM1A')).toBe('CM1');
    expect(getLevelForClass('CM2B')).toBe('CM2');
    // Fallback logic
    expect(getLevelForClass('CP1C')).toBe('CP');
    expect(getLevelForClass('CM2')).toBe('CM2');
    expect(getLevelForClass('Unkown')).toBe('PRESCOLAIRE');
  });
});

describe('academicEngine - calculateAverage & rankStudents', () => {
  const cpSubjects: AcademicSubject[] = [
    { id: '1', name: 'Lecture', maxScore: 10, isComplementary: false },
    { id: '2', name: 'Mathématiques', maxScore: 10, isComplementary: false },
    { id: '3', name: 'Dessin', maxScore: 10, isComplementary: false },
    { id: '4', name: 'Anglais', maxScore: 10, isComplementary: true } // should not count
  ];

  it('should calculate average correctly for CP composition mensuelle (divisor = 8 for CP, scale = 10, no dessin)', () => {
    const entry: StudentEvaluationEntry = {
      studentId: 's1',
      studentName: 'Awa',
      attendance: 'Présent',
      grades: [
        { subjectId: '1', score: 8 },
        { subjectId: '2', score: 9 },
        { subjectId: '4', score: null, complementaryAppréciation: 'Excellent' }
      ]
    };
    // main subjects total = 8 + 9 = 17.
    // Divisor for CP mensuelle is 8. Average = 17 / 8 = 2.13
    const average = calculateAverage(entry, cpSubjects, 'CP', 'MENSUELLE');
    expect(average).toBe(2.13);
  });

  it('should calculate average correctly for CP composition IEP (divisor = 9, scale = 10, with dessin)', () => {
    const iepSubjects: AcademicSubject[] = [
      { id: '1', name: 'Lecture', maxScore: 10, isComplementary: false },
      { id: '2', name: 'Mathématiques', maxScore: 10, isComplementary: false },
      { id: '3', name: 'Dessin', maxScore: 10, isComplementary: false },
      { id: '4', name: 'Anglais', maxScore: 10, isComplementary: true }
    ];
    const entry: StudentEvaluationEntry = {
      studentId: 's1',
      studentName: 'Awa',
      attendance: 'Présent',
      grades: [
        { subjectId: '1', score: 8 },
        { subjectId: '2', score: 8 },
        { subjectId: '3', score: 7 },
        { subjectId: '4', score: null, complementaryAppréciation: 'Bien' }
      ]
    };
    // main subjects total = 8 + 8 + 7 = 23.
    // Divisor for CP IEP is 9. Average = 23 / 9 = 2.56
    const average = calculateAverage(entry, iepSubjects, 'CP', 'IEP');
    expect(average).toBe(2.56);
  });

  it('should return null average for absent students', () => {
    const entry: StudentEvaluationEntry = {
      studentId: 's1',
      studentName: 'Awa',
      attendance: 'Absent',
      grades: []
    };
    const average = calculateAverage(entry, cpSubjects, 'CP', 'MENSUELLE');
    expect(average).toBe(null);
  });

  it('should rank students properly handling ties (Standard Ivoirien)', () => {
    const entries: StudentEvaluationEntry[] = [
      { studentId: 's1', studentName: 'Awa', attendance: 'Présent', grades: [], average: 17.50 },
      { studentId: 's2', studentName: 'Koffi', attendance: 'Présent', grades: [], average: 17.50 },
      { studentId: 's3', studentName: 'Yao', attendance: 'Présent', grades: [], average: 16.90 },
      { studentId: 's4', studentName: 'Mamadou', attendance: 'Absent', grades: [], average: null }
    ];

    const ranked = rankStudents(entries);
    expect(ranked.find(e => e.studentId === 's1')?.rank).toBe(1);
    expect(ranked.find(e => e.studentId === 's2')?.rank).toBe(1);
    expect(ranked.find(e => e.studentId === 's3')?.rank).toBe(3); // Rank skip! 1, 1, 3
    expect(ranked.find(e => e.studentId === 's4')?.rank).toBe(null);
  });
});

describe('academicEngine - getAppreciation', () => {
  it('should return correct appreciation for scale 10 (CP/CE)', () => {
    expect(getAppreciation(4.5, 10)).toBe('Travail insuffisant. Des efforts sont nécessaires.');
    expect(getAppreciation(6.0, 10)).toBe('Résultats passables. Peut mieux faire.');
    expect(getAppreciation(7.5, 10)).toBe('Travail satisfaisant. Continue tes efforts.');
    expect(getAppreciation(8.5, 10)).toBe('Bon travail. Continue ainsi.');
    expect(getAppreciation(9.5, 10)).toBe('Excellent travail. Félicitations.');
  });

  it('should return correct appreciation for scale 20 (CM1/CM2)', () => {
    expect(getAppreciation(9.5, 20)).toBe('Travail insuffisant.');
    expect(getAppreciation(11.0, 20)).toBe('Résultats passables.');
    expect(getAppreciation(13.0, 20)).toBe('Travail satisfaisant.');
    expect(getAppreciation(15.0, 20)).toBe('Bon travail.');
    expect(getAppreciation(17.0, 20)).toBe('Très bon travail.');
    expect(getAppreciation(19.0, 20)).toBe('Excellent travail. Félicitations.');
  });
});

describe('academicEngine - getPrescolaireProgression', () => {
  it('should track progression correctly across sessions', () => {
    const subjectId = 'prs-graphisme';
    
    // Test 1: Acquis -> Acquis (Stable)
    const history1 = [
      [{ subjectId, appreciation: 'Acquis' as PrescolaireAppréciation }],
      [{ subjectId, appreciation: 'Acquis' as PrescolaireAppréciation }]
    ];
    expect(getPrescolaireProgression(history1)[subjectId]).toBe('Stable');

    // Test 2: Non acquis -> Acquis (En progression)
    const history2 = [
      [{ subjectId, appreciation: 'Non acquis' as PrescolaireAppréciation }],
      [{ subjectId, appreciation: 'Acquis' as PrescolaireAppréciation }]
    ];
    expect(getPrescolaireProgression(history2)[subjectId]).toBe('En progression');

    // Test 3: Acquis -> En cours d'acquisition (En recul)
    const history3 = [
      [{ subjectId, appreciation: 'Acquis' as PrescolaireAppréciation }],
      [{ subjectId, appreciation: 'En cours d\'acquisition' as PrescolaireAppréciation }]
    ];
    expect(getPrescolaireProgression(history3)[subjectId]).toBe('En recul');
  });
});
