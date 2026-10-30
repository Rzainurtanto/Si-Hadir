// WIB = UTC+7 tanpa daylight saving, jadi offset-nya bisa dipakai langsung.
const WIB_OFFSET = '+07:00';

const jamFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
});

const tanggalFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 'YYYY-MM-DD' hari ini menurut WIB. */
function todayWIB() {
  return tanggalFormatter.format(new Date());
}

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !Number.isNaN(Date.parse(`${str}T00:00:00${WIB_OFFSET}`));
}

/** Rentang [awal, akhir) satu hari WIB dalam ISO UTC, untuk query ke database. */
function dayRangeWIB(dateStr) {
  const start = new Date(`${dateStr}T00:00:00${WIB_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start.toISOString(), end.toISOString()];
}

/** '07.45 WIB' */
function formatJamWIB(iso) {
  return iso ? `${jamFormatter.format(new Date(iso))} WIB` : '-';
}

module.exports = { todayWIB, isValidDate, dayRangeWIB, formatJamWIB };
