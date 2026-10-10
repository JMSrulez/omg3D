'use strict';

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Config (via env) ----------
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.example.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // true = port 465
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_TO = process.env.MAIL_TO || 'ContactOmg3D@marseille.men';
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || 'noreply@marseille.men';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://omg3d.marseille.men';
const MAX_FILE_MB = parseInt(process.env.MAX_FILE_MB || '25', 10);

// ---------- Multer (mémoire, max 25 Mo) ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.stl', '.3mf', '.step', '.stp', '.obj'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Formats acceptés : STL, 3MF, STEP, OBJ.'));
    }
  },
});

app.use(cors({
  origin: (origin, cb) => {
    // Autoriser le site + requêtes sans origin (curl, healthcheck)
    if (!origin || origin === ALLOWED_ORIGIN || origin === 'http://localhost' || origin.startsWith('http://localhost:')) {
      cb(null, true);
    } else {
      cb(new Error('Origin non autorisée'));
    }
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---------- Endpoint principal ----------
app.post('/api/contact', (req, res) => {
  upload.single('attachment')(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? `Fichier trop volumineux (max ${MAX_FILE_MB} Mo).`
        : (err.message || 'Erreur upload');
      return res.status(400).json({ success: false, message: msg });
    }

    try {
      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '').trim();
      const type = String(req.body.type || '').trim();
      const qte = String(req.body.qte || '1').trim();
      const rdv = String(req.body.rdv || '').trim() || '—';
      const message = String(req.body.message || '').trim();

      // Honeypot anti-spam (champ caché)
      if (req.body.botcheck || req.body._gotcha) {
        return res.json({ success: true, message: 'OK' }); // silence bot
      }

      if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: 'Nom, email et message sont obligatoires.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Email invalide.' });
      }

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      });

      const fileInfo = req.file
        ? `${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} Ko)`
        : 'aucun';

      const textBody = [
        `Nouvelle demande omg3D`,
        ``,
        `Nom       : ${name}`,
        `Email     : ${email}`,
        `Type      : ${type}`,
        `Quantité  : ${qte}`,
        `RDV       : ${rdv}`,
        `Fichier   : ${fileInfo}`,
        ``,
        `Message :`,
        message,
      ].join('\n');

      const htmlBody = `
        <h2>Nouvelle demande omg3D</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:4px 12px 4px 0;color:#666">Nom</td><td><b>${escapeHtml(name)}</b></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Type</td><td>${escapeHtml(type)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Quantité</td><td>${escapeHtml(qte)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">RDV</td><td>${escapeHtml(rdv)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Fichier</td><td>${escapeHtml(fileInfo)}</td></tr>
        </table>
        <h3 style="margin-top:20px">Message</h3>
        <pre style="white-space:pre-wrap;font-family:sans-serif;background:#f6f4ef;padding:12px;border-radius:8px">${escapeHtml(message)}</pre>
      `;

      const mailOptions = {
        from: `"omg3D Formulaire" <${MAIL_FROM}>`,
        to: MAIL_TO,
        replyTo: email,
        subject: `[omg3D] ${type || 'Demande'} — ${name}`,
        text: textBody,
        html: htmlBody,
        attachments: req.file
          ? [{
              filename: req.file.originalname,
              content: req.file.buffer,
              contentType: req.file.mimetype || 'application/octet-stream',
            }]
          : [],
      };

      await transporter.sendMail(mailOptions);

      return res.json({ success: true, message: 'Demande envoyée.' });
    } catch (e) {
      console.error('Contact error:', e);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de l\'envoi. Réessayez ou écrivez à ContactOmg3D@marseille.men',
      });
    }
  });
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`omg3d-contact listening on :${PORT}`);
});
