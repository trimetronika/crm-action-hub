import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('crm_session')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production');
    const { payload } = await jwtVerify(token, secret);
    return payload.username as string;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  const username = await checkAuth();
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { chats } = body; 

    if (!Array.isArray(chats)) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let importedCount = 0;

    await prisma.$transaction(async (tx) => {
        for (const chatData of chats) {
            const { companyName, messages } = chatData;
            
            // Cari lead aktif berdasarkan nama perusahaan
            const lead = await tx.lead.findFirst({
                where: { username, namaPerusahaan: companyName, deletedAt: null }
            });

            if (lead && Array.isArray(messages) && messages.length > 0) {
                // Hapus riwayat chat lama (jika ada) agar tidak terjadi duplikasi saat import
                await tx.chatActivity.deleteMany({ where: { leadId: lead.id } });

                const activities = messages.map((m: any) => ({
                    leadId: lead.id,
                    role: m.role || 'user',
                    text: m.text || '',
                    timestamp: new Date(m.timestamp || Date.now()),
                    isSent: m.isSent || false
                }));
                
                for (const act of activities) {
                    await tx.chatActivity.create({ data: act });
                }
                importedCount += messages.length;
            }
        }
    });

    return NextResponse.json({ success: true, importedCount });
  } catch (error: any) {
    return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
  }
}
