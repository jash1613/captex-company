# Startupwala Backend

A full Node.js + Express backend for the Startupwala clone website.

## Features

- ✅ Lead form API (`POST /api/enquiries`) with validation & rate limiting
- ✅ SQLite database — stores every enquiry with timestamp, IP, user agent
- ✅ Email notifications — admin alert + auto-reply to the lead (via Nodemailer)
- ✅ Admin dashboard at `/api/admin/enquiries` — login, stats, search, CSV export
- ✅ Status management — mark leads as New / Contacted / Converted / Closed
- ✅ Security — Helmet headers, CORS, rate limiting (5 submissions / 15 min / IP)
- ✅ Serves your frontend static files from the `public/` folder

---

## Project Structure

```
startupwala-backend/
├── server.js              # Express app entry point
├── db.js                  # SQLite init & connection
├── routes/
│   ├── enquiries.js       # POST/GET /api/enquiries
│   └── admin.js           # Login + dashboard HTML
├── services/
│   └── mailer.js          # Nodemailer email service
├── public/                # ← Put your frontend files here
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
├── data/                  # Auto-created — holds startupwala.db
├── .env.example           # Copy to .env and fill in your values
└── package.json
```

---

## Quick Start

### 1. Install dependencies
```bash
cd startupwala-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Open `.env` and set your values:
```
PORT=3000
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password   # NOT your regular password
NOTIFY_EMAIL=leads@yourdomain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
ADMIN_SECRET=your_random_secret_string
FRONTEND_URL=http://localhost:3000
```

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App Passwords → Generate one for "Mail".

### 3. Add your frontend files
Copy your `index.html`, `css/`, and `js/` into the `public/` folder:
```bash
mkdir -p public/css public/js
cp ../index.html   public/
cp ../style.css    public/css/
cp ../main.js      public/js/
```

### 4. Run the server
```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

Visit: **http://localhost:3000**

---

## API Reference

### `POST /api/enquiries`
Submits the lead form.

**Request body:**
```json
{
  "salutation": "Mr.",
  "first_name": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "city": "Hyderabad",
  "enquiry": "Pvt. Ltd. Registration",
  "Whatsapp_Consent": true,
  "html_page_name": "home_page"
}
```

**Success response:**
```json
{ "success": true, "message": "Thank you, Rahul! Our expert will call you shortly.", "id": 42 }
```

**Validation error:**
```json
{ "success": false, "errors": [{ "field": "phone", "msg": "Please enter a valid 10-digit Indian mobile number." }] }
```

---

### `GET /api/enquiries`
Returns paginated enquiries list. Requires `Authorization: Bearer <ADMIN_SECRET>` header.

Query params: `page`, `limit`, `search`, `status`

---

### `PATCH /api/enquiries/:id/status`
Updates enquiry status. Requires admin auth.

Body: `{ "status": "contacted" }` — values: `new | contacted | converted | closed`

---

### `POST /api/admin/login`
Body: `{ "username": "admin", "password": "your_password" }`
Returns: `{ "success": true, "token": "..." }`

---

### `GET /api/admin/stats`
Returns counts: total, new, contacted, converted, today's leads, top services.

---

### `GET /api/admin/enquiries`
Opens the visual Admin Dashboard in your browser (no auth needed to view the page — login is inside).

---

## Admin Dashboard

Navigate to **http://localhost:3000/api/admin/enquiries**

- Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from your `.env`
- View all leads with stats cards
- Search by name, email, or phone
- Filter by status
- Update lead status inline
- Export to CSV

---

## Deploying to Production

### Option A — Railway / Render / Fly.io
1. Push to GitHub
2. Connect repo in Railway/Render
3. Set environment variables in the dashboard
4. Deploy — done ✅

### Option B — VPS (Ubuntu)
```bash
npm install -g pm2
pm2 start server.js --name startupwala
pm2 save
pm2 startup
```
Then set up Nginx as a reverse proxy to port 3000.

---

## Security Notes

- Change `ADMIN_PASSWORD` and `ADMIN_SECRET` before deploying
- For production, use JWT instead of the shared `ADMIN_SECRET` token
- The database file is at `data/startupwala.db` — back it up regularly
- Rate limiter blocks 5+ submissions per IP per 15 minutes
