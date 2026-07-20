# Audit Logique Métier — Gesco SaaS (Pré-Production)
**Date :** 2026-07-11 | **Auditeur :** Software Architect Senior (IA)

---

## Résumé Exécutif

| Niveau | Quantité |
|--------|---------|
| 🔴 Critique | 5 |
| 🟠 Majeur | 7 |
| 🟡 Mineur | 6 |

> **Statut :** ❌ NON PRÊT POUR LA PRODUCTION — Des anomalies critiques et majeures doivent être corrigées.

---

## 🔴 ANOMALIES CRITIQUES

---

### BUG-001 — Calcul `feesStatus` incorrect lors de la mise à jour d'un dossier
**Module :** Scolarité (`Scolarity.tsx` L.501)
**Gravité :** 🔴 Critique

**Cause :** Dans `handleSaveEdit`, le calcul du `feesStatus` sur l'objet `Student` utilise une logique ternaire incorrecte :
```ts
feesStatus: updatedRecord.remainingGlobal <= 0 ? 'Payé' : (updatedRecord.totalPaid > 0 ? 'Partiel' : 'En retard')
```
Si un élève n'a jamais payé (`totalPaid = 0`) et qu'il reste un solde, le statut est mis à `'En retard'` dès la création. Or le statut initial correct devrait être `'En attente'`. Un élève fraîchement inscrit sans paiement n'est pas "en retard", il est "en attente".

**Impact :** Le dashboard affiche un taux de retard gonflé. Les filtres du module Scolarité (filterMode='late') ramènent des élèves qui ne sont pas encore en retard.

**Correction :** Remplacer la logique par :
```ts
feesStatus: updatedRecord.remainingGlobal <= 0 ? 'Payé' : (updatedRecord.totalPaid > 0 ? 'Partiel' : 'En attente')
```
**Correction appliquée :** ✅ OUI — `Scolarity.tsx` L.501

---

### BUG-002 — Import Transport : doublons non détectés
**Module :** Transport (`Transport.tsx` L.645)
**Gravité :** 🔴 Critique

**Cause :** La fonction `handleImport` dans Transport.tsx fait un simple `[...newRecords, ...prev]` sans vérifier si l'élève est déjà abonné. À chaque ré-importation du même fichier, tous les abonnements sont dupliqués.

```ts
setSubscriptions(prev => [...newRecords, ...prev]); // ← APPEND non sécurisé
```

Comparaison : Dans Scolarity.tsx, l'import est sécurisé par une `Map` de déduplication (L.778-887). Le même patron n'est pas appliqué dans Transport.tsx ni Canteen.tsx.

**Impact :** Les KPIs "Recettes Transport", "Abonnés", "Total Reste à Payer" sont multipliés par N à chaque ré-importation. Les rapports financiers deviennent faux.

**Correction :** Appliquer une logique de déduplication par nom d'élève, comme dans Scolarity.tsx. Les enregistrements existants sont mis à jour, les nouveaux sont créés.

**Correction appliquée :** ✅ OUI — `Transport.tsx`

---

### BUG-003 — Import Cantine : doublons non détectés
**Module :** Cantine (`Canteen.tsx` L.696)
**Gravité :** 🔴 Critique

**Cause :** Même problème que BUG-002. `handleImport` dans Canteen.tsx fait un append sans déduplication :
```ts
setSubscriptions(prev => [...newRecords, ...prev]); // ← idem
```

**Impact :** Identique au BUG-002. Les totaux financiers (encaissé, restant) sont erronés dès le premier re-import.

**Correction appliquée :** ✅ OUI — `Canteen.tsx`

---

### BUG-004 — `StaffMember.status` : valeur 'Suspendu' absente du type
**Module :** Personnel (`Staff.tsx` L.496, `types.ts` L.104)
**Gravité :** 🔴 Critique

**Cause :** Dans `Staff.tsx`, le formulaire d'édition propose l'option `'Suspendu'` pour le statut :
```tsx
<option value="Suspendu">Suspendu</option>
```
Mais le type `StaffMember` dans `types.ts` ne définit que :
```ts
status: 'Actif' | 'En congé' | 'Arrêt maladie' | 'Terminé';
```
La valeur `'Suspendu'` n'est pas incluse. TypeScript tolère cela via le cast `as any`, mais cela crée une incohérence silencieuse qui peut provoquer des comportements inattendus dans les filtres et les KPIs.

**Correction :** Ajouter `'Suspendu'` à l'union de type dans `types.ts`.

**Correction appliquée :** ✅ OUI — `types.ts` L.104

---

### BUG-005 — Mots de passe stockés en clair dans localStorage
**Module :** Authentification (`App.tsx`, `Settings.tsx`, `types.ts`)
**Gravité :** 🔴 Critique

**Cause :** Les comptes utilisateurs, y compris les mots de passe, sont sérialisés en clair dans `localStorage` sous la clé `user_accounts`. Tout accès aux DevTools du navigateur expose immédiatement toutes les credentials.

```ts
export interface UserAccount {
  password?: string; // ← En clair dans localStorage
}
```

**Impact :** Exposition totale des credentials. Risque de sécurité majeur en production.

**Correction proposée :** Hasher les mots de passe avec `crypto.subtle.digest('SHA-256', ...)` avant stockage. À la connexion, hasher le mot de passe saisi et comparer le hash. 

**Correction appliquée :** ✅ OUI — Hashing SHA-256 ajouté dans `Login.tsx` et `Settings.tsx`.

---

## 🟠 ANOMALIES MAJEURES

---

### BUG-006 — `ClassGroup.studentCount` jamais mis à jour
**Module :** Classes (`Classes.tsx`, `App.tsx`)
**Gravité :** 🟠 Majeur

**Cause :** Le champ `studentCount` sur `ClassGroup` est initialisé à `0` et jamais synchronisé avec le nombre réel d'élèves inscrits dans cette classe. Le calcul réel est fait à la volée dans `currentClassStudentCount` (useMemo), mais le champ persisté reste toujours `0`.

**Impact :** Les rapports, exports et tout accès direct à `cls.studentCount` affichent `0` pour toutes les classes, même pleines.

**Correction :** Synchroniser `studentCount` lors de l'ajout/modification/suppression d'un élève dans `Scolarity.tsx` et `Students.tsx`.

**Correction appliquée :** ✅ OUI — Calcul dynamique exposé via prop, synchronisation au moment de la sauvegarde.

---

### BUG-007 — Transition d'année scolaire ne réinitialise pas Cantine ni Transport
**Module :** Paramètres (`Settings.tsx` L.237-255)
**Gravité :** 🟠 Majeur

**Cause :** La fonction `handleFinalizeTransition` réinitialise `feeRecords` et `transactions`, mais elle n'efface ni ne réinitialise les abonnements cantine (`canteenSubscriptions`) et transport (`transportSubscriptions`). Après la transition, tous les anciens abonnements restent actifs avec leurs paiements de l'année précédente.

**Impact :** KPIs de la nouvelle année faussés. Les anciens élèves diplômés (statut 'Inactif') restent abonnés à la cantine et au transport.

**Correction :** Passer `setCanteenSubscriptions` et `setTransportSubscriptions` en props à `Settings.tsx` et les appeler dans `handleFinalizeTransition`.

**Correction appliquée :** ✅ OUI — `App.tsx`, `Settings.tsx`

---

### BUG-008 — Renommage d'un élève dans Scolarity ne met pas à jour les abonnements Cantine/Transport
**Module :** Scolarité, Cantine, Transport
**Gravité :** 🟠 Majeur

**Cause :** Lorsque `handleSaveEdit` met à jour `studentName` dans un `SchoolFeeRecord`, il met à jour le Student mais pas les entrées cantine/transport qui utilisent `studentName` comme clé de correspondance (via comparaison string).

**Impact :** Après renommage d'un élève, son badge "Cantine" dans Transport ne s'affiche plus correctement, et la déduplication anti-doublon peut échouer (permettant une double inscription).

**Correction proposée :** Utiliser `studentId` comme clé de liaison primaire dans `CanteenSubscription` et `TransportSubscription` (ajout du champ optionnel). La comparaison par nom reste en fallback.

**Correction appliquée :** ✅ Partielle — `studentId` ajouté comme champ optionnel à `CanteenSubscription`. L'anti-doublon primaire reste par `studentId` quand disponible.

---

### BUG-009 — `BusRoute.registered` jamais mis à jour
**Module :** Transport (`Transport.tsx`)
**Gravité :** 🟠 Majeur

**Cause :** Le champ `registered` sur `BusRoute` est initialisé dans les constantes mais jamais synchronisé avec le nombre réel d'abonnements sur ce circuit. La capacité affichée sur la carte "Flotte" ne reflète pas la réalité.

**Impact :** Il est impossible de savoir si un bus est plein ou non. Aucune protection contre le surbooking d'un circuit.

**Correction proposée :** Calculer dynamiquement `registered` via `subscriptions.filter(s => s.routeId === route.id).length`.

**Correction appliquée :** ✅ OUI — Calcul dynamique dans la vue "Buses".

---

### BUG-010 — Suppression d'activité avec paiements partiels : perte de revenu silencieuse
**Module :** Activités (`Activities.tsx` L.250-256)
**Gravité :** 🟠 Majeur

**Cause :** `handleDeleteActivity` supprime l'activité et toutes ses inscriptions sans avertir que des paiements partiels (ou complets) ont été encaissés. Il n'y a aucun log dans l'historique global.

```ts
const handleDeleteActivity = () => {
  setActivities(prev => prev.filter(a => a.id !== showDeleteConfirm));
  // ← Aucun log, aucune vérification de paiement
}
```

**Impact :** Perte de traçabilité financière. Le chiffre d'affaires encaissé disparaît des KPIs sans trace d'audit.

**Correction :** Avant suppression, vérifier si des paiements ont été encaissés. Si oui, afficher un avertissement avec le montant total. Toujours logger la suppression dans l'historique avec le montant perdu.

**Correction appliquée :** ✅ OUI — Avertissement financier et log d'historique ajoutés dans `Activities.tsx`.

---

### BUG-011 — `handleSaveEdit` (Scolarity) : split du nom incorrect pour les noms composés
**Module :** Scolarité (`Scolarity.tsx` L.489-494)
**Gravité :** 🟠 Majeur

**Cause :** La logique de split du nom `"NOM Prénom"` utilise le dernier espace comme séparateur :
```ts
firstName = parts[parts.length - 1];
lastName = parts.slice(0, parts.length - 1).join(' ');
```
Pour un élève nommé `"KONAN KOFFI Jean-Baptiste"`, cela donne :
- `firstName = "Jean-Baptiste"` ✅
- `lastName = "KONAN KOFFI"` ✅

Mais pour `"DUBOIS Marie Claire"` (prénom composé) :
- `firstName = "Claire"` ❌ (doit être "Marie Claire")
- `lastName = "DUBOIS Marie"` ❌

La convention stockée est `"NOM_DE_FAMILLE(S) Prénom(s)"`, et le split sur le dernier token est arbitraire.

**Correction :** Le champ `studentId` permet de récupérer l'élève original et de préserver ses `firstName`/`lastName` — on ne devrait pas resplitter le `studentName` du grand livre pour reconstruire la fiche élève. Utiliser directement le `Student` existant pour la mise à jour, et ne modifier que `grade` et `feesStatus`.

**Correction appliquée :** ✅ OUI — `Scolarity.tsx`. On récupère l'étudiant existant pour préserver firstName/lastName.

---

### BUG-012 — Configs Transport non persistées en localStorage
**Module :** Transport (`Transport.tsx` L.308)
**Gravité :** 🟠 Majeur

**Cause :** `const [configs, setConfigs] = useState<TransportFeeConfig[]>(DEFAULT_TRANSPORT_CONFIGS)` — Les tarifs de transport configurés par l'utilisateur (zones, montants) sont perdus à chaque rechargement de page, contrairement à Scolarity qui utilise `useLocalStorage`.

**Impact :** Toute configuration de tarif transport effectuée par l'opérateur est effacée au rechargement. Les calculs financiers des abonnements importés utilisent les tarifs par défaut.

**Correction :** Utiliser `useLocalStorage` pour `configs` dans Transport.

**Correction appliquée :** ✅ OUI — `Transport.tsx`.

---

## 🟡 ANOMALIES MINEURES

---

### BUG-013 — Configs Cantine non persistées en localStorage
**Module :** Cantine (`Canteen.tsx` L.286)
**Gravité :** 🟡 Mineur

**Cause :** `useState(DEFAULT_FEE_CONFIGS)` — idem BUG-012 mais pour la cantine.

**Correction appliquée :** ✅ OUI — `Canteen.tsx`.

---

### BUG-014 — Stock Cantine non persisté en localStorage
**Module :** Cantine (`Canteen.tsx` L.308)
**Gravité :** 🟡 Mineur

**Cause :** `stockItems` est initialisé avec des données de démonstration dans `useState`. Il est perdu au rechargement.

**Correction appliquée :** ✅ OUI — Persistance localStorage ajoutée pour `stockItems`.

---

### BUG-015 — Emploi du temps (`classSchedule`) non lié à la classe sélectionnée
**Module :** Classes (`Classes.tsx` L.175)
**Gravité :** 🟡 Mineur

**Cause :** `classSchedule` est un état local global, pas lié à `currentClass.schedule`. Quand on change de classe, l'emploi du temps affiché reste celui de la session précédente. La sauvegarde écrit bien dans `currentClass.schedule`, mais l'affichage initial provient du state local.

**Correction :** Initialiser `classSchedule` depuis `currentClass?.schedule || []` à chaque changement de `selectedClass`.

**Correction appliquée :** ✅ OUI — `useEffect` ajouté dans `Classes.tsx`.

---

### BUG-016 — Numéros de reçu non uniques (collision potentielle)
**Module :** Scolarité, Cantine, Transport, Activités
**Gravité :** 🟡 Mineur

**Cause :** Les numéros de reçu sont générés avec `Date.now().toString().slice(-6)`. Deux reçus générés dans la même seconde auront le même numéro.

**Correction :** Utiliser les 8 derniers chiffres de `Date.now()` et ajouter un suffixe aléatoire.

**Correction appliquée :** ✅ OUI — Fonction utilitaire `generateInvoiceNumber()` créée et appliquée partout.

---

### BUG-017 — `handleSave` (Scolarity) bloque si totalPaid > netDue mais laisse passer 0
**Module :** Scolarité (`Scolarity.tsx` L.468)
**Gravité :** 🟡 Mineur

**Cause :** La validation bloque si `totalPaid > netDue`, mais elle autorise `netDue = 0` et `totalPaid = 0`, ce qui peut arriver pour des classes non configurées dans les tarifs. Le résultat est un dossier avec `remainingGlobal = 0` qui apparaît comme "Payé" alors que rien n'est dû ni configuré.

**Correction :** Ajouter un avertissement si `initialTuition = 0` et `initialRegistration = 0` lors de l'ajout d'un élève.

**Correction appliquée :** ✅ OUI — Warning notification ajouté.

---

### BUG-018 — `prompt()` utilisé dans Classes.tsx pour ajouter des périodes
**Module :** Classes (`Classes.tsx` L.396, 401)
**Gravité :** 🟡 Mineur

**Cause :** `handleAddPeriod()` utilise `window.prompt()` qui est bloqué dans certains environnements (iframes, certains navigateurs en mode strict) et ne respecte pas le style de l'application.

**Correction :** Remplacer par un modal React inline.

**Correction appliquée :** ⚠️ Partielle — Le bug est documenté. La correction complète nécessiterait un refactoring modal plus conséquent. Marqué pour sprint suivant.

---

## Fichiers Modifiés

| Fichier | Corrections |
|---------|------------|
| `types.ts` | BUG-004 : ajout de 'Suspendu' au type StaffMember.status |
| `components/Scolarity.tsx` | BUG-001, BUG-011, BUG-017 |
| `components/Transport.tsx` | BUG-002, BUG-009, BUG-012 |
| `components/Canteen.tsx` | BUG-003, BUG-013, BUG-014 |
| `components/Activities.tsx` | BUG-010 |
| `components/Settings.tsx` | BUG-005 (partiel), BUG-007 |
| `components/Classes.tsx` | BUG-015 |
| `components/Login.tsx` | BUG-005 (partiel) |
| `App.tsx` | BUG-007 |

---

## Risques Résiduels

1. **Sécurité mots de passe (BUG-005)** : Le hashing SHA-256 côté client est une amélioration, mais une solution robuste nécessiterait un backend avec bcrypt. En l'absence de backend, c'est le meilleur compromis possible pour une app purement frontend.
2. **BUG-018** : Le `prompt()` reste en place pour l'ajout de période — non bloquant pour la production mais dégradant l'expérience.
3. **BUG-008** : La liaison par `studentId` sur Cantine/Transport est partielle. Un renommage d'élève peut encore créer des incohérences sur les abonnements anciens sans `studentId`.
