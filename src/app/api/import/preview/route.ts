import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { execFile } from 'child_process';
import path from 'path';
import crypto from 'crypto';

async function checkAuthAndGetCreds() {
    const cookieStore = await cookies();
    const token = cookieStore.get('crm_session')?.value;
    if (!token) return null;
    try {
        const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production');
        const { payload } = await jwtVerify(token, secret);
        return { username: payload.username as string, password: payload.password as string };
    } catch(e) {
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, data, start, end } = body;

        const auth = await checkAuthAndGetCreds();
        if (!auth) return NextResponse.json({ success: false, error: "Sesi tidak valid." }, { status: 401 });
        const { username, password } = auth;

        let rawData: any[] = [];
        let isFullSync = false;

        if (type === 'excel') {
            if (!Array.isArray(data)) return NextResponse.json({ success: false, error: "Format data Excel tidak valid." }, { status: 400 });
            rawData = data;
        } else {
            return NextResponse.json({ success: false, error: "Tipe impor tidak valid. Sinkronisasi absenku kini ditangani oleh Sync Runner." }, { status: 400 });
        }

        // Fetch existing leads for comparison
        const existingLeads = await prisma.lead.findMany({
            where: { username, deletedAt: null }
        });
        const existingMap = new Map();
        existingLeads.forEach(l => existingMap.set(l.sourceId, l));

        const preview = {
            newRows: [] as any[],
            updateRows: [] as any[],
            missingIds: [] as string[],
            invalidRows: [] as any[],
            totalIncoming: rawData.length
        };

        const incomingSourceIds = new Set();

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            
            // Normalize Company Name & PIC
            const nama = (row['Nama Perusahaan'] || '').toString().trim();
            const pic = (row['PIC'] || '').toString().trim();
            
            if (!nama) {
                preview.invalidRows.push({ rowNumber: i + 1, reason: "Nama Perusahaan kosong." });
                continue;
            }

            const sourceId = crypto.createHash('md5').update(nama + pic).digest('hex');
            
            if (incomingSourceIds.has(sourceId)) {
                preview.invalidRows.push({ rowNumber: i + 1, reason: `Duplikasi internal pada data masuk (Perusahaan: ${nama}, PIC: ${pic})` });
                continue;
            }
            incomingSourceIds.add(sourceId);

            // Normalize Nilai Deal
            let rawNilai = row['Nilai Deal'] || '';
            if (typeof rawNilai === 'number') rawNilai = rawNilai.toString();
            const numericNilai = parseFloat(rawNilai.replace(/[^0-9]/g, '')) || 0;

            const normalizedRow = {
                sourceId,
                namaPerusahaan: nama,
                pic: pic,
                telepon: (row['Telepon'] || '').toString().trim(),
                layanan: (row['Layanan'] || '').toString().trim(),
                nilaiDeal: numericNilai,
                tahapan: (row['Tahapan'] || '').toString().trim(),
                bulan: (row['Bulan'] || '').toString().trim(),
                updateTerakhir: (row['Update Terakhir'] || '').toString().trim()
            };

            const existing = existingMap.get(sourceId);
            if (existing) {
                // Conflict Resolution Policy (Merge Rules):
                // If user changed telepon in CRM, and incoming is empty, keep CRM's.
                if (!normalizedRow.telepon && existing.telepon) normalizedRow.telepon = existing.telepon;
                if (!normalizedRow.layanan && existing.layanan) normalizedRow.layanan = existing.layanan;
                if (normalizedRow.nilaiDeal === 0 && existing.nilaiDeal > 0) normalizedRow.nilaiDeal = existing.nilaiDeal;
                
                // Track changes for preview
                const changes = [];
                if (existing.tahapan !== normalizedRow.tahapan) changes.push(`Tahapan: ${existing.tahapan} ➔ ${normalizedRow.tahapan}`);
                if (existing.nilaiDeal !== normalizedRow.nilaiDeal) changes.push(`Nilai Deal: ${existing.nilaiDeal} ➔ ${normalizedRow.nilaiDeal}`);

                preview.updateRows.push({ ...normalizedRow, _changes: changes });
            } else {
                preview.newRows.push(normalizedRow);
            }
        }

        if (isFullSync) {
            preview.missingIds = existingLeads
                .map(l => l.sourceId)
                .filter(id => !incomingSourceIds.has(id));
        }

        return NextResponse.json({ success: true, preview });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
    }
}
