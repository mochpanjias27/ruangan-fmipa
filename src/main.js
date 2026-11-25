import { mountClassroom } from './classroom.js';

// ---------- konstanta ----------
const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI5 = HARI.slice(0, 5);
const SESI = [[1, 450, 500], [2, 500, 550], [3, 550, 600], [4, 615, 665], [5, 665, 715], [6, 715, 765], [7, 795, 845], [8, 845, 895], [9, 895, 945], [10, 945, 995], [11, 995, 1045]];
const KULIAH = 'Kuliah/praktikum', ADMIN = 'Administratif (TA/Magang/KKN)';
const JENIS = ['Kelas Teori', 'Laboratorium', 'Ruang Seminar', 'Sidang', 'Ruang Pertemuan / Aula', 'Ruang Tutorial', 'Ruang Diskusi'];
const KAMPUS = ['Jatinangor', 'Bandung (Singaperbangsa/Dipati Ukur)'];
const DEFAULT_JENIS = 'Kelas Teori', DEFAULT_KAMPUS = 'Jatinangor'; // bawaan pencarian ruang kosong

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const jam = (m) => String(Math.floor(m / 60)).padStart(2, '0') + '.' + String(m % 60).padStart(2, '0');
const sesiLabel = (s) => `${s[0]} · ${jam(s[1])}–${jam(s[2])}`;
const fill = (sel, opts, value) => { sel.replaceChildren(...opts.map(([v, t]) => new Option(t, v))); if (value != null) sel.value = value; };
const busy = (j, a, b, adm) => (j.kategori === KULIAH || (adm && j.kategori === ADMIN)) && Math.min(j.selesai_menit, b) - Math.max(j.mulai_menit, a) >= 25;

// ---------- hero 3D ----------
const canvas = $('#classroom');
try { mountClassroom(canvas); } catch (e) { console.warn('WebGL tidak tersedia', e); canvas.remove(); }

// ---------- hitungan ----------
function compute(jadwal, ruang) {
  const ajar = ruang.filter((r) => r.ruang_ajar === 'ya');
  const occ = new Map(); // kode -> Set('Senin|3')
  for (const j of jadwal) {
    if (j.kategori !== KULIAH) continue;
    for (const s of String(j.sesi || '').split(',')) {
      if (!s) continue;
      if (!occ.has(j.ruang)) occ.set(j.ruang, new Set());
      occ.get(j.ruang).add(j.hari + '|' + s);
    }
  }
  const util = ajar.map((r) => {
    const set = occ.get(r.kode) || new Set();
    let n = 0;
    for (const h of HARI5) for (let s = 1; s <= 9; s++) if (set.has(h + '|' + s)) n++;
    return { ...r, slot: n, pct: Math.round((n / 45) * 100) };
  }).sort((a, b) => a.slot - b.slot || a.kode.localeCompare(b.kode));

  const heat = {};
  for (const g of ['Semua ruang ajar', 'Kelas Teori', 'Laboratorium', 'Ruang Seminar']) {
    const rr = ajar.filter((r) => g === 'Semua ruang ajar' || r.jenis === g);
    heat[g] = HARI5.map((h) => Array.from({ length: 9 }, (_, i) => {
      const n = rr.filter((r) => (occ.get(r.kode) || new Set()).has(h + '|' + (i + 1))).length;
      return { n, total: rr.length, pct: rr.length ? Math.round((n / rr.length) * 100) : 0 };
    }));
  }
  const kuliah = jadwal.filter((j) => j.kategori === KULIAH);
  const teori = util.filter((r) => r.jenis === 'Kelas Teori');
  const sum = (a) => a.reduce((t, r) => t + r.slot, 0);
  const puncak = Math.max(0, ...heat['Kelas Teori'].flat().map((c) => c.n));
  const jamMulai = [...kuliah.reduce((m, j) => m.set(j.mulai, { mulai: j.mulai, n: (m.get(j.mulai)?.n || 0) + 1, grid: j.sesuai_grid === 'ya' }), new Map()).values()]
    .sort((a, b) => a.mulai.localeCompare(b.mulai));
  const tpr = [...jadwal.filter((j) => j.kategori === 'Tanpa ruangan').reduce((m, j) => m.set(j.prodi, (m.get(j.prodi) || 0) + 1), new Map())]
    .map(([prodi, n]) => ({ prodi, n })).sort((a, b) => b.n - a.n);

  return {
    ajar, util, heat, jamMulai, tpr,
    k: {
      ruangAjar: util.length,
      utilAjar: Math.round((sum(util) / (45 * util.length)) * 100),
      jmlTeori: teori.length,
      utilTeori: teori.length ? Math.round((sum(teori) / (45 * teori.length)) * 100) : 0,
      puncakTeori: puncak,
      puncakPct: teori.length ? Math.round((puncak / teori.length) * 100) : 0,
      kosong: util.filter((r) => r.slot === 0).length,
      tanpaRuang: jadwal.filter((j) => j.kategori === 'Tanpa ruangan').length,
      admin: jadwal.filter((j) => j.kategori === ADMIN).length,
      luarGrid: kuliah.length ? Math.round((kuliah.filter((j) => j.sesuai_grid === 'tidak').length / kuliah.length) * 100) : 0,
    },
  };
}

function nowSlot() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: -1 };
  const m = Number(p.hour) * 60 + Number(p.minute);
  let d = map[p.weekday];
  const cur = SESI.find((s) => m >= s[1] && m < s[2]);
  let next = SESI.find((s) => m < s[2]);
  if (d === -1) return { hari: 'Senin', sesi: 1, live: false };
  if (!next) { d = (d + 1) % 6; next = SESI[0]; return { hari: HARI[d], sesi: 1, live: false }; }
  return { hari: HARI[d], sesi: (cur || next)[0], live: !!cur };
}

function freeRooms(jadwal, ajar, f) {
  const ses = SESI[f.sesi - 1];
  const byRoom = new Map();
  for (const j of jadwal) if (j.hari === f.hari) { if (!byRoom.has(j.ruang)) byRoom.set(j.ruang, []); byRoom.get(j.ruang).push(j); }
  return ajar
    .filter((r) => (!f.jenis || r.jenis === f.jenis) && (!f.kampus || r.kampus === f.kampus) && (!f.cap || (r.kapasitas || 0) >= f.cap))
    .filter((r) => !(byRoom.get(r.kode) || []).some((j) => busy(j, ses[1], ses[2], f.adm)))
    .map((r) => {
      const list = byRoom.get(r.kode) || [];
      const next = SESI.slice(f.sesi).find((s) => list.some((j) => busy(j, s[1], s[2], f.adm)));
      return { r, next };
    })
    .sort((a, b) => (a.next ? 1 : 0) - (b.next ? 1 : 0) || (b.next?.[0] || 0) - (a.next?.[0] || 0) || a.r.gedung.localeCompare(b.r.gedung) || a.r.kode.localeCompare(b.r.kode));
}

// ---------- render ----------
function renderKpis(k) {
  const items = [
    ['Rata-rata keterisian ruang ajar', k.utilAjar + '%', `${k.ruangAjar} ruang ajar terdata`, ''],
    ['Keterisian kelas teori', k.utilTeori + '%', `Puncak ${k.puncakPct}% kelas teori terpakai bersamaan`, ''],
    ['Ruang ajar tak terjadwal', k.kosong, 'Tidak ada kuliah Senin–Jumat sesi 1–9', 'warn'],
    ['Kelas tanpa ruangan', k.tanpaRuang, 'Tercatat "Tanpa Ruangan" di SIAT', 'bad'],
    ['Kuliah mulai di luar grid', k.luarGrid + '%', 'Tidak mulai di 07.30, 08.20, 10.15, 13.15, …', 'warn'],
    ['Jadwal administratif di ruang', k.admin, 'TA, magang, KKN, skripsi yang "memegang" ruang', ''],
  ];
  $('#kpis').replaceChildren(...items.map(([l, v, n, c]) => {
    const d = el('div', 'kpi ' + c);
    d.append(el('p', 'l', l), el('div', 'v', String(v)), el('p', 'n', n));
    return d;
  }));
  const t = $('#takeaway'); t.replaceChildren();
  const b = (x) => el('b', null, String(x));
  t.append('Kelas teori rata-rata terisi ', b(k.utilTeori + '%'), ' dari seluruh slot sesi, dan pada jam tersibuk ', b(k.puncakTeori), ' dari ', b(k.jmlTeori),
    ' kelas teori dipakai bersamaan. Sementara itu ', b(k.kosong), ' ruang ajar tidak terjadwal sama sekali, dan ', b(k.tanpaRuang), ' kelas belum mendapat ruangan di SIAT.');
}

function renderHeat(heat, g) {
  const tbl = $('#heat'); tbl.replaceChildren();
  const hr = tbl.createTHead().insertRow();
  hr.append(el('th', 'day', 'Hari'));
  for (let s = 0; s < 9; s++) { const th = el('th', null, `${s + 1} · ${jam(SESI[s][1])}`); hr.append(th); }
  const body = tbl.createTBody();
  const max = Math.max(1, ...heat[g].flat().map((c) => c.pct));
  heat[g].forEach((row, i) => {
    const tr = body.insertRow();
    tr.append(el('td', 'day', HARI5[i]));
    row.forEach((c, s) => {
      const td = el('td', null, c.pct + '%');
      const a = c.pct / max;
      td.style.background = `rgba(50,100,58,${0.07 + a * 0.93})`;
      td.style.color = a >= 0.55 ? '#fff' : '#1c3a22';
      td.title = `${HARI5[i]} sesi ${s + 1}: ${c.n} dari ${c.total} ruang terpakai`;
      tr.append(td);
    });
  });
}

function renderBars(node, rows, label, value, color) {
  const max = Math.max(1, ...rows.map(value));
  node.replaceChildren(...rows.flatMap((r, i) => {
    const track = el('div', 'track'); const f = el('div', 'fill');
    f.style.width = (value(r) / max) * 100 + '%'; f.style.background = color(r); f.style.animationDelay = i * 30 + 'ms';
    track.append(f);
    return [el('span', null, label(r)), track, el('span', 'num', String(value(r)))];
  }));
}

function renderFree(state, data) {
  const f = state.f;
  const list = freeRooms(data.jadwal, data.c.ajar, f);
  $('#free-n').textContent = list.length;
  $('#free-when').textContent = `${f.hari}, sesi ${sesiLabel(SESI[f.sesi - 1])}`;
  const box = $('#free');
  if (!list.length) { box.replaceChildren(el('div', 'empty', 'Tidak ada ruang kosong untuk pilihan ini. Coba sesi lain atau longgarkan filter.')); return; }
  const LIMIT = 24;
  const shown = state.showAll ? list : list.slice(0, LIMIT);
  box.replaceChildren(...shown.map(({ r, next }) => {
    const c = el('article', 'room');
    c.append(el('div', 'code', r.kode), el('div', 'name', r.nama || r.jenis),
      el('div', 'meta', `${r.jenis} · ${r.gedung}${r.kapasitas ? ' · ' + r.kapasitas + ' orang' : ''}`));
    const u = el('span', 'until' + (next && next[0] - f.sesi <= 1 ? ' short' : ''), next ? `Kosong sampai ${jam(next[1])} (sesi ${next[0]})` : 'Kosong sampai akhir hari');
    c.append(u);
    return c;
  }));
  if (list.length > shown.length) {
    const wrap = el('div', 'more');
    const btn = el('button', 'btn btn-green', `Tampilkan semua ${list.length} ruang`);
    btn.type = 'button';
    btn.addEventListener('click', () => { state.showAll = true; renderFree(state, data); });
    wrap.append(btn); box.append(wrap);
    box.lastChild.style.gridColumn = '1 / -1';
  }
}

function renderGrid(state, data) {
  const g = state.g;
  const rooms = data.c.ajar.filter((r) => (!g.jenis || r.jenis === g.jenis) && (!g.gedung || r.gedung === g.gedung))
    .sort((a, b) => a.gedung.localeCompare(b.gedung) || a.kode.localeCompare(b.kode));
  const byRoom = new Map();
  for (const j of data.jadwal) if (j.hari === g.hari) { if (!byRoom.has(j.ruang)) byRoom.set(j.ruang, []); byRoom.get(j.ruang).push(j); }
  const tbl = $('#grid'); tbl.replaceChildren();
  const hr = tbl.createTHead().insertRow();
  hr.append(el('th', 'rh', 'Ruang'));
  for (const s of SESI) hr.append(el('th', null, `${s[0]} · ${jam(s[1])}`));
  const body = tbl.createTBody();
  for (const r of rooms) {
    const tr = body.insertRow();
    const h = el('td', 'rh'); h.append(el('div', 'k', r.kode), el('div', 's', (r.nama || r.jenis) + (r.kapasitas ? ` · ${r.kapasitas} org` : '')));
    tr.append(h);
    const list = byRoom.get(r.kode) || [];
    const at = SESI.map((s) => list.find((j) => busy(j, s[1], s[2], true)) || null);
    for (let i = 0; i < at.length; i++) {
      const j = at[i]; let span = 1;
      while (j && i + span < at.length && at[i + span] === j) span++;
      const td = document.createElement('td');
      if (j) {
        td.colSpan = span;
        td.className = j.kategori !== KULIAH ? 'adm' : j.lintas_fakultas === 'ya' ? 'lf' : 'busy';
        td.append(document.createTextNode(`${j.mata_kuliah} (${j.kelas} ${j.jenjang})`), el('span', 't', `${j.mulai.replace(':', '.')}–${j.selesai.replace(':', '.')} · ${j.prodi}`));
        td.title = `${j.kode_mk} · ${j.mata_kuliah} · kelas ${j.kelas} · ${j.prodi}`;
      }
      tr.append(td); i += span - 1;
    }
  }
  if (!rooms.length) { const td = body.insertRow().insertCell(); td.colSpan = 12; td.textContent = 'Tidak ada ruang untuk pilihan ini.'; }
}

function renderUtil(state, data) {
  const u = state.u, q = u.q.trim().toLowerCase();
  const rows = data.c.util.filter((r) => (!u.jenis || r.jenis === u.jenis) && (!u.kampus || r.kampus === u.kampus)
    && (!q || [r.kode, r.nama, r.gedung].join(' ').toLowerCase().includes(q)));
  const tbl = $('#util'); tbl.replaceChildren();
  const hr = tbl.createTHead().insertRow();
  for (const [t, c] of [['Kode'], ['Nama'], ['Jenis'], ['Gedung'], ['Kapasitas', 'num'], ['Slot terisi', 'num'], ['Keterisian', 'num'], ['']]) hr.append(el('th', c || null, t));
  const body = tbl.createTBody();
  for (const r of rows) {
    const tr = body.insertRow();
    for (const [v, c] of [[r.kode], [r.nama || '—'], [r.jenis], [r.gedung], [r.kapasitas ?? '—', 'num'], [`${r.slot} / 45`, 'num'], [r.pct + '%', 'num']]) tr.append(el('td', c || null, String(v)));
    const bar = el('div', 'ubar'); const i = el('i', r.pct < 20 ? 'low' : null); i.style.width = r.pct + '%'; bar.append(i);
    const td = el('td'); td.append(bar); tr.append(td);
  }
  if (!rows.length) { const td = body.insertRow().insertCell(); td.colSpan = 8; td.textContent = 'Tidak ada ruang yang cocok.'; }
}

function renderTanpaRuang(jadwal) {
  const order = [...HARI, 'Minggu', 'BEBAS'];
  const rows = jadwal.filter((j) => j.kategori === 'Tanpa ruangan').sort((a, b) => order.indexOf(a.hari) - order.indexOf(b.hari) || a.mulai.localeCompare(b.mulai));
  const tbl = $('#tanparuang'); tbl.replaceChildren();
  const hr = tbl.createTHead().insertRow();
  for (const t of ['Hari', 'Jam', 'Mata kuliah', 'Kelas', 'Prodi']) hr.append(el('th', null, t));
  const body = tbl.createTBody();
  for (const j of rows) {
    const tr = body.insertRow();
    for (const v of [j.hari, j.mulai === '00:00' ? '—' : `${j.mulai.replace(':', '.')}–${j.selesai.replace(':', '.')}`, j.mata_kuliah, `${j.kelas} ${j.jenjang}`, j.prodi]) tr.append(el('td', null, v));
  }
}

// ---------- start ----------
async function start() {
  const [jadwal, ruang, meta] = await Promise.all(['jadwal', 'ruang', 'meta'].map((n) => fetch(`/data/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); })));
  const c = compute(jadwal, ruang);
  const data = { jadwal, ruang, c };
  document.querySelectorAll('[data-meta]').forEach((e) => { e.textContent = meta[e.dataset.meta] || '—'; });

  const now = nowSlot();
  const state = {
    heat: 'Semua ruang ajar',
    f: { hari: now.hari, sesi: now.sesi, jenis: DEFAULT_JENIS, kampus: DEFAULT_KAMPUS, cap: 0, adm: false },
    g: { hari: now.hari, jenis: 'Kelas Teori', gedung: '' },
    u: { q: '', jenis: '', kampus: '' },
  };

  // hero: status langsung
  const liveFree = freeRooms(jadwal, c.ajar, state.f).length;
  $('#live-text').textContent = `${now.live ? 'Sekarang' : 'Sesi berikutnya'} ${now.hari}, sesi ${now.sesi}: ${liveFree} kelas teori kosong di Jatinangor`;

  renderKpis(c.k);
  renderHeat(c.heat, state.heat);
  renderBars($('#bars-jam'), c.jamMulai.filter((r) => r.n >= 5), (r) => r.mulai.replace(':', '.'), (r) => r.n, (r) => (r.grid ? 'var(--green)' : 'var(--gold)'));
  renderBars($('#bars-tpr'), c.tpr, (r) => r.prodi, (r) => r.n, () => 'var(--green)');
  renderTanpaRuang(jadwal);

  document.querySelectorAll('#heat-chips .chip').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#heat-chips .chip').forEach((x) => x.classList.toggle('on', x === b));
    state.heat = b.dataset.v; renderHeat(c.heat, state.heat);
  }));

  // form cari ruang kosong
  const F = $('#f');
  fill(F.hari, HARI.map((h) => [h, h]), state.f.hari);
  fill(F.sesi, SESI.map((s) => [String(s[0]), sesiLabel(s)]), String(state.f.sesi));
  fill(F.jenis, [['', 'Semua ruang ajar'], ...JENIS.map((j) => [j, j])], DEFAULT_JENIS);
  fill(F.kampus, [['', 'Semua kampus'], ...KAMPUS.map((k) => [k, k])], DEFAULT_KAMPUS);
  const readF = () => { state.showAll = false; state.f = { hari: F.hari.value, sesi: Number(F.sesi.value), jenis: F.jenis.value, kampus: F.kampus.value, cap: Number(F.cap.value) || 0, adm: F.adm.checked }; renderFree(state, data); };
  F.addEventListener('input', readF); F.addEventListener('change', readF);
  F.addEventListener('submit', (e) => e.preventDefault());
  $('#f-now').addEventListener('click', () => { const n = nowSlot(); F.hari.value = n.hari; F.sesi.value = String(n.sesi); readF(); });
  renderFree(state, data);

  // grid harian
  const G = $('#g');
  fill(G.hari, HARI.map((h) => [h, h]), state.g.hari);
  fill(G.jenis, [['', 'Semua ruang ajar'], ...JENIS.map((j) => [j, j])], state.g.jenis);
  fill(G.gedung, [['', 'Semua gedung'], ...[...new Set(c.ajar.map((r) => r.gedung))].sort().map((g) => [g, g])], '');
  G.addEventListener('change', () => { state.g = { hari: G.hari.value, jenis: G.jenis.value, gedung: G.gedung.value }; renderGrid(state, data); });
  renderGrid(state, data);

  // tabel keterisian
  const U = $('#u');
  fill(U.jenis, [['', 'Semua ruang ajar'], ...JENIS.map((j) => [j, j])], '');
  fill(U.kampus, [['', 'Semua kampus'], ...KAMPUS.map((k) => [k, k])], '');
  const readU = () => { state.u = { q: U.q.value, jenis: U.jenis.value, kampus: U.kampus.value }; renderUtil(state, data); };
  U.addEventListener('input', readU); U.addEventListener('change', readU); U.addEventListener('submit', (e) => e.preventDefault());
  renderUtil(state, data);
}

start().catch((e) => {
  console.error(e);
  $('#live-text').textContent = 'Data jadwal gagal dimuat.';
});
