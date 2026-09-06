<p align="center">
  <img src="https://raw.githubusercontent.com/Julienlgn123/cours-studio/main/resources/icon.png" width="96" height="96" alt="Cours Studio" />
</p>

<h1 align="center">Cours Studio</h1>
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

## Démarrage

```bash
npm install
npm run dev
```

Build & packaging :

```bash
npm run build         # compile main + preload + renderer dans out/
npm run dist          # installeur Windows (nsis + portable) -> dist-installer/
npm run dist:mac      # dmg + zip (x64 + arm64)
npm run dist:linux    # AppImage + deb
```

### Builds multi-plateformes (CI)

Un workflow GitHub Actions (`.github/workflows/release.yml`) compile automatiquement
l'app sur les trois OS à chaque tag `v*`, et publie les artefacts en *GitHub Release*.

> **Apps non signées** : sans certificat développeur (payant), macOS affichera un
> avertissement Gatekeeper et Windows un avertissement SmartScreen à la première
> ouverture. C'est normal pour un build indé.
