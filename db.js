/* =============================================
   db.js — SQLite database setup
   ============================================= */
const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');

const DB_PATH = process.env.DB_PATH || '/tmp/startupwala.db';



const db = new sqlite3.Database(DB_PATH);

function initDB() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      /* ── Enquiries table ── */
      db.run(`
        CREATE TABLE IF NOT EXISTS enquiries (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          salutation      TEXT    DEFAULT '',
          first_name      TEXT    NOT NULL,
          email           TEXT    NOT NULL,
          phone           TEXT    NOT NULL,
          city            TEXT    DEFAULT '',
          enquiry         TEXT    NOT NULL,
          whatsapp_consent INTEGER DEFAULT 1,
          html_page_name  TEXT    DEFAULT 'home_page',
          ip_address      TEXT    DEFAULT '',
          user_agent      TEXT    DEFAULT '',
          status          TEXT    DEFAULT 'new',
          created_at      TEXT    DEFAULT (datetime('now','localtime'))
        )
      `, (err) => {
        if (err) return reject(err);
      });

      /* ── Admin users table ── */
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          username   TEXT UNIQUE NOT NULL,
          password   TEXT        NOT NULL,
          created_at TEXT DEFAULT (datetime('now','localtime'))
        )
      `, (err) => {
        if (err) return reject(err);

        // Seed default admin if not exists
        const user = process.env.ADMIN_USERNAME || 'admin';
        const pass = process.env.ADMIN_PASSWORD || 'changeme123';
        db.run(
          `INSERT OR IGNORE INTO admin_users (username, password) VALUES (?, ?)`,
          [user, pass],
          (err2) => {
            if (err2) return reject(err2);
            console.log('📦  Database ready:', DB_PATH);
            resolve();
          }
        );
      });
    });
  });
}

module.exports = { db, initDB };
