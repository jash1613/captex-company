/* =============================================
   STARTUPWALA BACKEND — server.js
   ============================================= */
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const path       = require('path');

const { initDB }        = require('./db');
const enquiryRoutes     = require('./routes/enquiries');
const adminRoutes       = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Security headers ── */
app.use(helmet({ contentSecurityPolicy: false }));

/* ── CORS ── */
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/* ── Body parsing ── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Serve frontend static files ── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── API Routes ── */
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/admin',     adminRoutes);

/* ── Health check ── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── Fallback: serve index.html for all non-API routes ── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── Global error handler ── */
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal server error' });
});

/* ── Boot ── */
/* ── Initialize DB ── */
initDB().then(() => {

  // Run locally only
  if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  }

}).catch(err => {
  console.error('❌ Database init failed:', err);
});

module.exports = app;
