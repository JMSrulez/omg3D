# omg3D — Impression 3D sur mesure à Marseille

Site web pour le service d'impression 3D **omg3D** (Marseille).

- Site vitrine moderne (FR / EN)
- Formulaire de devis avec envoi de fichiers 3D (STL, 3MF, STEP, OBJ)
- Backend Node.js pour le traitement des demandes et envoi d'emails
- Déploiement via Docker Compose (Nginx + backend)

**Site en ligne :** [https://omg3d.marseille.men](https://omg3d.marseille.men)

---

## Architecture

omg3d/
├── public/               # Frontend statique (HTML, CSS, images)
├── backend/              # API Node.js (formulaire de contact)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── nginx/
│   └── default.conf      # Configuration Nginx
├── compose.yaml          # Docker Compose
└── .env                  # Variables d'environnement (SMTP, etc.)


| Service   | Rôle                                      | Port interne |
|-----------|-------------------------------------------|--------------|
| `web`     | Nginx (fichiers statiques + reverse proxy)| 80           |
| `contact` | Backend Express (API `/api/contact`)      | 3000         |

---

## Prérequis

- Docker + Docker Compose
- Un serveur SMTP (Free, Gmail, OVH, etc.)

---

## Installation & lancement

1. **Cloner le dépôt**

```bash
git clone https://github.com/JMSrulez/omg3d.git
cd omg3d

2. **Configurer les variables d'environnement**

Crée un fichier .env à la racine (ou copie le modèle existant) :

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ton@email.com
SMTP_PASS=ton_mot_de_passe
MAIL_TO=ContactOmg3D@marseille.men
MAIL_FROM=ton@email.com
ALLOWED_ORIGIN=https://omg3d.marseille.men
MAX_FILE_MB=25

3. **Lancer les services**

docker compose up -d --build

Le site est accessible sur :

http://localhost:8081 (port défini dans compose.yaml)

Fonctionnalités principales

Formulaire de devis avec upload de fichiers 3D
Formats acceptés : .stl, .3mf, .step, .stp, .obj
Taille max configurable (défaut : 25 Mo)
Protection anti-spam (honeypot)
Emails HTML formatés + pièce jointe
Interface bilingue FR / EN
SEO optimisé (schema.org, sitemap, robots.txt, llms.txt)


Licence

Projet privé — tous droits réservés.
























