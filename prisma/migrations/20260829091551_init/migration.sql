-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "geminiKey" TEXT,
    "aiModel" TEXT DEFAULT 'gemini-3.6-flash',
    "templatePath" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namaPerusahaan" TEXT NOT NULL,
    "pic" TEXT NOT NULL,
    "telepon" TEXT NOT NULL,
    "layanan" TEXT NOT NULL,
    "nilaiDeal" TEXT NOT NULL,
    "tahapan" TEXT NOT NULL,
    "bulan" TEXT NOT NULL,
    "catatan" TEXT,
    "email" TEXT,
    "lastSync" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
