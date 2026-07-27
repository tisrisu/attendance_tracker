const fs = require('fs');
const path = require('path');
const { createClient } = require('@vercel/kv');

const DB_FILE = path.join(__dirname, 'attendance_data.json');

// Upstash Redis from Marketplace uses different env vars than Vercel KV
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const useKV = !!(url && token);
const kv = useKV ? createClient({ url, token }) : null;

// ─── Local Fallback Helpers ──────────────────────────
function loadLocal() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (_) {}
  return { students: {}, attendance: [], _nextId: 1 };
}

function saveLocal(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// ─── Vercel KV Helpers ───────────────────────────────
async function getStudentKV(rollNo) {
  return (await kv.get(`student:${rollNo}`)) || null;
}
async function setStudentKV(rollNo, data) {
  await kv.set(`student:${rollNo}`, data);
}
async function getAttendanceKV(rollNo) {
  return (await kv.get(`attendance:${rollNo}`)) || [];
}
async function setAttendanceKV(rollNo, data) {
  await kv.set(`attendance:${rollNo}`, data);
}

// ─── Public API (Async) ──────────────────────────────

module.exports = {
  async getOrCreateStudent(rollNo, name = '') {
    const r = rollNo.toUpperCase().trim();
    
    if (useKV) {
      let student = await getStudentKV(r);
      if (!student) {
        student = { roll_no: r, name, created_at: now() };
        await setStudentKV(r, student);
      } else if (name && student.name !== name) {
        student.name = name;
        await setStudentKV(r, student);
      }
      return student;
    } else {
      const data = loadLocal();
      if (!data.students[r]) {
        data.students[r] = { roll_no: r, name, created_at: now() };
      } else if (name) {
        data.students[r].name = name;
      }
      saveLocal(data);
      return data.students[r];
    }
  },

  async getAllAttendance(rollNo) {
    const r = rollNo.toUpperCase().trim();
    
    let records = [];
    if (useKV) {
      records = await getAttendanceKV(r);
    } else {
      const data = loadLocal();
      records = data.attendance.filter((a) => a.roll_no.toUpperCase() === r);
    }

    return records.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : a.course_code.localeCompare(b.course_code)));
  },

  async getDateAttendance(rollNo, date) {
    const records = await this.getAllAttendance(rollNo);
    return records.filter((a) => a.date === date).sort((a, b) => a.course_code.localeCompare(b.course_code));
  },

  async markAttendance(rollNo, courseCode, date, status) {
    const r = rollNo.toUpperCase().trim();
    
    if (useKV) {
      let records = await getAttendanceKV(r);
      const idx = records.findIndex((a) => a.course_code === courseCode && a.date === date);
      
      if (idx !== -1) {
        records[idx].status = status;
        records[idx].marked_at = now();
      } else {
        records.push({
          id: Date.now(), // simple unique id
          roll_no: r,
          course_code: courseCode,
          date,
          status,
          marked_at: now(),
        });
      }
      await setAttendanceKV(r, records);
      return { rollNo: r, courseCode, date, status };
    } else {
      const data = loadLocal();
      const idx = data.attendance.findIndex(
        (a) => a.roll_no.toUpperCase() === r && a.course_code === courseCode && a.date === date
      );
      if (idx !== -1) {
        data.attendance[idx].status = status;
        data.attendance[idx].marked_at = now();
      } else {
        data.attendance.push({
          id: data._nextId++,
          roll_no: r,
          course_code: courseCode,
          date,
          status,
          marked_at: now(),
        });
      }
      saveLocal(data);
      return { rollNo: r, courseCode, date, status };
    }
  },

  async deleteAttendance(rollNo, courseCode, date) {
    const r = rollNo.toUpperCase().trim();
    
    if (useKV) {
      let records = await getAttendanceKV(r);
      records = records.filter((a) => !(a.course_code === courseCode && a.date === date));
      await setAttendanceKV(r, records);
    } else {
      const data = loadLocal();
      data.attendance = data.attendance.filter(
        (a) => !(a.roll_no.toUpperCase() === r && a.course_code === courseCode && a.date === date)
      );
      saveLocal(data);
    }
  },

  async getStats(rollNo, codes) {
    const r = rollNo.toUpperCase().trim();
    
    let mine = [];
    if (useKV) {
      mine = await getAttendanceKV(r);
    } else {
      const data = loadLocal();
      mine = data.attendance.filter((a) => a.roll_no.toUpperCase() === r);
    }
    
    const stats = {};

    for (const code of codes) {
      const recs = mine.filter((a) => a.course_code === code);
      const total = recs.length;
      const present = recs.filter((a) => a.status === 'present').length;
      const absent = total - present;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      const canMiss = pct >= 75 ? Math.floor((4 * present - 3 * total) / 3) : 0;
      const needPresent = pct < 75 ? Math.max(0, Math.ceil(3 * total - 4 * present)) : 0;
      stats[code] = { total, present, absent, percentage: pct, canMiss, needPresent };
    }
    return stats;
  },
};
