#!/usr/bin/env python3
"""
siat_to_json.py — ubah halaman SIAT "Jadwal Kuliah Per Ruang" (disimpan sebagai HTML)
menjadi data untuk web app:  public/data/jadwal.json, ruang.json, meta.json

Pemakaian:
    pip install beautifulsoup4
    python scripts/siat_to_json.py Jadwal_Kuliah_Per_Ruang.html --semester "2026/2027 Ganjil"
"""
import argparse, datetime, json, re, pathlib
from bs4 import BeautifulSoup

DAYS = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu','BEBAS']
SESI = [("1","07:30","08:20"),("2","08:20","09:10"),("3","09:10","10:00"),
        ("4","10:15","11:05"),("5","11:05","11:55"),("6","11:55","12:45"),
        ("7","13:15","14:05"),("8","14:05","14:55"),("9","14:55","15:45"),
        ("10","15:45","16:35"),("11","16:35","17:25")]
m = lambda t: int(t[:2])*60+int(t[3:])
SESI_M = [(k, m(a), m(b)) for k,a,b in SESI]
STARTS = {m(a) for _,a,_ in SESI}
AJAR = {"Kelas Teori","Laboratorium","Ruang Seminar","Sidang","Ruang Pertemuan / Aula",
        "Ruang Tutorial","Ruang Diskusi","Ruang Pendidikan"}
PRODI = {"140110":"Matematika S1","140120":"Kimia S2","140130":"Kimia S3 (?)","140104":"Sarjana Terapan 140104 (?)",
 "140210":"Kimia S1","140220":"Matematika S2","140230":"Matematika S3 (?)","140310":"Fisika S1",
 "140320":"Biologi S2","140330":"Biologi S3 (?)","140410":"Biologi S1","140610":"Statistika S1",
 "140710":"Geofisika S1","140720":"Statistika S2","140810":"Teknik Informatika S1","140820":"Fisika S2",
 "140910":"Teknik Elektro S1 (?)","141010":"Aktuaria S1"}
ADMIN = re.compile(r"Tugas Akhir|Magang|KKN|Kuliah Kerja|Skripsi|Tesis|Disertasi|Kerja Prakt", re.I)
def kampus(code, ged):
    if code.startswith("0201"): return "Jatinangor"
    if code.startswith(("0106","0118")): return "Bandung (Singaperbangsa/Dipati Ukur)"
    return "-"

def parse(html):
    s = BeautifulSoup(html, 'html.parser')
    rooms, entries = [], []
    for a in s.select('a.btn_ruang'):
        box = a.find_parent('table'); tr = box.find_parent('td').find_parent('tr')
        cells = tr.find_all('td', recursive=False)
        code = a.get_text(strip=True)
        rooms.append(dict(code=code, name=a.get('title', ''),
            type=box.select_one('.ruang_jenis').get_text(strip=True),
            building=box.select_one('div.ruang_gedung').get_text(strip=True),
            cap=box.select_one('.ruang_kapasitas').get_text(strip=True)))
        for di, c in enumerate(cells[2:]):
            for t in c.select('table.tabel_jadwal'):
                b = t.find('b').get_text(strip=True); lk = t.find('a')
                m = re.match(r'\[(\d\d):(\d\d)-(\d\d):(\d\d)\]', b)
                txt = lk.get_text(' ', strip=True)
                mm = re.match(r'(.*) \(\s*(\S+)\s+Kls (\S+) (\S+)(.*)\)$', txt)
                e = dict(room=code, day=DAYS[di], start=f'{m[1]}:{m[2]}', end=f'{m[3]}:{m[4]}', id=lk.get('alt'),
                         scope=t.find('td')['class'][0], gabung='gabung' in ' '.join(t['class']))
                e.update(course=mm[1], mk=mm[2], kls=mm[3], level=mm[4]) if mm else e.update(course=txt, mk='', kls='', level='')
                entries.append(e)
    return rooms, entries

def build(rooms_raw, entries):
    rooms, ruang_rows = {}, []
    for r in rooms_raw:
        cap = re.match(r"(\d+)", r["cap"])
        row = dict(kode=r["code"], nama=r["name"].strip(), jenis=r["type"], gedung=re.sub(r"\s+", " ", r["building"]),
                   kampus=kampus(r["code"], r["building"]), kapasitas=int(cap[1]) if cap else None,
                   ruang_ajar="ya" if r["type"] in AJAR else "tidak")
        rooms[r["code"]] = row
        if r["code"] != "Tanpa Ruangan": ruang_rows.append(row)
    jadwal = []
    for e in entries:
        r = rooms[e["room"]]; s, t = m(e["start"]), m(e["end"]); pk = e["id"][:6]
        if e["room"] == "Tanpa Ruangan": kat = "Tanpa ruangan"
        elif s == 0 and t == 0: kat = "Tanpa jam"
        elif t <= s: kat = "Jam tidak valid"
        elif ADMIN.search(e["course"]) and not re.search(r"seminar|sidang", e["course"], re.I): kat = "Administratif (TA/Magang/KKN)"
        else: kat = "Kuliah/praktikum"
        sesi = [k for k, a, b in SESI_M if min(t, b) - max(s, a) >= 25] if kat == "Kuliah/praktikum" else []
        jadwal.append(dict(id=e["id"], ruang=e["room"], nama_ruang=r["nama"], jenis_ruang=r["jenis"], gedung=r["gedung"],
            kampus=r["kampus"], hari=e["day"], mulai=e["start"], selesai=e["end"], mulai_menit=s, selesai_menit=t,
            mata_kuliah=e["course"].strip(), kode_mk=e["mk"], kelas=e["kls"], jenjang=e["level"],
            prodi_kode=pk, prodi=PRODI.get(pk, ("Sekolah Vokasi " if pk.startswith("28") else "Fakultas lain ") + pk),
            kategori=kat, kelas_gabung="ya" if e["gabung"] else "tidak",
            lintas_fakultas="ya" if e["scope"] == "bedafakultas" else "tidak",
            sesi=",".join(sesi), sesuai_grid=("ya" if s in STARTS else "tidak") if kat == "Kuliah/praktikum" else ""))
    return jadwal, ruang_rows

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("html"); ap.add_argument("--semester", default="")
    ap.add_argument("--out", default=str(pathlib.Path(__file__).resolve().parent.parent / "public" / "data"))
    a = ap.parse_args()
    raw = pathlib.Path(a.html).read_text(encoding="latin-1")
    jadwal, ruang = build(*parse(raw))
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    dump = lambda n, d: (out / n).write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    dump("jadwal.json", jadwal); dump("ruang.json", ruang)
    dump("meta.json", dict(semester=a.semester, diperbarui=datetime.date.today().isoformat(), sumber="SIAT Unpad — Jadwal Kuliah Per Ruang"))
    print(f"{len(ruang)} ruang, {len(jadwal)} jadwal -> {out}")
