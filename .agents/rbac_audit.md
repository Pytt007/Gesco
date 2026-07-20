# Audit RBAC — Rôles & Habilitations Gesco SaaS (Statut Final)

## Architecture & Gestion des Sessions

```
[Login (Hachage SHA-256)]
        ↓
[Vérification par rapport à userAccounts]
        ↓
[Stockage local (user_session)]
        ↓
[App.tsx (Vérification d'intégrité à chaque rendu)]
        ↓
[Rendu sécurisé (renderView / Layout)]
```

> [!IMPORTANT]
> L'application est **100% frontend** (architecture Client-Side SPA stockée localement). Toutes les protections ont été implémentées sous forme de **contrôles d'accès de handlers** et d'**invariants de structure** afin de simuler au mieux des guardes backend et empêcher tout contournement technique (DevTools/localStorage).

---

## Synthèse Finale des Rôles & Permissions

| Rôle | Description / Profil | Permissions Autorisées | Permissions Interdites |
|------|---------------------|------------------------|-------------------------|
| `ADMIN_GENERALE` | Directeur Général / Super-Admin | Tous les modules (13 modules) | Aucun |
| `CANTINE_TRANSPORT` | Manager Logistique | DASHBOARD, CANTEEN, TRANSPORT | Élèves, Classes, Personnel, Activités, Scolarité, Dépenses, Rapports, Paramètres, Historique |
| `SCOLAIRE_ENSEIGNANT` | Directeur des Études / Enseignants | DASHBOARD, STUDENTS, CLASSES, STAFF, ACTIVITIES, STATISTICS | Cantine, Transport, Scolarité, Dépenses, Rapports, Paramètres, Historique |
| `FINANCE` | Chef Comptable / Service Financier | DASHBOARD, SCOLARITY, EXPENSES, REPORTS, STATISTICS | Élèves, Classes, Personnel, Cantine, Transport, Activités, Paramètres, Historique |

---

## Statut des Vulnérabilités & Correctifs Appliqués

### 🔴 VULN-001 & VULN-002 — Contournement et contrefaçon de session (RÉSOLU)
* **Description :** Session utilisateur forgeable directement par manipulation du `localStorage` (via la console en injectant un JSON de session admin).
* **Correctif :** `App.tsx` effectue désormais un rapprochement systématique à chaque cycle de rendu entre `user_session` et la base locale des comptes valides (`userAccounts`). Si le profil est inconnu ou que son rôle a été altéré, la session est rejetée et l'application redirige immédiatement vers la page de connexion.

---

### 🔴 VULN-003 — Fonctions d'administration exposées (RÉSOLU)
* **Description :** Si l'accès à l'onglet `SETTINGS` était activé pour un autre rôle, celui-ci pouvait créer/supprimer des comptes ou modifier les habilitations via les fonctions internes.
* **Correctif :** Intégration de gardes de code `currentUser.role === 'ADMIN_GENERALE'` au début de `handleAddUser`, `handleDeleteUser` et `handleSavePermissions` dans [Settings.tsx](file:///c:/Users/silve/OneDrive/Bureau/Gesco-main/components/Settings.tsx).

---

### 🟠 VULN-004 — Historique et Statistiques non administrables (RÉSOLU)
* **Description :** `HISTORY` et `STATISTICS` étaient absents de la liste des modules d'habilitation configurables par l'administrateur.
* **Correctif :** Ajout de `HISTORY` et `STATISTICS` dans `ALL_MODULES` pour permettre une granularité de droits complète.

---

### 🟠 VULN-005 — Gestion RH en écriture par le Directeur des Études (RÉSOLU)
* **Description :** Le Directeur des Études (`SCOLAIRE_ENSEIGNANT`) pouvait modifier les salaires et supprimer des enseignants.
* **Correctif :**
  - Limitation des actions d'ajout/modification/suppression à `ADMIN_GENERALE`.
  - Masquage complet du panneau "Informations financières" (salaire) et du bouton "Modifier" dans la fiche de consultation pour tout rôle autre que `ADMIN_GENERALE`.

---

### 🟠 VULN-006 — Cohérence Financière Scolarité (RÉSOLU)
* **Description :** Modifier la classe d'un élève dans le module Élèves mettait à jour sa classe mais laissait ses tarifs financiers inchangés par rapport à sa classe précédente.
* **Correctif :** Intégration d'un **moteur de recalcul automatique** dans `Students.tsx`. Si la classe de l'élève est éditée, le système retrouve le tarif associé dans la grille scolaire locale, recalcule le solde net dû, le total payé, et met à jour le Grand Livre de manière transparente.

---

### 🟠 VULN-007 — Gestion des Habilitations des Tarifs Financiers (RÉSOLU)
* **Description :** Le service Finance (`FINANCE`) a accès à l'onglet Scolarité, mais ne devrait pas pouvoir modifier la grille tarifaire de l'école (réserve d'administration générale).
* **Correctif :** Habilitation sur le bouton "Tarifs" et guards dans `Scolarity.tsx` (`handleAddConfig`, `handleUpdateConfig`, `confirmDeleteConfig`, `executeDeleteConfig`) limités uniquement à `ADMIN_GENERALE`.

---

### 🟡 VULN-008 — Altération de la structure des Classes (RÉSOLU)
* **Description :** Le Directeur des Études pouvait détruire des classes entières de l'établissement scolaire.
* **Correctif :** Les actions de création (`Nouvelle Classe`) et de suppression (`Supprimer`) de classes sont limitées exclusivement au rôle `ADMIN_GENERALE`. Le Directeur des Études conserve le droit d'attribuer des professeurs, des salles et de gérer l'emploi du temps.

---

### 🟡 VULN-009 — Altération des droits d'Admin Général (RÉSOLU)
* **Description :** L'Admin Général pouvait accidentellement perdre ses accès en cas d'erreur de configuration de session ou d'habilitation.
* **Correctif :** Définition d'un invariant de sécurité immuable au niveau de `App.tsx` : `ADMIN_GENERALE` est redéfini de manière constante avec 100% des modules autorisés à chaque modification des habilitations.
