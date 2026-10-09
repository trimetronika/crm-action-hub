import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { execFile } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { withErrorHandler } from '@/lib/errorHandler';
import { decryptString } from '@/lib/encryption';

async function checkAuthAndGetCreds() {
    const cookieStore = await cookies();
    const token = cookieStore.get('crm_session')?.value;
    if (!token) return null;
    try {
        const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production');
        const { payload } = await jwtVerify(token, secret);
        const password = decryptString(payload.encryptedPassword as string);
        return { username: payload.username as string, password };
    } catch(e) {
        return null;
    }
}

function runPythonSync(username: string, password: string, start?: string, end?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'python_scripts', 'sync_kanban.py');
        const args = ['--user', username, '--password', password];
        if (start) args.push('--start', start);
        if (end) args.push('--end', end);

        execFile('python', [scriptPath, ...args], { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
                console.error("Python Error:", error);
                return reject("Gagal menghubungi server pusat. Terjadi gangguan koneksi.");
            }
            try {
                const jsonStr = stdout.substring(stdout.indexOf('{'));
                const parsed = JSON.parse(jsonStr);
                if (!parsed.success) return reject(parsed.message || "Gagal menarik data dari server.");
                resolve(parsed.data);
            } catch(e) {
                reject("Format balasan dari server tidak valid.");
            }
        });
    });
}

// Timeout wrapper for transient errors
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject("Sistem terlalu lama merespon (Timeout)."), ms);
        promise.then(value => {
            clearTimeout(timer);
            resolve(value);
        }).catch(err => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

export const POST = withErrorHandler(async (req: Request, correlationId: string) => {
    logger.info('Sync route hit', { correlationId });
    try {
        const auth = await checkAuthAndGetCreds();
        if (!auth) return NextResponse.json({ success: false, error: "Sesi tidak valid." }, { status: 401 });
        const { username, password } = auth;

        const body = await req.json();
        const { start, end } = body;

        // Validations
        if (start && end && new Date(start) > new Date(end)) {
            return NextResponse.json({ success: false, error: "Rentang bulan tidak valid." }, { status: 400 });
        }

        // Concurrency Lock: Check if a job is already running
        const runningJob = await prisma.syncJob.findFirst({
            where: { username, status: 'RUNNING' }
        });
        if (runningJob) {
            return NextResponse.json({ success: false, error: "Terdapat proses sinkronisasi yang sedang berjalan." }, { status: 409 });
        }

        // Create Job Lifecycle: REQUESTED -> RUNNING
        const job = await prisma.syncJob.create({
            data: {
                username,
                status: 'RUNNING',
                syncPeriodStart: start || null,
                syncPeriodEnd: end || null,
                message: 'Memulai proses sinkronisasi...'
            }
        });

        const isFullSync = (!start && !end);

        try {
            // Retry logic (max 2 retries = 3 attempts total)
            let rawData: any[] = [];
            let attempt = 0;
            const maxAttempts = 3;
            let lastError = "";

            while (attempt < maxAttempts) {
                try {
                    // Python sync with 45s timeout per attempt
                    rawData = await withTimeout(runPythonSync(username, password, start, end), 45000);
                    break; // Success, break loop
                } catch (e: any) {
                    attempt++;
                    lastError = typeof e === 'string' ? e : (e.message || "Unknown error");
                    if (attempt >= maxAttempts) throw new Error(`Gagal setelah ${maxAttempts} percobaan: ${lastError}`);
                    // Wait before retry
                    await new Promise(r => setTimeout(r, 2000)); 
                }
            }

            // Ingestion Pipeline Logic (Merge Policy)
            const existingLeads = await prisma.lead.findMany({
                where: { username, deletedAt: null }
            });
            const existingMap = new Map();
            existingLeads.forEach(l => existingMap.set(l.sourceId, l));

            const newRows: any[] = [];
            const updateRows: any[] = [];
            let skippedCount = 0;
            let failedCount = 0;
            const incomingSourceIds = new Set();

            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                const nama = (row['Nama Perusahaan'] || '').toString().trim();
                const pic = (row['PIC'] || '').toString().trim();
                
                if (!nama) {
                    failedCount++; // Invalid row
                    continue;
                }

                const sourceId = crypto.createHash('md5').update(nama + pic).digest('hex');
                
                if (incomingSourceIds.has(sourceId)) {
                    skippedCount++; // Duplicate within payload
                    continue;
                }
                incomingSourceIds.add(sourceId);

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
                    // Conflict Resolution
                    if (!normalizedRow.telepon && existing.telepon) normalizedRow.telepon = existing.telepon;
                    if (!normalizedRow.layanan && existing.layanan) normalizedRow.layanan = existing.layanan;
                    if (normalizedRow.nilaiDeal === 0 && existing.nilaiDeal > 0) normalizedRow.nilaiDeal = existing.nilaiDeal;
                    
                    // Check if actual update is needed (compare primitive fields)
                    const isChanged = (
                        existing.telepon !== normalizedRow.telepon ||
                        existing.layanan !== normalizedRow.layanan ||
                        existing.nilaiDeal !== normalizedRow.nilaiDeal ||
                        existing.tahapan !== normalizedRow.tahapan ||
                        existing.bulan !== normalizedRow.bulan ||
                        existing.updateTerakhir !== normalizedRow.updateTerakhir
                    );

                    if (isChanged) {
                        updateRows.push(normalizedRow);
                    } else {
                        skippedCount++;
                    }
                } else {
                    newRows.push(normalizedRow);
                }
            }

            let missingIds: string[] = [];
            if (isFullSync) {
                missingIds = existingLeads
                    .map(l => l.sourceId)
                    .filter(id => !incomingSourceIds.has(id));
            }

            // Atomic Commit
            await prisma.$transaction(async (tx) => {
                // Upsert user ensuring it exists
                await tx.user.upsert({ where: { username }, create: { username }, update: {} });

                for (const row of newRows) {
                    await tx.lead.create({
                        data: {
                            username,
                            sourceId: row.sourceId,
                            namaPerusahaan: row.namaPerusahaan,
                            pic: row.pic,
                            telepon: row.telepon,
                            layanan: row.layanan,
                            nilaiDeal: row.nilaiDeal,
                            tahapan: row.tahapan,
                            bulan: row.bulan,
                            updateTerakhir: row.updateTerakhir
                        }
                    });
                }

                for (const row of updateRows) {
                    await tx.lead.update({
                        where: { username_sourceId: { username, sourceId: row.sourceId } },
                        data: {
                            telepon: row.telepon,
                            layanan: row.layanan,
                            nilaiDeal: row.nilaiDeal,
                            tahapan: row.tahapan,
                            bulan: row.bulan,
                            updateTerakhir: row.updateTerakhir,
                            deletedAt: null,
                            lastSync: new Date()
                        }
                    });
                }

                if (missingIds.length > 0) {
                    await tx.lead.updateMany({
                        where: { username, sourceId: { in: missingIds } },
                        data: { deletedAt: new Date() }
                    });
                }
            });

            // Job Status Update -> SUCCESS
            const statusStr = failedCount > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS';
            await prisma.syncJob.update({
                where: { id: job.id },
                data: {
                    status: statusStr,
                    importedCount: newRows.length,
                    updatedCount: updateRows.length,
                    skippedCount: skippedCount,
                    failedCount: failedCount,
                    recordsAffected: newRows.length + updateRows.length + missingIds.length,
                    message: `Selesai: ${newRows.length} baru, ${updateRows.length} update, ${skippedCount} dilewati`,
                    completedAt: new Date()
                }
            });

            return NextResponse.json({ 
                success: true, 
                message: "Sinkronisasi berhasil diselesaikan",
                data: {
                    imported: newRows.length,
                    updated: updateRows.length,
                    skipped: skippedCount,
                    failed: failedCount
                }
            });

        } catch (jobError: any) {
            // Job Status Update -> FAILED
            await prisma.syncJob.update({
                where: { id: job.id },
                data: {
                    status: 'FAILED',
                    errorMessage: jobError.message || "Kesalahan sistem tidak terduga.",
                    message: 'Gagal selama eksekusi',
                    completedAt: new Date()
                }
            });

            return NextResponse.json({ 
                success: false, 
                error: jobError.message || "Kesalahan saat sinkronisasi data."
            }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ success: false, error: "Sistem sibuk. " + error.toString() }, { status: 500 });
    }
});
