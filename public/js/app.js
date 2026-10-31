/* SI-HADIR — kode bersama untuk semua halaman dashboard. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Ikon (garis, gaya lucide)                                           */
  /* ------------------------------------------------------------------ */

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    idCard: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16a3.2 3.2 0 0 1 6 0"/><path d="M14.5 10h4"/><path d="M14.5 14h4"/>',
    fileSearch: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5"/><circle cx="11.5" cy="14" r="2.6"/><path d="m13.4 15.9 1.9 1.9"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    logout: '<path d="M10 4H5.5a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 5.5 20H10"/><path d="M9 12h12"/><path d="m17 8 4 4-4 4"/>',
    bell: '<path d="M10.27 21a2 2 0 0 0 3.46 0"/><path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    edit: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.4 2.6a1 1 0 0 1 3 3l-9 9a2 2 0 0 1-.85.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.85z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    nfc: '<path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  };

  function icon(name, cls = '') {
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  /* ------------------------------------------------------------------ */
  /* Utilitas                                                            */
  /* ------------------------------------------------------------------ */

  const escapeHtml = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const $ = (sel, root = document) => root.querySelector(sel);

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    if (res.status === 401 && path !== '/auth/login') {
      location.href = '/login';
      throw new Error('Sesi login berakhir');
    }
    let data = {};
    try { data = await res.json(); } catch { /* respons kosong */ }
    if (!res.ok) throw new Error(data.message || `Permintaan gagal (${res.status})`);
    return data;
  }

  const TZ = 'Asia/Jakarta';
  const fmtTanggal = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtJam = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const fmtYmd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

  /** 'YYYY-MM-DD' (WIB) dari ISO / Date. */
  const ymd = (d = new Date()) => fmtYmd.format(new Date(d));
  /** 'Jumat, 30 Oktober 2026' dari 'YYYY-MM-DD'. */
  const tanggalPanjang = (str) => fmtTanggal.format(new Date(`${str}T12:00:00+07:00`));
  /** '07.45 WIB' dari ISO. */
  const jam = (iso) => (iso ? `${fmtJam.format(new Date(iso))} WIB` : '-');

  const STATUS = {
    HADIR: ['hadir', 'Hadir'],
    TERLAMBAT: ['terlambat', 'Terlambat'],
    TANPA_KETERANGAN: ['tk', 'Tanpa Keterangan'],
    DITOLAK: ['ditolak', 'Ditolak'],
    SUDAH_ABSEN: ['sudah', 'Sudah Absen'],
  };
  function badge(status) {
    const [cls, label] = STATUS[status] || ['', status];
    return `<span class="badge ${cls}">${escapeHtml(label)}</span>`;
  }

  function debounce(fn, ms = 250) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */

  function toast(message, type = 'info') {
    let box = $('.toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'toasts';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `toast ${type === 'error' ? 'error' : ''}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add('leave');
      setTimeout(() => el.remove(), 300);
    }, type === 'error' ? 4500 : 2800);
  }

  /* ------------------------------------------------------------------ */
  /* Modal                                                               */
  /* ------------------------------------------------------------------ */

  let openOverlay = null;

  function openModal(overlay) {
    overlay.hidden = false;
    openOverlay = overlay;
    const first = overlay.querySelector('input:not([type=hidden]), select, button.btn');
    if (first) setTimeout(() => first.focus(), 30);
  }

  function closeModal(overlay = openOverlay) {
    if (!overlay) return;
    overlay.hidden = true;
    if (openOverlay === overlay) openOverlay = null;
    overlay.dispatchEvent(new CustomEvent('modal:close'));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openOverlay) closeModal();
  });
  document.addEventListener('click', (e) => {
    if (e.target.classList?.contains('overlay')) closeModal(e.target);
    if (e.target.closest('[data-close]')) closeModal(e.target.closest('.overlay'));
  });

  /** Dialog konfirmasi. Resolve true kalau pengguna menekan tombol konfirmasi. */
  function confirmDialog({ title, message, confirmText = 'Hapus', danger = true }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
          <div class="modal-head">
            <h3 id="confirm-title">${escapeHtml(title)}</h3>
            <button class="icon-btn" type="button" data-close aria-label="Tutup">${icon('x')}</button>
          </div>
          <p class="msg">${escapeHtml(message)}</p>
          <div class="modal-foot">
            <button class="btn btn-light" type="button" data-close>Batal</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-dark'}" type="button" data-ok>${escapeHtml(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      let result = false;
      overlay.querySelector('[data-ok]').addEventListener('click', () => { result = true; closeModal(overlay); });
      overlay.addEventListener('modal:close', () => { overlay.remove(); resolve(result); });
      openModal(overlay);
      overlay.querySelector('[data-ok]').focus();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Kalender                                                            */
  /* ------------------------------------------------------------------ */

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  /**
   * Pasang kalender pop-up di tombol tanggal.
   * @param {HTMLButtonElement} button
   * @param {{ value: string, onChange: (ymd: string) => void, marked?: Set<string> }} opts
   */
  function datePicker(button, { value, onChange, marked = new Set() }) {
    const anchor = document.createElement('span');
    anchor.className = 'datepicker-anchor';
    button.replaceWith(anchor);
    anchor.appendChild(button);

    const cal = document.createElement('div');
    cal.className = 'calendar';
    cal.hidden = true;
    cal.setAttribute('role', 'dialog');
    cal.setAttribute('aria-label', 'Pilih tanggal');
    anchor.appendChild(cal);

    let selected = value;
    let [viewY, viewM] = value.split('-').map(Number);
    viewM -= 1;

    const label = button.querySelector('[data-date-label]');
    const setLabel = () => { if (label) label.textContent = tanggalPanjang(selected); };
    setLabel();

    function render() {
      const today = ymd();
      const thisYear = Number(today.slice(0, 4));
      const first = new Date(Date.UTC(viewY, viewM, 1));
      const start = new Date(first);
      start.setUTCDate(1 - first.getUTCDay());

      let years = '';
      for (let y = thisYear - 5; y <= thisYear + 1; y++) years += `<option value="${y}" ${y === viewY ? 'selected' : ''}>${y}</option>`;

      let cells = HARI.map((h) => `<span class="dow">${h}</span>`).join('');
      for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setUTCDate(start.getUTCDate() + i);
        const key = d.toISOString().slice(0, 10);
        const cls = [
          d.getUTCMonth() !== viewM && 'out',
          key === today && 'today',
          key === selected && 'selected',
          marked.has(key) && 'has-data',
        ].filter(Boolean).join(' ');
        cells += `<button type="button" class="${cls}" data-day="${key}" aria-label="${tanggalPanjang(key)}">${d.getUTCDate()}</button>`;
      }

      cal.innerHTML = `
        <div class="cal-head">
          <button type="button" class="icon-btn" data-nav="-1" aria-label="Bulan sebelumnya">${icon('chevronLeft')}</button>
          <select data-month aria-label="Bulan">${BULAN.map((b, i) => `<option value="${i}" ${i === viewM ? 'selected' : ''}>${b}</option>`).join('')}</select>
          <select data-year aria-label="Tahun">${years}</select>
          <button type="button" class="icon-btn" data-nav="1" aria-label="Bulan berikutnya">${icon('chevronRight')}</button>
        </div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-foot"><button type="button" data-today>Hari ini</button><button type="button" data-close-cal>Tutup</button></div>`;
    }

    function open() { render(); cal.hidden = false; button.setAttribute('aria-expanded', 'true'); }
    function close() { cal.hidden = true; button.setAttribute('aria-expanded', 'false'); }
    function pick(key) {
      selected = key;
      setLabel();
      close();
      onChange(key);
    }

    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => (cal.hidden ? open() : close()));
    cal.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        viewM += Number(nav.dataset.nav);
        if (viewM < 0) { viewM = 11; viewY--; }
        if (viewM > 11) { viewM = 0; viewY++; }
        return render();
      }
      const day = e.target.closest('[data-day]');
      if (day) return pick(day.dataset.day);
      if (e.target.closest('[data-today]')) {
        const t = ymd();
        [viewY, viewM] = [Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1];
        return pick(t);
      }
      if (e.target.closest('[data-close-cal]')) close();
    });
    cal.addEventListener('change', (e) => {
      if (e.target.matches('[data-month]')) viewM = Number(e.target.value);
      if (e.target.matches('[data-year]')) viewY = Number(e.target.value);
      render();
    });
    document.addEventListener('click', (e) => { if (!cal.hidden && !anchor.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !cal.hidden) { close(); button.focus(); } });

    return {
      get value() { return selected; },
      setMarked(set) { marked = set; if (!cal.hidden) render(); },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Event bus untuk halaman                                             */
  /* ------------------------------------------------------------------ */

  const bus = new EventTarget();
  const on = (name, fn) => bus.addEventListener(name, (e) => fn(e.detail));
  const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));

  /* ------------------------------------------------------------------ */
  /* Sidebar + topbar                                                    */
  /* ------------------------------------------------------------------ */

  const NAV = [
    { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'mahasiswa', href: '/mahasiswa', label: 'Data Mahasiswa', icon: 'idCard' },
    { id: 'perkuliahan', href: '/perkuliahan', label: 'Perkuliahan', icon: 'book' },
    { id: 'riwayat', href: '/riwayat', label: 'Riwayat Presensi', icon: 'fileSearch' },
    { id: 'pengaturan', href: '/pengaturan', label: 'Pengaturan', icon: 'settings' },
  ];

  const state = { user: null, notifications: [], socket: null };

  function renderSidebar(active) {
    $('#sidebar').innerHTML = `
      <a class="logo-dot" href="/dashboard" aria-label="SI-HADIR, ke dashboard">Si-HADIR</a>
      <nav class="nav" aria-label="Menu utama">
        ${NAV.map((n) => `
          <a href="${n.href}" class="${n.id === active ? 'active' : ''}" ${n.id === active ? 'aria-current="page"' : ''}>
            ${icon(n.icon)}<span>${n.label}</span>
          </a>`).join('')}
      </nav>
      <div class="nav nav-bottom">
        <button type="button" id="logout-btn">${icon('logout')}<span>Logout</span></button>
      </div>`;

    $('#logout-btn').addEventListener('click', async () => {
      try { await api('/auth/logout', { method: 'POST' }); } catch { /* tetap keluar */ }
      location.href = '/';
    });
  }

  function renderTopbar() {
    $('#topbar').innerHTML = `
      <button type="button" class="icon-btn menu-toggle" id="menu-toggle" aria-label="Buka menu">${icon('menu')}</button>
      <div class="status-pills">
        <span class="status-pill" id="conn-pill"><span class="dot"></span><span>Menghubungkan…</span></span>
        <span class="status-pill" id="session-pill"><span class="dot"></span><span>Sesi: memuat…</span></span>
      </div>
      <div class="topbar-right">
        <div class="bell" id="bell">
          <button type="button" class="icon-btn" aria-label="Notifikasi tap kartu" aria-haspopup="true" aria-expanded="false">${icon('bell')}</button>
          <span class="badge-dot"></span>
          <div class="dropdown" id="notif-dropdown">
            <h4>Tap Kartu Terbaru</h4>
            <div id="notif-list"></div>
          </div>
        </div>
        <span class="divider" aria-hidden="true"></span>
        <div class="user-chip">
          <span class="avatar" id="user-avatar">·</span>
          <span class="who"><span id="user-name">memuat…</span><br><span id="user-handle"></span></span>
        </div>
      </div>`;

    const bell = $('#bell');
    const dropdown = $('#notif-dropdown');
    bell.querySelector('.icon-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle('open');
      e.currentTarget.setAttribute('aria-expanded', String(open));
      bell.classList.remove('has-new');
    });
    document.addEventListener('click', (e) => {
      if (!bell.contains(e.target)) dropdown.classList.remove('open');
    });

    $('#menu-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.classList.toggle('nav-open');
    });
    document.addEventListener('click', (e) => {
      if (document.body.classList.contains('nav-open') && !$('#sidebar').contains(e.target)) {
        document.body.classList.remove('nav-open');
      }
    });
  }

  function renderNotifications() {
    const list = $('#notif-list');
    if (!list) return;
    list.innerHTML = state.notifications.length
      ? state.notifications.map((n) => `
          <div class="notif">
            <div>
              <div class="n-name">${escapeHtml(n.nama || n.uid || 'Kartu tanpa data')}</div>
              <div class="n-time">${escapeHtml(n.nrp || '')} · ${jam(n.waktu)}</div>
            </div>
            ${badge(n.hasil)}
          </div>`).join('')
      : '<div class="empty">Belum ada tap kartu.</div>';
  }

  function setPill(id, on, text) {
    const pill = $(id);
    if (!pill) return;
    pill.classList.toggle('on', on === true);
    pill.classList.toggle('off', on === false);
    pill.lastElementChild.textContent = text;
  }

  function setSessionPill(sesi) {
    setPill('#session-pill', sesi ? true : null, sesi ? `Sesi aktif: ${sesi.nama_mk}` : 'Tidak ada sesi aktif');
  }

  function connectSocket() {
    if (typeof window.io !== 'function') {
      setPill('#conn-pill', false, 'Real-time tidak tersedia');
      return;
    }
    const socket = window.io({ transports: ['websocket', 'polling'] });
    state.socket = socket;

    socket.on('connect', () => { setPill('#conn-pill', true, 'Server terhubung'); emit('reconnect'); });
    socket.on('disconnect', () => setPill('#conn-pill', false, 'Server terputus'));
    socket.on('connect_error', () => setPill('#conn-pill', false, 'Server terputus'));

    const onTap = (item) => {
      state.notifications.unshift(item);
      state.notifications.length = Math.min(state.notifications.length, 15);
      renderNotifications();
      if (!$('#notif-dropdown').classList.contains('open')) $('#bell').classList.add('has-new');
      emit('tap', item);
    };
    socket.on('ATTENDANCE_SUCCESS', onTap);
    socket.on('TAP_REJECTED', onTap);
    socket.on('TAP_ALREADY', onTap);
    socket.on('SESSION_UPDATE', (sesi) => {
      setSessionPill(sesi.status === 'ACTIVE' ? sesi : null);
      emit('session', sesi);
    });
    socket.on('STATS_UPDATE', (stats) => emit('stats', stats));
  }

  async function loadUser() {
    try {
      const { data } = await api('/auth/me');
      setUser(data);
    } catch { /* api() sudah mengarahkan ke /login */ }
  }

  function setUser(user) {
    state.user = user;
    const initials = user.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
    $('#user-avatar').textContent = initials || '?';
    $('#user-name').textContent = user.full_name;
    $('#user-handle').textContent = `@${user.username}`;
    emit('user', user);
  }

  async function loadTopbarData() {
    try {
      const [{ data: sesi }, { data: feed }] = await Promise.all([api('/session/active'), api('/attendance/feed')]);
      setSessionPill(sesi);
      state.notifications = feed.slice(0, 15);
      renderNotifications();
    } catch { /* abaikan, halaman tetap jalan */ }
  }

  /** Ganti setiap <i data-icon="nama"></i> di halaman dengan ikon SVG. */
  function hydrateIcons(root = document) {
    root.querySelectorAll('i[data-icon]').forEach((el) => {
      el.outerHTML = icon(el.dataset.icon, el.className);
    });
  }

  function mountShell(active) {
    hydrateIcons();
    renderSidebar(active);
    renderTopbar();
    renderNotifications();
    loadUser();
    loadTopbarData();
    connectSocket();
  }

  window.SiHadir = {
    icon, escapeHtml, api, toast, badge, debounce,
    ymd, tanggalPanjang, jam,
    openModal, closeModal, confirmDialog, datePicker,
    on, setUser, mountShell, hydrateIcons,
    get user() { return state.user; },
  };
})();
