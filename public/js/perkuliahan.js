(function () {
  'use strict';
  const { api, icon, escapeHtml, jam, badge, toast, confirmDialog, on } = window.SiHadir;

  SiHadir.mountShell('perkuliahan');

  const el = (id) => document.getElementById(id);

  let courses = [];          // semua mata kuliah
  let activeSesi = null;     // sesi yang sedang aktif (null jika tidak ada)
  let currentCourse = null;  // MK yang sedang dibuka di detail view
  let presensiData = [];     // roster mahasiswa untuk sesi yang ditampilkan
  let activeTab = 'hadir';   // tab aktif di panel kanan
  let presensiInterval = null;

  /* ================================================================
     Warna & inisial kartu
  ================================================================ */
  const CARD_COLORS = [
    '#1e3a5f', '#1a3a2a', '#2d1b69', '#4a1942', '#1b3a4b',
    '#3b2a1a', '#1a2d4a', '#2a3d1a', '#3a1a2d', '#1a3a3a',
  ];
  function cardColor(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return CARD_COLORS[h % CARD_COLORS.length];
  }
  function mkInitials(kode) {
    return (kode || '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || (kode || '').slice(0, 3).toUpperCase();
  }

  /* ================================================================
     Load data awal
  ================================================================ */
  async function loadAll() {
    try {
      const [{ data: sesi }, { data: list }] = await Promise.all([
        api('/session/active'),
        api('/courses'),
      ]);
      activeSesi = sesi;
      courses = list;
      renderCourses();

      // Jika sedang di detail view, refresh juga panel detail
      if (currentCourse) refreshDetail();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  on('session', loadAll);

  /* ================================================================
     VIEW: Daftar kartu mata kuliah
  ================================================================ */
  function showListView() {
    el('view-list').hidden = false;
    el('view-detail').hidden = true;
    currentCourse = null;
    clearInterval(presensiInterval);
    presensiInterval = null;
  }

  function showDetailView(course) {
    currentCourse = course;
    el('view-list').hidden = true;
    el('view-detail').hidden = false;
    renderDetailHeader(course);
    renderSesiBox();
    loadPresensi();

    // Auto-refresh presensi setiap 10 detik saat sesi aktif
    clearInterval(presensiInterval);
    presensiInterval = setInterval(() => {
      if (activeSesi && activeSesi.mata_kuliah_id === currentCourse?.id) loadPresensi();
    }, 10000);
  }

  function renderCourses() {
    const grid = el('course-grid');
    const empty = el('course-empty');
    if (!courses.length) {
      grid.innerHTML = '';
      empty.innerHTML = '<div class="empty">Belum ada mata kuliah. Klik <b>+ Tambah</b> untuk menambahkan.</div>';
      return;
    }
    empty.innerHTML = '';
    grid.innerHTML = courses.map((c) => {
      const bg = cardColor(c.kode_mk);
      const initials = mkInitials(c.kode_mk);
      const isActive = activeSesi && activeSesi.mata_kuliah_id === c.id;
      return `
        <div class="mk-card${isActive ? ' mk-card--active' : ''}" data-id="${c.id}" style="--mk-color:${bg}"
             tabindex="0" role="button" aria-label="Buka ${escapeHtml(c.nama_mk)}">
          ${isActive ? `<div class="mk-card-live-badge">● Sesi Aktif</div>` : ''}
          <div class="mk-card-top">
            <div class="mk-card-info">
              <div class="mk-card-name">${escapeHtml(c.nama_mk)}</div>
              <div class="mk-card-kelas">${escapeHtml(c.kelas)}</div>
            </div>
            <div class="mk-card-badge">${escapeHtml(initials)}</div>
          </div>
          <div class="mk-card-bottom">
            <div class="mk-card-kode">${escapeHtml(c.kode_mk)}</div>
            <div class="mk-card-actions">
              <button type="button" class="mk-card-open" data-open="${c.id}">
                ${icon('play')} ${isActive ? 'Lihat Presensi' : 'Buka Presensi'}
              </button>
              <button type="button" class="icon-btn mk-card-del" data-delete="${c.id}"
                      aria-label="Hapus ${escapeHtml(c.nama_mk)}">${icon('trash')}</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  /* Klik & keyboard di grid kartu */
  el('course-grid').addEventListener('click', async (e) => {
    const delBtn = e.target.closest('[data-delete]');
    if (delBtn) {
      e.stopPropagation();
      await deleteCourse(Number(delBtn.dataset.delete));
      return;
    }
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) { e.stopPropagation(); openCourseDetail(Number(openBtn.dataset.open)); return; }
    const card = e.target.closest('.mk-card');
    if (card) openCourseDetail(Number(card.dataset.id));
  });
  el('course-grid').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.mk-card');
    if (card) { e.preventDefault(); openCourseDetail(Number(card.dataset.id)); }
  });

  function openCourseDetail(courseId) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    showDetailView(course);
  }

  async function deleteCourse(courseId) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    const ok = await confirmDialog({
      title: 'Hapus mata kuliah?',
      message: `${course.nama_mk} (${course.kode_mk}) akan dihapus. Riwayat sesi yang sudah ada tetap tersimpan.`,
    });
    if (!ok) return;
    try {
      await api(`/courses/${course.id}`, { method: 'DELETE' });
      toast('Mata kuliah dihapus');
      loadAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ================================================================
     VIEW DETAIL — Header MK
  ================================================================ */
  function renderDetailHeader(course) {
    const bg = cardColor(course.kode_mk);
    const initials = mkInitials(course.kode_mk);
    el('detail-mk-header').innerHTML = `
      <div class="perk-mk-banner" style="--mk-color:${bg}">
        <div class="perk-mk-banner-body">
          <div class="perk-mk-label">MATA KULIAH</div>
          <div class="perk-mk-title">${escapeHtml(course.nama_mk)}</div>
          <dl class="kv perk-mk-kv">
            <dt>Kode</dt><dd>${escapeHtml(course.kode_mk)}</dd>
            <dt>Kelas</dt><dd>${escapeHtml(course.kelas)}</dd>
          </dl>
        </div>
        <div class="perk-mk-initials">${escapeHtml(initials)}</div>
      </div>`;
  }

  /* ================================================================
     VIEW DETAIL — Panel sesi (kiri bawah)
  ================================================================ */
  function renderSesiBox() {
    const box = el('detail-sesi-box');
    const isThisMKActive = activeSesi && activeSesi.mata_kuliah_id === currentCourse?.id;
    const otherActive = activeSesi && activeSesi.mata_kuliah_id !== currentCourse?.id;

    if (isThisMKActive) {
      box.innerHTML = `
        <h2 class="panel-title" style="margin-bottom:10px"><i data-icon="alarm"></i>Sesi Berlangsung</h2>
        <dl class="kv">
          <dt>Mulai</dt><dd>${jam(activeSesi.waktu_mulai)}</dd>
          <dt>Toleransi</dt><dd>${activeSesi.toleransi_menit} menit</dd>
        </dl>
        <div class="modal-foot" style="margin-top:14px">
          <span class="pill-status live" style="margin-right:auto">● Sedang Berjalan</span>
          <button type="button" class="btn btn-danger btn-sm" id="btn-close-sesi">${icon('stop')}Tutup Sesi</button>
        </div>`;
      el('btn-close-sesi').addEventListener('click', closeSesi);

    } else if (otherActive) {
      box.innerHTML = `
        <h2 class="panel-title" style="margin-bottom:10px"><i data-icon="alarm"></i>Buka Sesi</h2>
        <p class="desc" style="color:#9b1c1c">Ada sesi lain yang sedang aktif (<b>${escapeHtml(activeSesi.nama_mk)}</b>). Tutup sesi tersebut terlebih dahulu.</p>`;

    } else {
      box.innerHTML = `
        <h2 class="panel-title" style="margin-bottom:10px"><i data-icon="alarm"></i>Buka Sesi</h2>
        <p class="desc">Atur toleransi keterlambatan lalu buka sesi. Mahasiswa bisa tap kartu setelah sesi dibuka.</p>
        <form id="detail-session-form" novalidate>
          <label class="field">
            <span>Toleransi Keterlambatan (menit)</span>
            <input name="toleransi_menit" type="number" min="0" max="240" value="15">
          </label>
          <p class="form-error" id="detail-session-error" role="alert"></p>
          <div class="modal-foot" style="margin-top:6px">
            <button type="submit" class="btn btn-dark btn-sm">${icon('play')}Buka Sesi Presensi</button>
          </div>
        </form>`;
      el('detail-session-form').addEventListener('submit', openSesi);
    }
  }

  async function openSesi(e) {
    e.preventDefault();
    const toleransi = Number(e.currentTarget.elements.toleransi_menit.value);
    try {
      await api('/session/start', { method: 'POST', body: { mata_kuliah_id: currentCourse.id, toleransi_menit: toleransi } });
      toast(`Sesi ${currentCourse.nama_mk} dibuka`);
      const { data: sesi } = await api('/session/active');
      activeSesi = sesi;
      renderSesiBox();
      loadPresensi();
    } catch (err) {
      const errEl = el('detail-session-error');
      if (errEl) errEl.textContent = err.message;
      else toast(err.message, 'error');
    }
  }

  async function closeSesi() {
    const ok = await confirmDialog({
      title: 'Tutup sesi?',
      message: 'Mahasiswa yang belum tap akan tercatat Tanpa Keterangan.',
      confirmText: 'Tutup Sesi',
    });
    if (!ok) return;
    try {
      await api('/session/close', { method: 'POST' });
      toast('Sesi ditutup');
      activeSesi = null;
      renderSesiBox();
      loadPresensi();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ================================================================
     VIEW DETAIL — Panel presensi (kanan)
  ================================================================ */
  async function loadPresensi() {
    if (!currentCourse) return;

    // Cari sesi terbaru untuk MK ini (aktif atau closed terakhir)
    try {
      const { data: allSessions } = await api('/session/list');
      const mkSessions = allSessions.filter((s) => s.mata_kuliah_id === currentCourse.id);

      if (!mkSessions.length) {
        renderPresensiEmpty('Belum ada sesi untuk mata kuliah ini. Buka sesi terlebih dahulu.');
        return;
      }

      // Gunakan sesi aktif MK ini, atau sesi terakhir
      const targetSesi = mkSessions.find((s) => s.status === 'ACTIVE') || mkSessions[0];
      const { data: roster, sessions } = await api(`/attendance/logs?sesi_id=${targetSesi.id}`);
      presensiData = roster || [];

      const sesiInfo = (sessions && sessions[0]) || targetSesi;
      renderPresensiMeta(sesiInfo);
      renderPresensiLists();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function renderPresensiMeta(sesi) {
    const isClosed = sesi.status === 'CLOSED';
    el('presensi-meta').innerHTML = isClosed
      ? `<span class="pill-status idle">Sesi Selesai · ${jam(sesi.waktu_mulai)}</span>`
      : `<span class="pill-status live">● Sesi Aktif · ${jam(sesi.waktu_mulai)}</span>`;
  }

  function renderPresensiEmpty(msg) {
    el('presensi-meta').innerHTML = '';
    el('count-hadir').textContent = '0';
    el('count-belum').textContent = '0';
    el('presensi-hadir').innerHTML = `<div class="empty">${msg}</div>`;
    el('presensi-belum').innerHTML = '';
  }

  function renderPresensiLists() {
    const hadir = presensiData.filter((r) => r.status === 'HADIR' || r.status === 'TERLAMBAT');
    const belum = presensiData.filter((r) => r.status === 'TANPA_KETERANGAN' || !r.status);

    el('count-hadir').textContent = hadir.length;
    el('count-belum').textContent = belum.length;

    el('presensi-hadir').innerHTML = hadir.length
      ? hadir.map((r) => presensiBaris(r, true)).join('')
      : '<div class="empty">Belum ada mahasiswa yang hadir.</div>';

    el('presensi-belum').innerHTML = belum.length
      ? belum.map((r) => presensiBaris(r, false)).join('')
      : '<div class="empty">Semua mahasiswa sudah hadir! 🎉</div>';
  }

  function presensiBaris(r, isHadir) {
    const initial = (r.nama || '?').charAt(0).toUpperCase();
    const statusBadge = r.status === 'HADIR'
      ? `<span class="badge hadir">Hadir</span>`
      : r.status === 'TERLAMBAT'
        ? `<span class="badge terlambat">Terlambat</span>`
        : `<span class="badge tk">Belum</span>`;
    const waktu = r.waktu_tap ? `<span class="perk-mhs-waktu">${jam(r.waktu_tap)}</span>` : '';
    return `
      <div class="perk-mhs-row">
        <div class="perk-mhs-avatar${isHadir ? ' perk-mhs-avatar--hadir' : ''}">${escapeHtml(initial)}</div>
        <div class="perk-mhs-info">
          <div class="perk-mhs-nama">${escapeHtml(r.nama || '-')}</div>
          <div class="perk-mhs-nrp">${escapeHtml(r.nrp || '-')}</div>
        </div>
        <div class="perk-mhs-right">${statusBadge}${waktu}</div>
      </div>`;
  }

  /* Tab hadir / belum */
  document.querySelectorAll('.perk-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.perk-tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeTab = tab.dataset.tab;
      el('presensi-hadir').hidden = activeTab !== 'hadir';
      el('presensi-belum').hidden = activeTab !== 'belum';
    });
  });

  /* Refresh detail saat ada update socket */
  function refreshDetail() {
    if (!currentCourse) return;
    api('/session/active').then(({ data: sesi }) => {
      activeSesi = sesi;
      renderCourses();
      renderSesiBox();
      if (activeSesi && activeSesi.mata_kuliah_id === currentCourse.id) loadPresensi();
    }).catch(() => {});
  }

  /* ================================================================
     Tombol kembali
  ================================================================ */
  el('btn-back').addEventListener('click', () => {
    showListView();
    loadAll(); // refresh daftar kartu
  });

  /* ================================================================
     Modal tambah mata kuliah
  ================================================================ */
  function openModal() {
    el('mk-overlay').hidden = false;
    el('course-form').reset();
    el('course-error').textContent = '';
    el('course-form').querySelector('input').focus();
  }
  function closeModal() { el('mk-overlay').hidden = true; }

  el('btn-add-mk').addEventListener('click', openModal);
  el('btn-close-mk-modal').addEventListener('click', closeModal);
  el('btn-cancel-mk').addEventListener('click', closeModal);
  el('mk-overlay').addEventListener('click', (e) => { if (e.target === el('mk-overlay')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  el('course-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
    el('course-error').textContent = '';
    if (!body.kode_mk || !body.nama_mk || !body.kelas) {
      el('course-error').textContent = 'Kode, nama, dan kelas wajib diisi';
      return;
    }
    try {
      await api('/courses', { method: 'POST', body });
      closeModal();
      toast('Mata kuliah ditambahkan');
      loadAll();
    } catch (err) {
      el('course-error').textContent = err.message;
    }
  });

  /* ================================================================
     Init
  ================================================================ */
  loadAll();
})();
