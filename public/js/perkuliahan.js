(function () {
  'use strict';
  const { api, icon, escapeHtml, jam, toast, confirmDialog, on } = window.SiHadir;

  SiHadir.mountShell('perkuliahan');

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
    if (!courses.length) {
      el('session-box').innerHTML = `
        <p class="desc">Belum ada mata kuliah. Tambahkan mata kuliah dulu di kartu <b>Mata Kuliah</b>, lalu buka sesi di sini.</p>`;
      return;
    }

    el('session-box').innerHTML = `
      <p class="desc">Belum ada sesi aktif. Pilih mata kuliah lalu buka sesi supaya kartu bisa di-tap.</p>
      <form id="session-form" novalidate>
        <label class="field">
          <span>Mata Kuliah *</span>
          <select name="mata_kuliah_id">
            ${courses.map((c) => `<option value="${c.id}">${escapeHtml(c.kode_mk)} · ${escapeHtml(c.nama_mk)}</option>`).join('')}
          </select>
        </label>
        <div class="field-row">
          <label class="field">
            <span>Kelas</span>
            <input name="kelas" readonly tabindex="-1" aria-readonly="true">
          </label>
          <label class="field" style="flex:0 0 130px"><span>Toleransi (menit)</span><input name="toleransi_menit" type="number" min="0" max="240" value="15"></label>
        </div>
        <p class="form-error" id="session-error" role="alert"></p>
        <div class="modal-foot"><button type="submit" class="btn btn-dark btn-sm">${icon('play')}Buka Sesi</button></div>
      </form>`;

    const form = el('session-form');
    const f = form.elements;
    // Kelas mengikuti mata kuliah yang dipilih dan tidak bisa diubah.
    const syncKelas = () => {
      const course = courses.find((c) => String(c.id) === f.mata_kuliah_id.value);
      f.kelas.value = course ? course.kelas : '';
    };
    f.mata_kuliah_id.addEventListener('change', syncKelas);
    syncKelas();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        mata_kuliah_id: Number(f.mata_kuliah_id.value),
        toleransi_menit: Number(f.toleransi_menit.value),
      };
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

  loadSession();
})();
