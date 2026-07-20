# Plan d'Implémentation — Corrections P1 · P2 · P3

## Objectif
Corriger tous les problèmes Majeurs, Mineurs et Futurs identifiés dans l'audit final, sans toucher à la logique métier.

---

## Problèmes Infrastructure (F1, F2) — Hors Périmètre
> [!IMPORTANT]
> **F1 (Migration BDD)** et **F2 (JWT/OAuth)** nécessitent un backend serveur (Supabase, Firebase…). Ces items sont architecturaux et ne peuvent être exécutés sans choix d'infrastructure utilisateur. Ils sont exclus de ce plan.

---

## Proposed Changes

### Phase 1 — Refactoring Structurel (N1)

#### [NEW] hooks/useLocalStorage.ts
Extraire la définition de `useLocalStorage` (actuellement dupliquée dans `App.tsx`, `Canteen.tsx`, `Expenses.tsx`, `Transport.tsx`) vers un hook partagé centralisé.

#### [MODIFY] App.tsx
Supprimer la définition locale de `useLocalStorage` et importer depuis `./hooks/useLocalStorage`.

#### [MODIFY] components/Canteen.tsx
Supprimer la définition locale, importer depuis `../hooks/useLocalStorage`.

#### [MODIFY] components/Expenses.tsx
Idem.

#### [MODIFY] components/Transport.tsx
Idem.

---

### Phase 2 — Sécurité (M1) — Remplacement xlsx

> [!WARNING]
> La bibliothèque `xlsx` (SheetJS) présente 2 vulnérabilités HIGH sans correctif npm public. Elle sera remplacée par `@e965/xlsx` — le fork communautaire activement maintenu de SheetJS avec les CVEs corrigées — dont l'API est **100% compatible** (`import * as XLSX from '@e965/xlsx'`). Migration transparente, 0 modification de logique métier.

#### [MODIFY] package.json
Supprimer `"xlsx": "latest"`, ajouter `"@e965/xlsx": "latest"`.

#### [MODIFY] components/Finance.tsx, Reports.tsx, Scolarity.tsx, Expenses.tsx, Canteen.tsx, Activities.tsx, Transport.tsx
Remplacer `import * as XLSX from 'xlsx'` → `import * as XLSX from '@e965/xlsx'` dans les 7 fichiers.

---

### Phase 3 — Robustesse (N5) — ErrorBoundary React

#### [NEW] components/ErrorBoundary.tsx
Créer un composant `ErrorBoundary` React (class component) affichant un écran de secours convivial en cas d'exception non capturée.

#### [MODIFY] main.tsx (ou App.tsx)
Encadrer `<App>` dans `<ErrorBoundary>`.

---

### Phase 4 — Performance Build (N2) — Code Splitting

#### [MODIFY] vite.config.ts
Configurer `build.rollupOptions.output.manualChunks` pour séparer recharts (le module le plus lourd) du bundle principal.

---

### Phase 5 — Typage TypeScript (N4) — Suppression des `any`

#### [MODIFY] components/Students.tsx
Typer `feeConfigs?: any[]` avec `FeeConfig[]` depuis `types.ts`.

#### [MODIFY] App.tsx
Typer `classes: any[]` avec `ClassGroup[]`, `canteenSubscriptions: any[]` avec le bon type.

---

### Phase 6 — PWA & Offline (F4)

#### [MODIFY] vite.config.ts
Ajouter le plugin `vite-plugin-pwa` pour générer `manifest.json` et le Service Worker de cache offline.

#### [NEW] public/manifest.json
Configurer les métadonnées PWA (icônes, nom, description, couleurs).

---

### Phase 7 — Pagination des Tableaux (F5)

#### [MODIFY] components/Students.tsx
Ajouter une pagination (20 élèves/page) avec contrôles Précédent/Suivant.

#### [MODIFY] components/History.tsx
Ajouter une pagination (50 entrées/page) sur le journal d'audit.

---

### Phase 8 — Tests Automatisés (F3)

#### [NEW] vitest.config.ts
Configurer Vitest avec jsdom pour les tests unitaires React.

#### [NEW] tests/useLocalStorage.test.ts
Tests unitaires du hook partagé.

#### [NEW] tests/finance.test.ts
Tests des calculs financiers clés (frais de scolarité, remises, paiements partiels).

---

## Verification Plan

### Automated Tests
```bash
npm test               # Run Vitest test suite
npm run build          # Verify clean production compilation
npm audit              # Verify 0 HIGH vulnerabilities after xlsx migration
```

### Manuel
- Vérifier que les imports/exports Excel fonctionnent toujours (Scolarity, Canteen, Transport)
- Vérifier la pagination sur Students et History
- Vérifier le chargement offline (PWA) après build
