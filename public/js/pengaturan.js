(function () {
  'use strict';
  const { api, icon, escapeHtml, jam, toast, confirmDialog, on, setUser } = window.SiHadir;

  SiHadir.mountShell('pengaturan');

  const el = (id) => document.getElementById(id);
  let courses = [];

  /* ---------------- Sesi perkuliahan ---------------- */

  async function loadSession() {
    try {
      const [{ data: sesi }, { data: list }] = await Promise.all([api('/session/active'), api('/courses')]);
      courses = list;
      renderCourses();
      sesi ? renderActiveSession(sesi) : renderSessionForm();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function renderActiveSession(sesi) {
    el('session-box').innerHTML = `
      <p class="desc">Sesi sedang berjalan. Mahasiswa bisa tap kartu sampai sesi ditutup.</p>
      <dl class="kv">
        <dt>Mata Kuliah</dt><dd>${escapeHtml(sesi.nama_mk)}</dd>
        <dt>Kelas</dt><dd>${escapeHtml(sesi.kelas)}</dd>
        <dt>Mulai</dt><dd>${jam(sesi.waktu_mulai)}</dd>
        <dt>Toleransi</dt><dd>${sesi.toleransi_menit} menit (tap setelah ${jam(new Date(Date.parse(sesi.waktu_mulai) + sesi.toleransi_menit * 60000).toISOString())} = Terlambat)</dd>
      </dl>
      <div class="modal-foot">
        <span class="pill-status live" style="margin-right:auto">Sedang Berjalan</span>
        <button type="button" class="btn btn-danger btn-sm" id="close-session">${icon('stop')}Tutup Sesi</button>
      </div>`;
    el('close-session').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Tutup sesi?',
        message: 'Kartu tidak bisa di-tap lagi setelah sesi ditutup. Mahasiswa yang belum tap akan tercatat Tanpa Keterangan.',
        confirmText: 'Tutup Sesi',
      });
      if (!ok) return;
      try {
        await api('/session/close', { method: 'POST' });
        toast('Sesi ditutup');
        loadSession();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  function renderSessionForm() {
    el('session-box').innerHTML = `
      <p class="desc">Belum ada sesi aktif. Pilih mata kuliah lalu buka sesi supaya kartu bisa di-tap.</p>
      <form id="session-form" novalidate>
        <label class="field">
          <span>Mata Kuliah *</span>
          <select name="mata_kuliah_id">
            ${courses.map((c) => `<option value="${c.id}">${escapeHtml(c.kode_mk)} · ${escapeHtml(c.nama_mk)}</option>`).join('')}
            <option value="manual">Lainnya (isi manual)</option>
          </select>
        </label>
        <label class="field" id="manual-mk" hidden>
          <span>Nama Mata Kuliah *</span>
          <input name="nama_mk" maxlength="100" placeholder="Workshop Kecerdasan Buatan">
        </label>
        <div class="field-row">
          <label class="field"><span>Kelas *</span><input name="kelas" maxlength="30" placeholder="3 D4 TRM A"></label>
          <label class="field" style="flex:0 0 130px"><span>Toleransi (menit)</span><input name="toleransi_menit" type="number" min="0" max="240" value="15"></label>
        </div>
        <p class="form-error" id="session-error" role="alert"></p>
        <div class="modal-foot"><button type="submit" class="btn btn-dark btn-sm">${icon('play')}Buka Sesi</button></div>
      </form>`;

    const form = el('session-form');
    const f = form.elements;
    const syncCourse = () => {
      const manual = f.mata_kuliah_id.value === 'manual';
      el('manual-mk').hidden = !manual;
      const course = courses.find((c) => String(c.id) === f.mata_kuliah_id.value);
      if (course) f.kelas.value = course.kelas;
    };
    f.mata_kuliah_id.addEventListener('change', syncCourse);
    syncCourse();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const manual = f.mata_kuliah_id.value === 'manual';
      const body = {
        mata_kuliah_id: manual ? null : Number(f.mata_kuliah_id.value),
        nama_mk: manual ? f.nama_mk.value.trim() : '',
        kelas: f.kelas.value.trim(),
        toleransi_menit: Number(f.toleransi_menit.value),
      };
      if ((manual && !body.nama_mk) || !body.kelas) {
        el('session-error').textContent = 'Mata kuliah dan kelas wajib diisi';
        return;
      }
      try {
        await api('/session/start', { method: 'POST', body });
        toast('Sesi dibuka, kartu siap di-tap');
        loadSession();
      } catch (err) {
        el('session-error').textContent = err.message;
      }
    });
  }

  on('session', loadSession);

  /* ---------------- Mata kuliah ---------------- */

  function renderCourses() {
    el('course-body').innerHTML = courses.map((c) => `
      <tr>
        <td>${escapeHtml(c.kode_mk)}</td>
        <td>${escapeHtml(c.nama_mk)}</td>
        <td>${escapeHtml(c.kelas)}</td>
        <td class="actions"><div class="actions-cell">
          <button type="button" class="icon-btn danger" data-delete="${c.id}" aria-label="Hapus ${escapeHtml(c.nama_mk)}">${icon('trash')}</button>
        </div></td>
      </tr>`).join('');
    el('course-empty').innerHTML = courses.length ? '' : '<div class="empty">Belum ada mata kuliah.</div>';
  }

  el('course-body').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete]');
    if (!btn) return;
    const course = courses.find((c) => c.id === Number(btn.dataset.delete));
    const ok = await confirmDialog({
      title: 'Hapus mata kuliah?',
      message: `${course.nama_mk} (${course.kode_mk}) akan dihapus dari daftar. Riwayat sesi yang sudah ada tetap tersimpan.`,
    });
    if (!ok) return;
    try {
      await api(`/courses/${course.id}`, { method: 'DELETE' });
      toast('Mata kuliah dihapus');
      loadSession();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

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
      form.reset();
      toast('Mata kuliah ditambahkan');
      loadSession();
    } catch (err) {
      el('course-error').textContent = err.message;
    }
  });

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

  loadSession();
  loadDeviceInfo();
})();
