@echo off
title CRM Action Hub - BUILD PRODUCTION
color 0D

echo ===================================================
echo     MEMPERBARUI KODE CRM ACTION HUB (BUILD PROD)
echo ===================================================
echo.
echo Menjalankan "npm run build"...
echo Harap tunggu, proses ini akan mengoptimasi kode Anda.
echo Jangan tutup jendela ini sampai selesai.
echo.

npm run build

echo.
echo ===================================================
echo BUILD SELESAI! Anda kini bisa menjalankan Prod Mode.
echo ===================================================
pause
