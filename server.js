// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// إنشاء أو فتح قاعدة البيانات
const db = new sqlite3.Database('./bookinghub.db');

// إنشاء جدول إذا لم يكن موجود
db.run(`CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  service TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
)`);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../bookinghub')));

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BookingHub API is running' });
});

// ✅ Get all bookings
app.get('/api/bookings', (req, res) => {
  db.all(`SELECT * FROM bookings`, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows, total: rows.length });
  });
});

// ✅ Get booking by ID
app.get('/api/bookings/:id', (req, res) => {
  db.get(`SELECT * FROM bookings WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: row });
  });
});

// ✅ Create new booking
app.post('/api/bookings', (req, res) => {
  const { name, email, service, date } = req.body;
  if (!name || !email || !service || !date) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  db.run(
    `INSERT INTO bookings (name, email, service, date) VALUES (?, ?, ?, ?)`,
    [name, email, service, date],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.status(201).json({ success: true, message: 'Booking created', id: this.lastID });
    }
  );
});

// ✅ Update booking (PUT)
app.put('/api/bookings/:id', (req, res) => {
  const { name, email, service, date, status } = req.body;
  db.run(
    `UPDATE bookings SET name = ?, email = ?, service = ?, date = ?, status = ? WHERE id = ?`,
    [name, email, service, date, status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
      res.json({ success: true, message: 'Booking updated' });
    }
  );
});

// ✅ Update booking status (PATCH)
app.patch('/api/bookings/:id/status', (req, res) => {
  const { status } = req.body;
  db.run(
    `UPDATE bookings SET status = ? WHERE id = ?`,
    [status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
      res.json({ success: true, message: `Booking status updated to ${status}` });
    }
  );
});

// ✅ Delete booking
app.delete('/api/bookings/:id', (req, res) => {
  db.run(`DELETE FROM bookings WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, message: 'Booking deleted' });
  });
});

// ✅ Get statistics
app.get('/api/stats', (req, res) => {
  db.all(
    `SELECT status, COUNT(*) as count FROM bookings GROUP BY status`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      const stats = { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
      rows.forEach(r => {
        stats[r.status] = r.count;
        stats.total += r.count;
      });
      res.json({ success: true, data: stats });
    }
  );
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../bookinghub/index.html'));
});

app.listen(port, () => {
  console.log(`
🚀 BookingHub Backend with SQLite Started!
📍 Port:http://localhost:3000/api/health
📊 API Endpoints ready...
  `);
});
