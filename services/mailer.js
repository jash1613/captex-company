/* =============================================
   services/mailer.js
   Sends email notification for every new enquiry
   ============================================= */
const nodemailer = require('nodemailer');

/* ── Create transporter ── */
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/* ── Send enquiry notification to admin ── */
async function sendEnquiryEmail(data) {
  // Skip if SMTP not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[Mailer] SMTP not configured — skipping email.');
    return;
  }

  const transporter = createTransporter();
  const notifyTo    = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;

  /* ── Admin notification ── */
  await transporter.sendMail({
    from:    `"Startupwala Leads" <${process.env.SMTP_USER}>`,
    to:      notifyTo,
    subject: `🆕 New Lead #${data.id} — ${data.enquiry} — ${data.first_name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a1a3e;padding:20px 30px;border-radius:10px 10px 0 0">
          <h2 style="color:#F7941D;margin:0">New Lead — Startupwala</h2>
        </div>
        <div style="background:#f9f9f9;padding:30px;border:1px solid #eee">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#888;width:130px">Lead ID</td>     <td><strong>#${data.id}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#888">Name</td>        <td><strong>${data.salutation} ${data.first_name}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#888">Email</td>       <td><a href="mailto:${data.email}">${data.email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#888">Phone</td>       <td><a href="tel:${data.phone}">${data.phone}</a></td></tr>
            <tr><td style="padding:8px 0;color:#888">City</td>        <td>${data.city || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Service</td>     <td><strong style="color:#F7941D">${data.enquiry}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#888">WhatsApp</td>    <td>${data.Whatsapp_Consent ? '✅ Yes' : '❌ No'}</td></tr>
          </table>
        </div>
        <div style="background:#eee;padding:14px 30px;border-radius:0 0 10px 10px;font-size:12px;color:#999;text-align:center">
          Startupwala Lead Management System
        </div>
      </div>
    `
  });

  /* ── Auto-reply to the lead ── */
  await transporter.sendMail({
    from:    `"Startupwala" <${process.env.SMTP_USER}>`,
    to:      data.email,
    subject: `Thank you for contacting Startupwala — ${data.enquiry}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a1a3e;padding:24px 30px;border-radius:10px 10px 0 0;text-align:center">
          <h1 style="color:#F7941D;margin:0;font-size:26px">startupwala</h1>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px">Your Trusted Partner for Startup Legalities</p>
        </div>
        <div style="background:#ffffff;padding:36px 30px;border:1px solid #eee">
          <p style="font-size:16px;color:#333">Dear <strong>${data.salutation} ${data.first_name}</strong>,</p>
          <p style="color:#555;line-height:1.7;margin-top:12px">
            Thank you for reaching out to Startupwala! We have received your enquiry for
            <strong style="color:#F7941D">${data.enquiry}</strong>.
          </p>
          <p style="color:#555;line-height:1.7;margin-top:12px">
            One of our experts will contact you shortly on <strong>${data.phone}</strong>
            ${data.Whatsapp_Consent ? 'and via WhatsApp' : ''} to guide you through the process.
          </p>
          <div style="background:#fff8f0;border-left:4px solid #F7941D;padding:16px 20px;margin:24px 0;border-radius:0 8px 8px 0">
            <p style="margin:0;font-size:13px;color:#666">
              📞 <strong>Need immediate help?</strong><br>
              Call us at <a href="tel:+919555657657" style="color:#F7941D">+91-9555657657</a> &nbsp;|&nbsp;
              Mon–Sat, 9AM – 7PM IST
            </p>
          </div>
          <p style="color:#888;font-size:12px;margin-top:24px;line-height:1.6">
            <em>Disclaimer: Startupwala is a private entity providing process facilitation. This is NOT a Government website. Registrations are issued solely by the respective Government authorities.</em>
          </p>
        </div>
        <div style="background:#1a1a3e;padding:16px 30px;border-radius:0 0 10px 10px;text-align:center">
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0">
            © Startupwala Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </div>
    `
  });

  console.log(`[Mailer] ✅ Emails sent for lead #${data.id}`);
}

module.exports = { sendEnquiryEmail };
