# CRM Absenku - Action Hub

Sistem CRM komprehensif berbasis Next.js App Router (React) terintegrasi dengan Google Gemini AI untuk manajemen leads, *follow up* cerdas, dan sinkronisasi data *kanban* eksternal.

## 🚀 Persyaratan Sistem
- **Node.js**: v18.x atau v20.x
- **Python**: v3.11+ (untuk skrip dokumen)
- **Database**: SQLite (built-in via Prisma)

## 🛠️ Instalasi & Setup Lokal

1. **Clone Repositori**
   \\\ash
   git clone <repo-url>
   cd crm-action-hub
   \\\

2. **Instalasi Dependencies (Reproducible)**
   Gunakan \
pm ci\ untuk memastikan konsistensi \package-lock.json\.
   \\\ash
   npm ci
   pip install -r requirements.txt
   \\\

3. **Konfigurasi Environment**
   Salin file konfigurasi lingkungan:
   \\\ash
   cp .env.example .env
   \\\
   Lengkapi variabel \GEMINI_API_KEY\ dan kredensial absensi Anda di dalam file \.env\.

4. **Inisialisasi Database**
   Terapkan skema ke database SQLite lokal:
   \\\ash
   npx prisma db push
   npx prisma generate
   \\\

5. **Jalankan Development Server**
   \\\ash
   npm run dev
   \\\
   Buka [http://localhost:3000](http://localhost:3000) di browser.

## ✅ Pengujian & Quality Gates
Repositori ini memiliki *quality gate* ketat yang harus dilewati sebelum dideploy:
\\\ash
npm run validate
\\\
Perintah ini akan berurutan menjalankan:
1. \lint\ (ESLint strict check)
2. \	ypecheck\ (TypeScript tipe data)
3. \	est\ (Vitest integrasi dan unit)
4. \uild\ (Next.js Production Build)

## 🌐 Panduan Deployment (Produksi)
Aplikasi ini mendukung *hosting* Next.js standar seperti **Vercel**, atau VPS Linux menggunakan **PM2 / Docker**.

**Langkah Deployment VPS (PM2):**
1. Pull kode terbaru.
2. Jalankan \
pm ci\ dan \pip install -r requirements.txt\.
3. Jalankan \
pm run validate\ untuk memastikan kode aman.
4. Backup database (lihat dokumen \ackup_runbook.md\).
5. Jalankan \
pm run build\.
6. Start aplikasi dengan \pm2 start npm --name "crm-absenku" -- start\.

## ⚠️ Operasional & Incident Response
*   **Error 500 saat Sync:** Cek log di PM2/Vercel. Cocokkan \correlationId\ yang muncul di layar dengan log *server*. Cek \AuditLog\ di database.
*   **Rollback Database:** Hentikan aplikasi, *copy/overwrite* file \dev.db\ dari folder \ackups/\, jalankan \
px prisma db pull\, lalu *start* kembali. (Panduan lengkap di \ackup_runbook.md\).
