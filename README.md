# 🏫 GESCO - SaaS de Gestion Scolaire

GESCO est une application web moderne de type SaaS conçue pour simplifier la gestion administrative, pédagogique, et financière des établissements scolaires. Elle offre une interface fluide, adaptative et sécurisée, adaptée à différents profils d'utilisateurs.

---

## 🚀 Fonctionnalités Principales

### 📊 1. Tableau de Bord (Dashboard)
- Vue d'ensemble en temps réel des statistiques clés (nombre total d'élèves, taux de présence, transactions financières).
- Raccourcis d'actions rapides et flux d'activité récent (journal d'audit).
- Graphiques financiers et administratifs pour une aide à la décision.

### 👥 2. Gestion des Élèves & Classes
- **Élèves :** Fiches d'inscription complètes avec photo, coordonnées des parents, statut des abonnements (cantine/transport) et historique des paiements.
- **Classes :** Répartition des élèves par classe (ex: CP, CE1, CM2), capacité maximale de chaque salle, et affectation de l'enseignant titulaire.

### 💼 3. Gestion du Personnel (RH)
- Annuaire du personnel enseignant et administratif.
- Suivi du statut de recrutement, des matières enseignées, et des informations de contact.

### 🍽️ 4. Cantine & Transport
- **Cantine :** Planification des menus hebdomadaires et suivi des élèves abonnés.
- **Transport :** Gestion des lignes de bus (itinéraires, arrêts) et des abonnements de transport des élèves.

### 💳 5. Scolarité & Finances (Comptabilité)
- **Grand Livre de Scolarité :** Suivi des frais de scolarité par élève (payé, en retard, partiel).
- **Tarifs :** Configuration dynamique des frais de scolarité selon les niveaux de classe.
- **Dépenses :** Enregistrement des frais de fonctionnement de l'établissement.
- **Transactions :** Historique complet des entrées (frais de scolarité, cantine) et des sorties (salaires, fournitures).

### 📈 6. Rapports, Statistiques & Audit
- **Rapports :** Génération et exportation de rapports administratifs et comptables aux formats PDF et Excel.
- **Statistiques :** Graphiques interactifs (Recharts) sur l'évolution des effectifs et la santé financière.
- **Journal d'Audit :** Historique complet et inaltérable des actions effectuées par les utilisateurs pour une transparence totale.

---

## 🛠️ Architecture Technique

L'application est construite sur une pile technique robuste et moderne :

- **Frontend :** React 19 (avec TypeScript)
- **Outil de Build & Serveur Dev :** Vite
- **Styling :** Tailwind CSS (avec un design system adaptatif fluide personnalisé)
- **Icônes :** Lucide React (mises à l'échelle proportionnellement avec le texte)
- **Graphiques :** Recharts
- **Persistance & Base de Données :** Supabase (PostgreSQL avec support Realtime)
- **Sécurité :** Row Level Security (RLS) et politiques d'accès configurées par rôle
- **Stockage :** Supabase Storage (bucket `gesco-assets` pour les logos et avatars)
- **Tests :** Vitest & Testing Library

---

## 📂 Structure du Projet

```text
├── components/          # Composants React de l'application (Dashboard, Students, Scolarity, etc.)
├── hooks/               # Hooks React personnalisés (ex: useLocalStorage)
├── services/            # Logique métier et helpers
├── constants.ts         # Données mockées et constantes globales
├── types.ts             # Définitions des interfaces TypeScript
├── index.css            # Styles globaux et design system fluide adaptatif
├── App.tsx              # Point d'entrée principal et routeur logique
├── index.tsx            # Initialisation React dans le DOM
├── index.html           # Structure HTML racine
├── tsconfig.json        # Configuration de TypeScript
├── vite.config.ts       # Configuration du bundler Vite
└── vitest.config.ts     # Configuration de l'environnement de test Vitest
```

---

## 👥 Profils d'Accès & Sécurité

L'application intègre un système d'habilitation basé sur les rôles (RBAC) pour restreindre l'accès aux modules sensibles :

| Module / Vue | Admin Général | Scolaire / Enseignant | Finance | Cantine & Transport |
| :--- | :---: | :---: | :---: | :---: |
| **Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **Élèves** | ✅ | ✅ | ❌ | ❌ |
| **Classes** | ✅ | ✅ | ❌ | ❌ |
| **Personnel** | ✅ | ✅ | ❌ | ❌ |
| **Cantine** | ✅ | ❌ | ❌ | ✅ |
| **Transport** | ✅ | ❌ | ❌ | ✅ |
| **Activités** | ✅ | ✅ | ❌ | ❌ |
| **Scolarité** | ✅ | ❌ | ✅ | ❌ |
| **Dépenses** | ✅ | ❌ | ✅ | ❌ |
| **Rapports** | ✅ | ❌ | ✅ | ❌ |
| **Historique** | ✅ | ❌ | ❌ | ❌ |
| **Statistiques**| ✅ | ✅ | ✅ | ❌ |
| **Paramètres** | ✅ | ❌ | ❌ | ❌ |

---

## ⚙️ Installation & Démarrage local

### Prérequis
- [Node.js](https://nodejs.org/) (Version 18 ou supérieure recommandée)
- npm (installé par défaut avec Node.js)
- Un compte [Supabase](https://supabase.com)

### 💻 Configuration du Backend (Supabase)

Pour initialiser la base de données et l'authentification du SaaS :

1. **Créer un nouveau projet** sur la console [Supabase](https://supabase.com).
2. **Exécuter le schéma SQL :**
   - Ouvrez l'**Éditeur SQL** (*SQL Editor*) de votre projet Supabase.
   - Copiez-collez et exécutez l'intégralité du contenu du fichier [supabase/schema.sql](file:///c:/Users/SUPREME%20COM/Documents/Gesco-main/Gesco-main/supabase/schema.sql). Cela va configurer les tables, les index, le bucket de stockage de médias (`gesco-assets`), l'écoute temps réel (*Realtime*) et les politiques de sécurité par rôle (RLS).
3. **Configurer les variables d'environnement :**
   - Créez un fichier `.env.local` à la racine du projet (copiez le modèle de `.env.example`).
   - Renseignez les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` récupérées dans **Settings > API** de votre tableau de bord Supabase.

### 🚀 Étapes de lancement

1. **Cloner le dépôt et se placer dans le projet :**
   ```bash
   cd Gesco-main
   ```

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```
   L'application sera disponible sur [http://localhost:3000/](http://localhost:3000/).

4. **Lancer les tests unitaires :**
   ```bash
   npm run test
   ```

5. **Générer le build de production :**
   ```bash
   npm run build
   ```
