(function () {
  'use strict';
  const { api, escapeHtml, badge, jam, ymd, toast, debounce, datePicker, on, animateRows } = window.SiHadir;

  SiHadir.mountShell('riwayat');

  const el = (id) => document.getElementById(id);
  const select = el('session-select');

  let date = new URLSearchParams(location.search).get('date') || ymd();
  let sessions = [];
  let rows = [];

  const picker = datePicker(el('date-btn'), {
    value: date,
    onChange: (d) => {
      date = d;
      loadSessions();
    },
  });

  // Tandai tanggal yang punya sesi di kalender.
  api('/session/list')
    .then(({ data }) => picker.setMarked(new Set(data.map((s) => ymd(s.waktu_mulai)))))
    .catch(() => {});

  /* ---------------- Sesi pada tanggal terpilih ---------------- */

  async function loadSessions() {
    try {
      const { data } = await api(`/session/list?date=${date}`);
      sessions = data;
      const prev = select.value;
      if (!sessions.length) {
        select.innerHTML = '<option value="">Tidak ada sesi</option>';
        select.disabled = true;
      } else {
        select.disabled = false;
        select.innerHTML =
          (sessions.length > 1 ? `<option value="">Semua sesi (${sessions.length})</option>` : '') +
          sessions.map((s) => `
            <option value="${s.id}">${jam(s.waktu_mulai).replace(' WIB', '')} · ${escapeHtml(s.nama_mk)} · ${escapeHtml(s.kelas)}${s.status === 'ACTIVE' ? ' (aktif)' : ''}</option>`).join('');
        if ([...select.options].some((o) => o.value === prev)) select.value = prev;
      }
      await loadLogs();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ---------------- Tabel presensi ---------------- */

  function query(extra = '') {
    const params = new URLSearchParams({ date });
    if (select.value) params.set('sesi_id', select.value);
    return `${params}${extra}`;
  }

  async function loadLogs({ animate = true } = {}) {
    if (!sessions.length) {
      rows = [];
      return render();
    }
    try {
      const { data } = await api(`/attendance/logs?${query()}`);
      rows = data;
      render({ animate });
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function render({ animate = true } = {}) {
    const q = el('search').value.trim().toLowerCase();
    const multi = !select.value && sessions.length > 1;
    const shown = q
      ? rows.filter((r) => [r.nama, r.nrp, r.kelas].some((v) => String(v).toLowerCase().includes(q)))
      : rows;

    el('log-head').innerHTML = `<tr><th>Nama</th><th>NRP</th><th>Kelas</th>${multi ? '<th>Mata Kuliah</th>' : ''}<th>Status</th><th>Waktu</th></tr>`;
    el('log-body').innerHTML = shown.map((r) => `
      <tr>
        <td>${escapeHtml(r.nama)}</td>
        <td>${escapeHtml(r.nrp)}</td>
        <td>${escapeHtml(r.kelas)}</td>
        ${multi ? `<td>${escapeHtml(r.nama_mk)}</td>` : ''}
        <td>${badge(r.status)}</td>
        <td>${jam(r.waktu_tap)}</td>
      </tr>`).join('');
    if (animate) animateRows(el('log-body'));

    let empty = '';
    if (!sessions.length) empty = '<div class="empty"><strong>Tidak ada sesi pada tanggal ini</strong>Pilih tanggal lain di kalender.</div>';
    else if (!rows.length) empty = '<div class="empty"><strong>Belum ada data</strong>Belum ada mahasiswa terdaftar di kelas sesi ini.</div>';
    else if (!shown.length) empty = `<div class="empty"><strong>Tidak ditemukan</strong>Tidak ada mahasiswa yang cocok dengan “${escapeHtml(q)}”.</div>`;
    el('log-empty').innerHTML = empty;

    const count = (s) => rows.filter((r) => r.status === s).length;
    el('log-summary').textContent = rows.length
      ? `Hadir ${count('HADIR')} · Terlambat ${count('TERLAMBAT')} · Tanpa Keterangan ${count('TANPA_KETERANGAN')}`
      : '';
    el('log-count').textContent = rows.length ? `${shown.length} dari ${rows.length} baris` : '';
    el('export-btn').disabled = !rows.length;
  }

  select.addEventListener('change', () => loadLogs());
  el('search').addEventListener('input', debounce(() => render(), 150));

  el('export-btn').addEventListener('click', () => {
    location.href = `/api/attendance/logs?${query('&format=csv')}`;
  });

  /* ---------------- Real-time ---------------- */

  // Pembaruan real-time tidak perlu memutar ulang animasi seluruh tabel.
  const reloadLogs = debounce(() => loadLogs({ animate: false }), 400);
  on('tap', (item) => {
    if (sessions.some((s) => s.id === item.sesi_id)) reloadLogs();
  });
  on('session', () => {
    if (date === ymd()) loadSessions();
  });

  loadSessions();
})();
