(function () {
  'use strict';
  const { api, icon, escapeHtml, ymd, tanggalPanjang, toast, confirmDialog, openModal, closeModal, debounce, on } = window.SiHadir;

  SiHadir.mountShell('mahasiswa');

  const el = (id) => document.getElementById(id);
  const modal = el('student-modal');
  const form = el('student-form');
  let students = [];
  let lastRejected = null;

  el('today').textContent = tanggalPanjang(ymd());

  /* ---------------- Tabel ---------------- */

  function render() {
    const q = el('search').value.trim();
    el('student-body').innerHTML = students.map((m) => `
      <tr>
        <td>${escapeHtml(m.nama)}</td>
        <td>${escapeHtml(m.nrp)}</td>
        <td>${escapeHtml(m.kelas)}</td>
        <td class="${m.uid_rfid ? '' : 'muted'}">${escapeHtml(m.uid_rfid || '—')}</td>
        <td class="actions">
          <div class="actions-cell">
            <button type="button" class="icon-btn" data-edit="${m.id}" aria-label="Edit ${escapeHtml(m.nama)}">${icon('edit')}</button>
            <button type="button" class="icon-btn danger" data-delete="${m.id}" aria-label="Hapus ${escapeHtml(m.nama)}">${icon('trash')}</button>
          </div>
        </td>
      </tr>`).join('');

    el('student-empty').innerHTML = students.length
      ? ''
      : q
        ? `<div class="empty"><strong>Tidak ditemukan</strong>Tidak ada mahasiswa yang cocok dengan “${escapeHtml(q)}”.</div>`
        : '<div class="empty"><strong>Belum ada data mahasiswa</strong>Klik “Tambah Mahasiswa” untuk mendaftarkan mahasiswa.</div>';
    el('student-count').textContent = students.length ? `${students.length} mahasiswa` : '';
  }

  async function load() {
    const q = el('search').value.trim();
    try {
      const { data } = await api(`/students${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      students = data;
      render();
      if (!q) {
        const kelas = [...new Set(data.map((m) => m.kelas))].sort();
        el('kelas-list').innerHTML = kelas.map((k) => `<option value="${escapeHtml(k)}">`).join('');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  el('search').addEventListener('input', debounce(load, 250));

  el('student-body').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) return openForm(students.find((m) => m.id === Number(edit.dataset.edit)));
    const del = e.target.closest('[data-delete]');
    if (del) removeStudent(students.find((m) => m.id === Number(del.dataset.delete)));
  });

  /* ---------------- Form tambah / edit ---------------- */

  function showUidSuggestion() {
    const box = el('uid-fill');
    const editing = Boolean(form.elements.id.value);
    if (!lastRejected || (editing && form.elements.uid_rfid.value)) {
      box.hidden = true;
      return;
    }
    const who = lastRejected.nama ? ` · ${lastRejected.nama}` : '';
    el('uid-fill-text').textContent = `Kartu belum terdaftar baru saja di-tap: ${lastRejected.uid}${who}`;
    box.hidden = false;
  }

  el('uid-fill-btn').addEventListener('click', () => {
    if (!lastRejected) return;
    const f = form.elements;
    f.uid_rfid.value = lastRejected.uid || '';
    // Saat menambah, ikut isi data NDEF dari kartu kalau field-nya masih kosong.
    if (!f.id.value) {
      if (!f.nama.value && lastRejected.nama) f.nama.value = lastRejected.nama;
      if (!f.nrp.value && lastRejected.nrp) f.nrp.value = lastRejected.nrp;
      if (!f.kelas.value && lastRejected.kelas) f.kelas.value = lastRejected.kelas;
    }
    el('uid-fill').hidden = true;
  });

  async function openForm(mhs) {
    form.reset();
    el('student-error').textContent = '';
    const f = form.elements;
    f.id.value = mhs ? mhs.id : '';
    if (mhs) {
      f.nama.value = mhs.nama;
      f.nrp.value = mhs.nrp;
      f.kelas.value = mhs.kelas;
      f.uid_rfid.value = mhs.uid_rfid || '';
    }
    el('student-title').textContent = mhs ? 'Edit Identitas Mahasiswa' : 'Tambahkan Data Mahasiswa';
    el('student-submit').textContent = mhs ? 'Update' : 'Tambah';
    el('uid-fill').hidden = true;
    openModal(modal);

    try {
      lastRejected = (await api('/attendance/last-rejected')).data;
      showUidSuggestion();
    } catch { /* saran UID opsional */ }
  }

  el('add-btn').addEventListener('click', () => openForm(null));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    for (const k of ['nama', 'nrp', 'kelas', 'uid_rfid']) data[k] = data[k].trim();
    if (!data.nama || !data.nrp || !data.kelas) {
      el('student-error').textContent = 'Nama, NRP, dan kelas wajib diisi';
      return;
    }

    const btn = el('student-submit');
    btn.disabled = true;
    try {
      if (data.id) {
        await api(`/students/${data.id}`, { method: 'PUT', body: data });
        toast(`Data ${data.nama} diperbarui`);
      } else {
        await api('/students', { method: 'POST', body: data });
        toast(`${data.nama} ditambahkan`);
      }
      closeModal(modal);
      await load();
    } catch (err) {
      el('student-error').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------------- Hapus ---------------- */

  async function removeStudent(mhs) {
    if (!mhs) return;
    const ok = await confirmDialog({
      title: 'Hapus data mahasiswa?',
      message: `Data ${mhs.nama} (${mhs.nrp}) beserta seluruh riwayat presensinya akan dihapus permanen.`,
      confirmText: 'Hapus',
    });
    if (!ok) return;
    try {
      await api(`/students/${mhs.id}`, { method: 'DELETE' });
      toast(`${mhs.nama} dihapus`);
      await load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ---------------- Real-time ---------------- */

  on('tap', (item) => {
    if (item.hasil === 'DITOLAK' && item.uid) {
      lastRejected = item;
      if (!modal.hidden) showUidSuggestion();
    } else if (item.hasil === 'HADIR' || item.hasil === 'TERLAMBAT') {
      // UID bisa baru saja terikat otomatis ke mahasiswa.
      const m = students.find((s) => s.nrp === item.nrp);
      if (m && !m.uid_rfid) load();
    }
  });

  load();
})();
