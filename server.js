const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const timetable = require('./timetable');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ─── Timetable ──────────────────────────────────────── */

app.get('/api/courses', (_req, res) => res.json(timetable.getAllCourses()));

app.get('/api/schedule', (_req, res) => res.json(timetable.getSchedule()));

app.get('/api/schedule/:day', (req, res) => {
  const day = req.params.day.charAt(0).toUpperCase() + req.params.day.slice(1).toLowerCase();
  res.json(timetable.getClassesForDay(day));
});

/* ─── Auth ───────────────────────────────────────────── */

app.post('/api/login', async (req, res) => {
  try {
    const { rollNo, name } = req.body;
    if (!rollNo || !rollNo.trim()) return res.status(400).json({ error: 'Roll number is required' });
    const student = await db.getOrCreateStudent(rollNo, name || '');
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── Attendance ─────────────────────────────────────── */

app.get('/api/attendance/:rollNo', async (req, res) => {
  try {
    const records = await db.getAllAttendance(req.params.rollNo);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/:rollNo/:date', async (req, res) => {
  try {
    const records = await db.getDateAttendance(req.params.rollNo, req.params.date);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { rollNo, courseCode, date, status } = req.body;
    if (!rollNo || !courseCode || !date || !status)
      return res.status(400).json({ error: 'rollNo, courseCode, date, and status are all required' });
    if (!['present', 'absent'].includes(status))
      return res.status(400).json({ error: 'status must be "present" or "absent"' });
    
    const record = await db.markAttendance(rollNo, courseCode, date, status);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/attendance/:rollNo/:courseCode/:date', async (req, res) => {
  try {
    await db.deleteAttendance(req.params.rollNo, req.params.courseCode, req.params.date);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── Stats ──────────────────────────────────────────── */

app.get('/api/stats/:rollNo', async (req, res) => {
  try {
    const codes = timetable.getAllCourses().map((c) => c.code);
    const stats = await db.getStats(req.params.rollNo, codes);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── Fallback ───────────────────────────────────────── */

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Only listen if not running on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log();
    console.log('  \x1b[36m🎓 Attendance Tracker\x1b[0m');
    console.log(`  \x1b[90m➜\x1b[0m  Local:  \x1b[32mhttp://localhost:${PORT}\x1b[0m`);
    console.log();
  });
}

// Export the app for Vercel Serverless
module.exports = app;
