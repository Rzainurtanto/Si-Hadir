(function () {
  'use strict';
  const { api, icon, escapeHtml, badge, jam, ymd, tanggalPanjang, toast, confirmDialog, on, countUp, animateRows } = window.SiHadir;

  SiHadir.mountShell('dashboard');

  const el = (id) => document.getElementById(id);
  let currentSesiId = null;

  el('today').textContent = tanggalPanjang(ymd());

  on('user', (user) => {
    el('welcome-name').textContent = user.full_name;
    el('welcome-role').textContent = user.role;
  });

  /* ---------------- Sesi & ringkasan ---------------- */

  function renderSession(stats) {
    const sesi = stats.sesi_aktif;
    const strip = el('session-strip');
    if (sesi) {
      strip.innerHTML = `
        <span class="s-icon">${icon('alarm')}</span>
        <div class="s-text">
          <div class="s-name">${escapeHtml(sesi.nama_mk)}</div>
          <div class="s-meta">${escapeHtml(sesi.kelas)} · mulai ${jam(sesi.waktu_mulai)} · toleransi ${sesi.toleransi_menit} menit</div>
        </div>
        <div class="s-actions">
          <span class="pill-status live">Sedang Berjalan</span>
          <button type="button" class="btn btn-ghost btn-sm" id="close-session">${icon('stop')}Tutup Sesi</button>
        </div>`;
      el('close-session').addEventListener('click', closeSession);
    } else {
      strip.innerHTML = `
        <span class="s-icon">${icon('alarm')}</span>
        <div class="s-text">
          <div class="s-name">Belum ada sesi aktif</div>
          <div class="s-meta">Buka sesi perkuliahan supaya mahasiswa bisa tap kartu</div>
        </div>
        <div class="s-actions">
          <span class="pill-status idle">Tidak Aktif</span>
          <a class="btn btn-dark btn-sm" href="/pengaturan#sesi">${icon('play')}Buka Sesi</a>
        </div>`;
    }
  }

  function renderStats(stats) {
    const r = stats.ringkasan;
    if (r) {
      const pct = r.total_mahasiswa ? Math.min(100, Math.round((r.total_kehadiran / r.total_mahasiswa) * 100)) : 0;
      countUp(el('stat-total'), r.total_kehadiran, (n) => `${n}/${r.total_mahasiswa}`);
      el('stat-bar').style.width = `${pct}%`;
      el('stat-progress').setAttribute('aria-valuenow', String(pct));
      el('mini-stats').innerHTML = `
        <span>Hadir <b>${r.hadir}</b></span>
        <span>Terlambat <b>${r.terlambat}</b></span>
        <span>Ditolak <b>${r.ditolak}</b></span>`;
    } else {
      el('stat-total').textContent = '–';
      delete el('stat-total').dataset.value;
      el('stat-bar').style.width = '0';
      el('mini-stats').textContent = 'Belum ada sesi';
    }
    if (stats.rata_rata_kehadiran == null) {
      el('stat-avg').textContent = '–';
      delete el('stat-avg').dataset.value;
    } else {
      countUp(el('stat-avg'), stats.rata_rata_kehadiran, (n) => `${n}%`);
    }

    const shown = stats.sesi_aktif || stats.sesi_terakhir;
    currentSesiId = shown ? shown.id : null;
    el('live-caption').textContent = stats.sesi_aktif
      ? ''
      : stats.sesi_terakhir
        ? `sesi terakhir · ${stats.sesi_terakhir.nama_mk}, ${tanggalPanjang(ymd(stats.sesi_terakhir.waktu_mulai))}`
        : '';
  }

  async function loadStats() {
    const { data } = await api('/dashboard');
    renderSession(data);
    renderStats(data);
    return data;
  }

  async function closeSession() {
    const ok = await confirmDialog({
      title: 'Tutup sesi?',
      message: 'Kartu tidak bisa di-tap lagi setelah sesi ditutup. Mahasiswa yang belum tap akan tercatat Tanpa Keterangan.',
      confirmText: 'Tutup Sesi',
    });
    if (!ok) return;
    try {
      await api('/session/close', { method: 'POST' });
      toast('Sesi ditutup');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ---------------- Feed live tap ---------------- */

  function rowHtml(item) {
    return `
      <td>${escapeHtml(item.nama || '—')}</td>
      <td>${escapeHtml(item.nrp || item.uid || '—')}</td>
      <td>${escapeHtml(item.kelas || '—')}</td>
      <td>${badge(item.hasil)}</td>
      <td>${jam(item.waktu)}</td>`;
  }

  function setEmpty(isEmpty) {
    el('live-empty').innerHTML = isEmpty
      ? `<div class="empty"><strong>Belum ada tap kartu</strong>${currentSesiId ? 'Tap kartu di reader dan datanya akan muncul di sini.' : 'Buka sesi dulu, lalu tap kartu di reader.'}</div>`
      : '';
  }

  async function loadFeed() {
    const body = el('live-body');
    if (!currentSesiId) {
      body.innerHTML = '';
      return setEmpty(true);
    }
    const { data } = await api(`/attendance/feed?sesi_id=${currentSesiId}`);
    body.innerHTML = data.map((item) => `<tr>${rowHtml(item)}</tr>`).join('');
    animateRows(body);
    setEmpty(data.length === 0);
  }

  function prependTap(item) {
    if (item.sesi_id !== currentSesiId) return;
    const tr = document.createElement('tr');
    tr.className = 'row-new';
    tr.innerHTML = rowHtml(item);
    const body = el('live-body');
    body.prepend(tr);
    while (body.children.length > 50) body.lastElementChild.remove();
    setEmpty(false);
    requestAnimationFrame(() => setTimeout(() => tr.classList.add('settled'), 600));
  }

  async function refresh() {
    try {
      await loadStats();
      await loadFeed();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  on('tap', prependTap);
  on('stats', (stats) => { renderSession(stats); renderStats(stats); });
  on('session', refresh);
  // Koneksi pertama tidak perlu memuat ulang; hanya setelah sempat terputus.
  let connectedBefore = false;
  on('reconnect', () => {
    if (connectedBefore) refresh();
    connectedBefore = true;
  });

  refresh();
})();
