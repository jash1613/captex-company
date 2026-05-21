/* =============================================
   routes/enquiries.js
   POST /api/enquiries  — submit lead form
   GET  /api/enquiries  — internal use only
   ============================================= */
const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { db }    = require('../db');
const { sendEnquiryEmail } = require('../services/mailer');

/* ── Rate limit: max 5 form submissions per IP per 15 min ── */
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many submissions. Please try again after 15 minutes.' }
});

/* ── Validation rules ── */
const validateEnquiry = [
  body('first_name')
    .trim().notEmpty().withMessage('Full name is required.')
    .isLength({ max: 100 }).withMessage('Name too long.'),
  body('email')
    .trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  body('phone')
    .trim().notEmpty().withMessage('Mobile number is required.')
    .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit Indian mobile number.'),
  body('enquiry')
    .trim().notEmpty().withMessage('Please select what you are looking for.')
    .isIn([
      'One Person Company Registration',
      'Pvt. Ltd. Registration',
      'LLP Registration',
      'Trademark Registration',
      'GST Registration',
      'MSME Registration',
      'ISO Certification',
      'Other Services'
    ]).withMessage('Invalid service selected.'),
  body('salutation')
    .optional().trim()
    .isIn(['Mr.', 'Ms.', 'Mrs.', '']).withMessage('Invalid salutation.'),
  body('city')
    .optional().trim().isLength({ max: 100 }),
  body('Whatsapp_Consent')
    .optional().toBoolean(),
  body('html_page_name')
    .optional().trim().isLength({ max: 100 })
];

/* ────────────────────────────────────────────
   POST /api/enquiries
   Called by the homepage lead form
   ──────────────────────────────────────────── */
router.post('/', formLimiter, validateEnquiry, async (req, res) => {
  /* Validation errors */
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
    });
  }

  const {
    salutation       = '',
    first_name,
    email,
    phone,
    city             = '',
    enquiry,
    Whatsapp_Consent = true,
    html_page_name   = 'home_page'
  } = req.body;

  const ip         = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const user_agent = (req.headers['user-agent'] || '').substring(0, 255);

  /* ── Save to database ── */
  const sql = `
    INSERT INTO enquiries
      (salutation, first_name, email, phone, city, enquiry,
       whatsapp_consent, html_page_name, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    salutation, first_name, email, phone, city, enquiry,
    Whatsapp_Consent ? 1 : 0, html_page_name, ip, user_agent
  ];

  db.run(sql, params, async function (err) {
    if (err) {
      console.error('[DB Error]', err.message);
      return res.status(500).json({ success: false, error: 'Could not save enquiry. Please try again.' });
    }

    const newId = this.lastID;
    console.log(`📩  New enquiry #${newId} — ${first_name} (${enquiry})`);

    /* ── Send notification email (non-blocking) ── */
    try {
      await sendEnquiryEmail({ id: newId, salutation, first_name, email, phone, city, enquiry, Whatsapp_Consent });
    } catch (mailErr) {
      console.warn('[Mail Warning] Email not sent:', mailErr.message);
      // Don't fail the request if email fails
    }

    return res.status(201).json({
      success: true,
      message: `Thank you, ${first_name}! Our expert will call you shortly.`,
      id: newId
    });
  });
});

/* ────────────────────────────────────────────
   GET /api/enquiries?page=1&limit=20
   Only accessible with valid admin token
   ──────────────────────────────────────────── */
router.get('/', requireAdmin, (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const status = req.query.status || null;
  const search = req.query.search ? `%${req.query.search}%` : null;

  let where  = 'WHERE 1=1';
  let params = [];

  if (status) { where += ' AND status = ?'; params.push(status); }
  if (search) {
    where += ' AND (first_name LIKE ? OR email LIKE ? OR phone LIKE ? OR enquiry LIKE ?)';
    params.push(search, search, search, search);
  }

  const countSql = `SELECT COUNT(*) as total FROM enquiries ${where}`;
  const dataSql  = `SELECT * FROM enquiries ${where} ORDER BY id DESC LIMIT ? OFFSET ?`;

  db.get(countSql, params, (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    const total = row.total;

    db.all(dataSql, [...params, limit, offset], (err2, rows) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });
      res.json({
        success: true,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        data: rows
      });
    });
  });
});

/* ── PATCH /api/enquiries/:id/status ── */
router.patch('/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const allowed = ['new', 'contacted', 'converted', 'closed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value.' });
  }
  db.run('UPDATE enquiries SET status = ? WHERE id = ?', [status, req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, error: 'Enquiry not found.' });
    res.json({ success: true, message: `Status updated to "${status}".` });
  });
});

/* ── Middleware: check admin token ── */
function requireAdmin(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || token !== (process.env.ADMIN_SECRET || 'secret_admin_token')) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }
  next();
}

module.exports = router;
