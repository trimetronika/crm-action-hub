import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

async function checkAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get('crm_session')?.value;
    if (!token) return null;
    try {
        const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production');
        const { payload } = await jwtVerify(token, secret);
        return payload.username as string;
    } catch(e) {
        return null;
    }
}

export async function POST(req: Request) {
    const username = await checkAuth();
    if (!username) return NextResponse.json({ success: false, error: "Sesi tidak valid." }, { status: 401 });

    try {
        const body = await req.json();
        const { newRows, updateRows, missingIds } = body;

        if (!Array.isArray(newRows) || !Array.isArray(updateRows)) {
            return NextResponse.json({ success: false, error: "Payload tidak valid." }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            // Ensure User exists
            await tx.user.upsert({ where: { username }, create: { username }, update: {} });

            // 1. Create New Rows
            for (const row of newRows) {
                await tx.lead.create({
                    data: {
                        username,
                        sourceId: row.sourceId,
                        namaPerusahaan: row.namaPerusahaan,
                        pic: row.pic,
                        telepon: row.telepon || '',
                        layanan: row.layanan || '',
                        nilaiDeal: row.nilaiDeal || 0,
                        tahapan: row.tahapan || '',
                        bulan: row.bulan || '',
                        updateTerakhir: row.updateTerakhir || ''
                    }
                });
            }

            // 2. Update Existing Rows
            for (const row of updateRows) {
                await tx.lead.update({
                    where: { username_sourceId: { username, sourceId: row.sourceId } },
                    data: {
                        telepon: row.telepon || '',
                        layanan: row.layanan || '',
                        nilaiDeal: row.nilaiDeal || 0,
                        tahapan: row.tahapan || '',
                        bulan: row.bulan || '',
                        updateTerakhir: row.updateTerakhir || '',
                        deletedAt: null, // restore if it was previously soft-deleted
                        lastSync: new Date()
                    }
                });
            }

            // 3. Soft Delete Missing Rows (Archive)
            if (Array.isArray(missingIds) && missingIds.length > 0) {
                await tx.lead.updateMany({
                    where: { username, sourceId: { in: missingIds } },
                    data: { deletedAt: new Date() }
                });
            }

            // 4. Log SyncJob
            await tx.syncJob.create({
                data: {
                    username,
                    status: 'SUCCESS',
                    recordsAffected: newRows.length + updateRows.length + (missingIds?.length || 0),
                    message: `Commit sukses: ${newRows.length} baru, ${updateRows.length} diperbarui.`
                }
            });
        });

        return NextResponse.json({ success: true, message: "Impor berhasil diselesaikan." });
    } catch (error: any) {
        // Log failed sync job outside transaction
        try {
            await prisma.syncJob.create({
                data: {
                    username,
                    status: 'ERROR',
                    recordsAffected: 0,
                    message: error.message || 'Atomic commit failed'
                }
            });
        } catch (e) {}

        return NextResponse.json({ success: false, error: "Gagal menyimpan ke database: " + error.message }, { status: 500 });
    }
}
