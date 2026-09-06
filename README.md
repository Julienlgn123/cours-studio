<p align="center">
  <img src="https://raw.githubusercontent.com/Julienlgn123/cours-studio/main/banner.png" alt="Cours Studio" width="100%" />
</p>

<p align="center">Prise et gestion de cours en local : éditeur riche, résumés/QCM par IA, enregistrement audio.</p>

<p align="center">
  📦 Fait partie de la suite <a href="https://github.com/Julienlgn123/open-studio"><b>Open Studio</b></a> —
  pas besoin de télécharger l'installateur ici : installe Open Studio une seule fois, et Cours Studio
  (comme les autres outils de la suite) devient téléchargeable et lançable directement depuis son catalogue.
</p>

---

## Fonctionnalités

- Éditeur de cours riche (Tiptap) : mise en forme, tableaux, listes de tâches, formules mathématiques (KaTeX).
- Import de documents existants (Word, PDF) directement dans un cours.
- Enregistrement audio des cours (ffmpeg embarqué).
- Résumés et QCM générés à partir du contenu d'un cours.
- 100 % local : SQLite embarqué, aucune donnée envoyée à un serveur.

---

## Stack

| Couche | Techno |
|---|---|
| Desktop | Electron 35, electron-vite, electron-builder |
| UI | React 18, TypeScript, Zustand, Framer Motion, Lucide |
| Éditeur | Tiptap, KaTeX |
| Données | better-sqlite3 (local) |
| Documents | mammoth (Word), pdf-parse (PDF), ffmpeg-static (audio) |

---

## Installation

Cours Studio s'installe et se met à jour directement depuis
[**Open Studio**](https://github.com/Julienlgn123/open-studio) : télécharge sa
dernière release, puis choisis Cours Studio dans son catalogue — téléchargement,
installation et mises à jour se font depuis là, en un clic.

> **App non signée** : sans certificat développeur (payant), macOS affichera un
> avertissement Gatekeeper et Windows un avertissement SmartScreen à la première
> ouverture. C'est normal pour un build indé.
