(function () {
  'use strict';
  const { api, icon, escapeHtml, toast, on, setUser } = window.SiHadir;

  SiHadir.mountShell('pengaturan');

  const el = (id) => document.getElementById(id);

  /* ---------------- Perangkat & simulator ---------------- */

  async function loadDeviceInfo() {
    try {
      const { data } = await api('/system/info');
      const urls = data.tap_urls.length ? data.tap_urls : [`${location.origin}/api/attendance/tap`];
      el('tap-urls').innerHTML = urls.map((url) => `
        <div class="code-box" style="margin-bottom:8px">
          <code>POST ${escapeHtml(url)}</code>
          <button type="button" class="icon-btn" data-copy="${escapeHtml(url)}" aria-label="Salin alamat">${icon('copy')}</button>
        </div>`).join('') +
        (data.device_key_required
          ? '<p class="desc" style="margin-top:8px">Perangkat wajib mengirim header <code>X-Device-Key</code>.</p>'
          : '');
    } catch { /* opsional */ }
  }

  el('tap-urls').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      toast('Alamat disalin');
    } catch {
      toast('Gagal menyalin, salin manual', 'error');
    }
  });

  el('sim-random').addEventListener('click', async () => {
    try {
      const { data } = await api('/students');
      if (!data.length) return toast('Belum ada data mahasiswa', 'error');
      const m = data[Math.floor(Math.random() * data.length)];
      const f = el('sim-form').elements;
      f.uid.value = m.uid_rfid || '';
      f.nrp.value = m.nrp;
      f.nama.value = m.nama;
      f.kelas.value = m.kelas;
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  el('sim-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries([...new FormData(e.currentTarget)].map(([k, v]) => [k, String(v).trim()]));
    const box = el('sim-result');
    try {
      const res = await fetch('/api/attendance/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      box.className = `sim-result ${data.status === 'ACCEPTED' ? 'ok' : data.status === 'DENIED' ? 'bad' : 'warn'}`;
      box.textContent = `${data.status} · ${data.message}` +
        (data.data ? `\n${data.data.nama} (${data.data.nrp}) → ${data.data.status_presensi}` : '');
    } catch (err) {
      box.className = 'sim-result bad';
      box.textContent = err.message;
    }
  });

  /* ---------------- Akun ---------------- */

  const profile = el('profile-form');
  on('user', (user) => {
    profile.elements.username.value = user.username;
    profile.elements.full_name.value = user.full_name;
    profile.elements.role.value = user.role;
  });

  profile.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = profile.elements;
    el('profile-error').textContent = '';
    const body = {
      full_name: f.full_name.value.trim(),
      role: f.role.value.trim(),
      password_lama: f.password_lama.value,
      password_baru: f.password_baru.value,
    };
    if (!body.full_name) {
      el('profile-error').textContent = 'Nama lengkap wajib diisi';
      return;
    }
    if (body.password_baru && !body.password_lama) {
      el('profile-error').textContent = 'Isi password lama untuk mengganti password';
      return;
    }
    try {
      const { data } = await api('/auth/profile', { method: 'PUT', body });
      f.password_lama.value = '';
      f.password_baru.value = '';
      setUser(data);
      toast(body.password_baru ? 'Profil dan password diperbarui' : 'Profil diperbarui');
    } catch (err) {
      el('profile-error').textContent = err.message;
    }
  });

  loadDeviceInfo();
})();
