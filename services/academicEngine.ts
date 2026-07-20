/**
 * academicEngine.ts
 * Moteur de calcul académique pur pour le système de notation primaire ivoirien GESCO.
 * Aucune dépendance UI — fonctions pures uniquement.
 */

import {
  SchoolLevelCategory,
  EvaluationType,
  StudentEvaluationEntry,
  AcademicSubject,
  PrescolaireAppréciation,
} from '../types';
import {
  AVERAGE_CONFIG,
  APPRECIATIONS_SUR_10,
  APPRECIATIONS_SUR_20,
  PRESCOLAIRE_APPRECIATION_VALUES,
  CLASS_LEVEL_MAP,
} from '../constants';

// ─────────────────────────────────────────────────────────────
// 1. DÉTECTION DU NIVEAU
// ─────────────────────────────────────────────────────────────

/**
 * Retourne la catégorie de niveau correspondant à un nom de classe.
 * Supporte les classes non listées en cherchant un préfixe.
 */
export function getLevelForClass(className: string): SchoolLevelCategory | null {
  if (CLASS_LEVEL_MAP[className]) return CLASS_LEVEL_MAP[className];
  // Fallback par préfixe
  const name = className.toUpperCase();
  if (name.startsWith('CP'))  return 'CP';
  if (name.startsWith('CE'))  return 'CE';
  if (name.startsWith('CM1')) return 'CM1';
  if (name.startsWith('CM2')) return 'CM2';
  return 'PRESCOLAIRE';
}

// ─────────────────────────────────────────────────────────────
// 2. CALCUL DE LA MOYENNE
// ─────────────────────────────────────────────────────────────

/**
 * Calcule la moyenne d'un élève pour une session donnée.
 *
 * Règles :
 * - Les matières complémentaires (isComplementary) sont ignorées.
 * - Si l'élève est absent, retourne null.
 * - Pour le préscolaire : appréciations converties en valeur 1/2/3,
 *   résultat ramené sur 10.
 * - Pour CP/CE : total / diviseur (sur 10).
 * - Pour CM1/CM2 : (total / 170) × 20.
 */
export function calculateAverage(
  entry: StudentEvaluationEntry,
  subjects: AcademicSubject[],
  level: SchoolLevelCategory,
  evalType: EvaluationType
): number | null {
  if (entry.attendance === 'Absent') return null;

  const config = AVERAGE_CONFIG[level];
  const mainSubjects = subjects.filter(s => !s.isComplementary);

  let total = 0;

  for (const subject of mainSubjects) {
    const grade = entry.grades.find(g => g.subjectId === subject.id);
    if (!grade) continue;

    if (level === 'PRESCOLAIRE') {
      const val = PRESCOLAIRE_APPRECIATION_VALUES[grade.prescolaireAppréciation ?? ''] ?? 0;
      total += val;
    } else {
      total += grade.score ?? 0;
    }
  }

  if (level === 'PRESCOLAIRE') {
    const divisor = config.divisor(evalType);
    return divisor > 0 ? parseFloat(((total / (divisor * 3)) * 10).toFixed(2)) : null;
  }

  if (level === 'CM1' || level === 'CM2') {
    return parseFloat(((total / 170) * 20).toFixed(2));
  }

  // CP / CE
  const divisor = config.divisor(evalType);
  return divisor > 0 ? parseFloat((total / divisor).toFixed(2)) : null;
}

// ─────────────────────────────────────────────────────────────
// 3. APPRÉCIATION AUTOMATIQUE
// ─────────────────────────────────────────────────────────────

/**
 * Retourne l'appréciation textuelle automatique selon la moyenne et l'échelle.
 */
export function getAppreciation(average: number | null, scale: 10 | 20): string {
  if (average === null) return 'Absent';
  const table = scale === 20 ? APPRECIATIONS_SUR_20 : APPRECIATIONS_SUR_10;
  const found = table.find(a => average >= a.min && average <= a.max);
  return found?.text ?? '';
}

// ─────────────────────────────────────────────────────────────
// 4. CLASSEMENT (méthode standard ivoirienne)
// ─────────────────────────────────────────────────────────────

/**
 * Calcule les rangs selon la méthode standard ivoirienne :
 * - Tri décroissant par moyenne.
 * - Égalité → même rang.
 * - Le rang suivant est décalé du nombre d'ex-aequo.
 * - Les absents ne sont pas classés (rank = null).
 *
 * Exemple : Awa 17.5 → rang 1, Koffi 17.5 → rang 1, Yao 16.9 → rang 3
 */
export function rankStudents(
  entries: StudentEvaluationEntry[]
): StudentEvaluationEntry[] {
  const present = entries.filter(e => e.average !== null && e.average !== undefined);
  const absent  = entries.filter(e => e.average === null || e.average === undefined);

  const sorted = [...present].sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].average !== sorted[i - 1].average) {
      rank = i + 1;
    }
    sorted[i] = { ...sorted[i], rank };
  }

  return [
    ...sorted,
    ...absent.map(e => ({ ...e, rank: null })),
  ];
}

// ─────────────────────────────────────────────────────────────
// 5. CALCUL COMPLET D'UNE SESSION
// ─────────────────────────────────────────────────────────────

/**
 * Traite une liste d'entrées élève et retourne les entrées enrichies
 * avec moyenne, appréciation et rang.
 */
export function computeSessionResults(
  entries: StudentEvaluationEntry[],
  subjects: AcademicSubject[],
  level: SchoolLevelCategory,
  evalType: EvaluationType
): StudentEvaluationEntry[] {
  const scale = AVERAGE_CONFIG[level].scale;

  const withAverages = entries.map(entry => {
    const average = calculateAverage(entry, subjects, level, evalType);
    const appreciation = getAppreciation(average, scale);
    return { ...entry, average, appreciation };
  });

  return rankStudents(withAverages);
}

// ─────────────────────────────────────────────────────────────
// 6. PROGRESSION PRÉSCOLAIRE
// ─────────────────────────────────────────────────────────────

/**
 * Calcule la progression d'un élève préscolaire sur toutes les sessions.
 * Retourne un objet { [subjectId]: progression }
 */
export function getPrescolaireProgression(
  allSessionEntries: { subjectId: string; appreciation: PrescolaireAppréciation }[][]
): Record<string, 'En progression' | 'Stable' | 'En recul' | 'Non évalué'> {
  if (allSessionEntries.length < 2) return {};

  const result: Record<string, 'En progression' | 'Stable' | 'En recul' | 'Non évalué'> = {};
  const subjectIds = [...new Set(allSessionEntries.flatMap(s => s.map(g => g.subjectId)))];

  for (const subjectId of subjectIds) {
    const values = allSessionEntries.map(session => {
      const g = session.find(g => g.subjectId === subjectId);
      return g ? PRESCOLAIRE_APPRECIATION_VALUES[g.appreciation] ?? 0 : 0;
    });

    const first = values[0];
    const last  = values[values.length - 1];

    if (first === 0 && last === 0) {
      result[subjectId] = 'Non évalué';
    } else if (last > first) {
      result[subjectId] = 'En progression';
    } else if (last < first) {
      result[subjectId] = 'En recul';
    } else {
      result[subjectId] = 'Stable';
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// 7. UTILITAIRES
// ─────────────────────────────────────────────────────────────

/** Formate une moyenne en chaîne lisible (ex: 14.5 → "14,50") */
export function formatAverage(avg: number | null | undefined): string {
  if (avg === null || avg === undefined) return '—';
  return avg.toFixed(2).replace('.', ',');
}

/** Retourne le suffixe ordinal ivoirien (1er, 2ème, 3ème…) */
export function formatRank(rank: number | null | undefined): string {
  if (rank === null || rank === undefined) return '—';
  return rank === 1 ? '1er' : `${rank}ème`;
}

/** Génère un ID unique pour une session */
export function generateSessionId(
  classId: string,
  evalType: EvaluationType,
  sessionNumber: number
): string {
  return `SESSION-${classId}-${evalType}-${sessionNumber}-${Date.now()}`;
}
