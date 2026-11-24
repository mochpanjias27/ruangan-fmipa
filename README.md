# Ruang FMIPA Unpad — Pemantauan Penggunaan Ruang

Web app statis (Vite + Three.js) untuk memantau penggunaan ruang FMIPA Unpad:
hero dengan animasi 3D ruang kelas, ringkasan keterisian per sesi, pencari ruang kosong,
jadwal harian per sesi, keterisian per ruang, dan catatan data.

Data berasal dari halaman SIAT Akademik **Jadwal Kuliah Per Ruang** yang disimpan sebagai HTML.

## Menjalankan di komputer

```bash
npm install
npm run dev        # buka http://localhost:5173
npm run build      # hasil di folder dist/
```

Butuh Node.js 18 ke atas.

## Deploy ke Vercel

**Cara 1 — lewat GitHub (disarankan)**
1. Buat repository baru di GitHub, lalu unggah seluruh isi folder ini (tanpa `node_modules` dan `dist`).
2. Di https://vercel.com/new pilih **Import Git Repository**, lalu pilih repository tadi.
3. Vercel otomatis mengenali Vite (Build Command `npm run build`, Output `dist`). Klik **Deploy**.
4. Setiap kali ada perubahan yang di-push ke GitHub (misalnya data semester baru), Vercel otomatis deploy ulang.

**Cara 2 — lewat Vercel CLI**
```bash
npm i -g vercel
vercel          # deploy pratinjau
vercel --prod   # deploy produksi
```

## Memperbarui data tiap semester

1. Buka SIAT → Akademik → Penawaran & Jadwal → **Jadwal Kuliah Per Ruang**, pilih Fakultas MIPA dan semesternya, lalu klik Tampilkan.
2. Simpan halamannya: **Ctrl+S → "Webpage, HTML only"**.
3. Jalankan:
   ```bash
   pip install beautifulsoup4
   python scripts/siat_to_json.py Jadwal_Kuliah_Per_Ruang.html --semester "2026/2027 Genap"
   ```
   Skrip ini menulis ulang `public/data/jadwal.json`, `ruang.json`, dan `meta.json`.
4. Commit dan push (Cara 1) atau jalankan `vercel --prod` (Cara 2).

## Catatan penting soal akses data

File di `public/data/` ikut ter-deploy dan **dapat dibuka siapa saja yang tahu alamat situsnya**
(misalnya `https://<situs>.vercel.app/data/jadwal.json`). Isinya berupa jadwal, kelas, dan ruang,
tanpa data mahasiswa atau nama dosen. Karena sumbernya SIAT yang aksesnya terbatas, mintalah persetujuan
fakultas sebelum situs dibagikan luas. Jika akses perlu dibatasi, aktifkan **Vercel Deployment Protection**
(Password Protection) atau minta DTI Unpad menghubungkan situs ini dengan SSO Unpad.

## Aturan hitung

- Grid sesi: 1 SKS = 50 menit, mulai 07.30; istirahat 10.00–10.15, ishoma 12.45–13.15 (sesi 1–11 sampai 17.25).
- Sebuah ruang dianggap terpakai pada suatu sesi bila ada jadwal yang menempati minimal 25 menit dari sesi itu.
- Keterisian = slot terisi dari 45 slot (Senin–Jumat × sesi 1–9).
- Jadwal Tugas Akhir, Magang, KKN, Kuliah Kerja, Skripsi, Tesis, dan Disertasi (kecuali seminar/sidang) dianggap
  administratif: tidak memakai ruang secara fisik.
- Label prodi bertanda (?) adalah dugaan dari nama mata kuliah. Ubah di `PRODI` pada `scripts/siat_to_json.py`.

## Struktur

```
index.html               halaman
src/main.js              logika data & tampilan
src/classroom.js         scene 3D ruang kelas (Three.js, prosedural)
src/style.css            tema FMIPA Unpad (hijau #32643A, emas #F9B315) + Unpad Sans
public/data/             data jadwal (hasil skrip)
public/fonts/            Unpad Sans
public/img/              logo FMIPA Unpad
scripts/siat_to_json.py  konversi HTML SIAT → JSON
```
