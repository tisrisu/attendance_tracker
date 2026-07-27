/* ═══════════════════════════════════════════════════════
   ATTENDANCE TRACKER — Frontend Logic
   ═══════════════════════════════════════════════════════ */

(() => {
  'use strict';

  // ─── State ─────────────────────────────────────────
  let rollNo = '';
  let userName = '';
  let selectedDate = new Date();
  let courses = [];
  let todayAttendance = {};  // { courseCode: 'present' | 'absent' }
  let stats = {};

  const CIRC = 2 * Math.PI * 38; // circumference for ring (r=38)

  // ─── DOM ───────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const loginScreen  = $('#login-screen');
  const dashboard    = $('#dashboard');
  const loginForm    = $('#login-form');
  const rollInput    = $('#roll-input');
  const nameInput    = $('#name-input');

  const headerSub       = $('#header-sub');
  const userAvatar      = $('#user-avatar');
  const userNameDisplay = $('#user-name-display');
  const dateText        = $('#date-text');
  const classesList     = $('#classes-list');
  const noClasses       = $('#no-classes');
  const classCount      = $('#class-count');
  const classesTitle    = $('#classes-title');
  const statsGrid       = $('#stats-grid');

  const historyBody     = $('#history-body');
  const noHistory       = $('#no-history');

  // ─── API Helper ────────────────────────────────────
  async function api(url, opts = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  // ─── Toast ─────────────────────────────────────────
  let toastTimer = null;
  function toast(msg) {
    let el = $('#toast-el');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-el';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    clearTimeout(toastTimer);
    requestAnimationFrame(() => {
      el.classList.add('show');
      toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
    });
  }

  // ─── Date Helpers ──────────────────────────────────
  function fmtDate(d) {
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function fmtDateDisplay(d) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function getDayName(d) {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
  }

  function isToday(d) {
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  // ─── Login ─────────────────────────────────────────
  function checkSavedSession() {
    const saved = localStorage.getItem('att_rollNo');
    if (saved) {
      rollNo = saved;
      userName = localStorage.getItem('att_name') || '';
      showDashboard();
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = rollInput.value.trim();
    const n = nameInput.value.trim();
    if (!r) return;

    try {
      const student = await api('/api/login', { method: 'POST', body: { rollNo: r, name: n } });
      rollNo = student.roll_no;
      userName = student.name || '';
      localStorage.setItem('att_rollNo', rollNo);
      localStorage.setItem('att_name', userName);
      showDashboard();
    } catch (err) {
      toast('Failed to login. Check your connection.');
    }
  });

  $('#logout-btn').addEventListener('click', () => {
    localStorage.removeItem('att_rollNo');
    localStorage.removeItem('att_name');
    rollNo = '';
    userName = '';
    dashboard.classList.remove('active');
    loginScreen.classList.add('active');
    rollInput.value = '';
    nameInput.value = '';
  });

  // ─── Dashboard Entry ──────────────────────────────
  async function showDashboard() {
    loginScreen.classList.remove('active');
    dashboard.classList.add('active');

    // Set user info
    const initial = (userName || rollNo).charAt(0).toUpperCase();
    userAvatar.textContent = initial;
    userNameDisplay.textContent = userName || rollNo;
    headerSub.textContent = `Roll No: ${rollNo}`;

    // Load courses
    courses = await api('/api/courses');

    // Load data for today
    selectedDate = new Date();
    await refreshAll();
  }

  // ─── Refresh Everything ────────────────────────────
  async function refreshAll() {
    updateDateDisplay();
    await Promise.all([loadClasses(), loadStats(), loadHistory()]);
  }

  // ─── Date Navigation ──────────────────────────────
  function updateDateDisplay() {
    dateText.textContent = fmtDateDisplay(selectedDate);
    const dayName = getDayName(selectedDate);
    classesTitle.textContent = isToday(selectedDate) ? "Today's Classes" : `${dayName}'s Classes`;
  }

  $('#date-prev').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 1);
    refreshAll();
  });

  $('#date-next').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 1);
    refreshAll();
  });

  $('#date-display').addEventListener('click', () => {
    selectedDate = new Date();
    refreshAll();
  });

  // ─── Load Classes for Selected Day ─────────────────
  async function loadClasses() {
    const dayName = getDayName(selectedDate);
    const dateStr = fmtDate(selectedDate);

    // Get schedule for this day
    const classes = await api(`/api/schedule/${dayName}`);

    // Get attendance records for this date
    const records = await api(`/api/attendance/${rollNo}/${dateStr}`);

    // Build attendance map
    todayAttendance = {};
    for (const rec of records) {
      todayAttendance[rec.course_code] = rec.status;
    }

    // Render
    if (classes.length === 0) {
      classesList.classList.add('hidden');
      noClasses.classList.remove('hidden');
      classCount.textContent = '';
    } else {
      classesList.classList.remove('hidden');
      noClasses.classList.add('hidden');
      classCount.textContent = `${classes.length} class${classes.length > 1 ? 'es' : ''}`;
      renderClasses(classes, dateStr);
    }
  }

  function renderClasses(classes, dateStr) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isTodayDate = isToday(selectedDate);

    classesList.innerHTML = classes.map((cls, i) => {
      const status = todayAttendance[cls.code] || null;
      const startMin = cls.startHour * 60 + cls.startMin;
      const endMin = cls.endHour * 60 + cls.endMin;
      const isLive = isTodayDate && currentMinutes >= startMin && currentMinutes <= endMin;
      const isPast = isTodayDate && currentMinutes > endMin;

      const presentActive = status === 'present' ? 'active' : (status === 'absent' ? 'dimmed' : '');
      const absentActive  = status === 'absent'  ? 'active' : (status === 'present' ? 'dimmed' : '');

      return `
        <div class="class-card ${isLive ? 'is-live' : ''}" style="animation-delay: ${i * 0.05}s">
          <div class="class-accent" style="background: ${cls.gradient}"></div>
          <div class="class-info">
            <div class="class-code">
              ${cls.code}
              ${isLive ? '<span class="live-dot" title="Happening now"></span>' : ''}
              ${cls.label ? `<span class="class-label">${cls.label}</span>` : ''}
            </div>
            <div class="class-name">${cls.name}</div>
            <div class="class-meta">
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${cls.time}
              </span>
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ${cls.room}
              </span>
            </div>
          </div>
          <div class="class-actions">
            <button class="btn-attend btn-present ${presentActive}"
                    data-code="${cls.code}" data-date="${dateStr}" data-status="present"
                    onclick="window._markAttendance(this)">
              ✓ Present
            </button>
            <button class="btn-attend btn-absent ${absentActive}"
                    data-code="${cls.code}" data-date="${dateStr}" data-status="absent"
                    onclick="window._markAttendance(this)">
              ✗ Absent
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ─── Mark Attendance ───────────────────────────────
  window._markAttendance = async function(btn) {
    const code = btn.dataset.code;
    const date = btn.dataset.date;
    const status = btn.dataset.status;
    const currentStatus = todayAttendance[code];

    try {
      if (currentStatus === status) {
        // Toggle off (undo)
        await api(`/api/attendance/${rollNo}/${code}/${date}`, { method: 'DELETE' });
        delete todayAttendance[code];
        toast(`Unmarked ${code}`);
      } else {
        // Mark
        await api('/api/attendance', { method: 'POST', body: { rollNo, courseCode: code, date, status } });
        todayAttendance[code] = status;
        toast(`${code}: Marked ${status}`);
      }

      // Refresh UI
      await Promise.all([loadClasses(), loadStats(), loadHistory()]);
    } catch (err) {
      toast('Error saving attendance');
    }
  };

  // ─── Load Stats ────────────────────────────────────
  async function loadStats() {
    stats = await api(`/api/stats/${rollNo}`);
    renderStats();
  }

  function renderStats() {
    let totalPresent = 0;
    let totalClasses = 0;

    statsGrid.innerHTML = courses.map((course, i) => {
      const s = stats[course.code] || { total: 0, present: 0, absent: 0, percentage: 0, canMiss: 0, needPresent: 0 };
      totalPresent += s.present;
      totalClasses += s.total;

      const pct = s.percentage;
      const dashOffset = CIRC * (1 - pct / 100);
      const strokeColor = pct >= 75 ? course.color : (pct >= 60 ? 'var(--amber)' : 'var(--red)');

      let badgeHTML = '';
      if (s.total > 0) {
        if (pct >= 75) {
          badgeHTML = `<div class="stat-badge safe">Can miss ${s.canMiss} more</div>`;
        } else if (pct >= 60) {
          badgeHTML = `<div class="stat-badge warn">Need ${s.needPresent} present</div>`;
        } else {
          badgeHTML = `<div class="stat-badge danger">Need ${s.needPresent} present</div>`;
        }
      }

      return `
        <div class="stat-card" style="animation-delay: ${0.1 + i * 0.05}s">
          <div class="ring-wrap">
            <svg viewBox="0 0 88 88">
              <circle class="ring-bg" cx="44" cy="44" r="38"/>
              <circle class="ring-fill" cx="44" cy="44" r="38"
                      stroke="${strokeColor}"
                      stroke-dasharray="${CIRC}"
                      stroke-dashoffset="${s.total === 0 ? CIRC : dashOffset}"/>
            </svg>
            <div class="ring-text">
              <span class="ring-pct">${s.total === 0 ? '—' : pct + '%'}</span>
              <span class="ring-frac">${s.present}/${s.total}</span>
            </div>
          </div>
          <div class="stat-code">${course.code}</div>
          <div class="stat-name">${course.shortName}</div>
          ${badgeHTML}
        </div>
      `;
    }).join('');
  }

  // ─── Load History ──────────────────────────────────
  async function loadHistory() {
    const records = await api(`/api/attendance/${rollNo}`);

    if (records.length === 0) {
      $('#history-table').classList.add('hidden');
      noHistory.classList.remove('hidden');
      return;
    }

    $('#history-table').classList.remove('hidden');
    noHistory.classList.add('hidden');

    // Show last 20 records
    const recent = records.slice(0, 20);

    historyBody.innerHTML = recent.map((rec) => {
      const course = courses.find((c) => c.code === rec.course_code);
      const dateObj = new Date(rec.date + 'T00:00:00');
      const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      return `
        <tr>
          <td>${dateStr}</td>
          <td>
            <span style="color: ${course ? course.color : 'inherit'}; font-weight: 600">${rec.course_code}</span>
            <span style="color: var(--text-400); font-size: 0.75rem; margin-left: 6px">${course ? course.shortName : ''}</span>
          </td>
          <td>
            <span class="status-chip ${rec.status}">
              ${rec.status === 'present' ? '✓' : '✗'} ${rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
            </span>
          </td>
          <td>
            <button class="btn-undo" onclick="window._undoAttendance('${rec.course_code}', '${rec.date}')">
              Undo
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ─── Undo Attendance ───────────────────────────────
  window._undoAttendance = async function(code, date) {
    try {
      await api(`/api/attendance/${rollNo}/${code}/${date}`, { method: 'DELETE' });
      toast(`Removed ${code} record`);
      await refreshAll();
    } catch (err) {
      toast('Error removing record');
    }
  };

  // ─── Keyboard Navigation ──────────────────────────
  document.addEventListener('keydown', (e) => {
    if (!dashboard.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') {
      selectedDate.setDate(selectedDate.getDate() - 1);
      refreshAll();
    } else if (e.key === 'ArrowRight') {
      selectedDate.setDate(selectedDate.getDate() + 1);
      refreshAll();
    } else if (e.key === 't' || e.key === 'T') {
      if (document.activeElement.tagName !== 'INPUT') {
        selectedDate = new Date();
        refreshAll();
      }
    }
  });

  // ─── Init ──────────────────────────────────────────
  checkSavedSession();
})();
