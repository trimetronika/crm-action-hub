import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

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
        const { leads, context } = body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: 'Invalid leads array' }, { status: 400 });
        }

        const settings = await prisma.settings.findUnique({ where: { username } });
        let finalApiKey = settings?.geminiKey || process.env.GEMINI_API_KEY;
        let finalModel = settings?.aiModel || "gemini-3.6-flash";

        if (!finalApiKey) {
            return NextResponse.json({ error: 'API Key not found' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(finalApiKey);
        
        let modelToUse = finalModel;
        if (["gemini-1.5-flash", "gemini-2.5-flash", "gemini-pro"].includes(modelToUse)) {
            modelToUse = "gemini-3.6-flash";
        }

        const memories = await prisma.aiMemory.findMany({ where: { username } });
        const memoryString = memories.length > 0 
            ? `\n[MEMORI USER]\nPatuhi:\n${memories.map(m => `- ${m.content}`).join('\n')}\n`
            : "";

        // Format leads for the prompt
        const leadsData = leads.map(l => ({
            id: l.id,
            perusahaan: l['Nama Perusahaan'] || l.namaPerusahaan,
            pic: l['PIC'] || l.pic,
            layanan: l['Layanan'] || l.layanan,
            tahapan: l['Tahapan'] || l.tahapan
        }));

        const sysInstruct = `Anda adalah Asisten AI CRM Absenku.
Tugas Anda meracik pesan massal (Bulk WhatsApp Draft) untuk beberapa prospek sekaligus.
Anda akan menerima daftar prospek berformat JSON dan sebuah instruksi konteks.
Buatkan pesan yang dipersonalisasi untuk setiap prospek (sebut nama perusahaannya, atau layanannya jika relevan) agar tidak terlihat seperti *template* kaku.
${memoryString}
Aturan Penting:
1. JANGAN gunakan placeholder [Nama] atau [Perusahaan]. Langsung isi dengan data prospek.
2. Gunakan bahasa Indonesia profesional-santai.
3. OUTPUT HARUS BERUPA ARRAY JSON VALID berformat:
[
  { "leadId": "id-prospek", "draft": "Isi draf pesan untuk prospek ini" }
]
JANGAN berikan teks apapun di luar JSON array tersebut. Jangan gunakan blockquote markdown \`\`\`json. Langsung keluarkan Array JSON murni.`;

        const model = genAI.getGenerativeModel({ 
            model: modelToUse,
            systemInstruction: sysInstruct
        });

        const prompt = `Instruksi Pesan Massal: ${context}\n\nDaftar Prospek:\n${JSON.stringify(leadsData, null, 2)}`;
        
        const result = await model.generateContent(prompt);
        const textResult = result.response.text();
        
        // Clean JSON formatting if AI accidentally wrapped it
        let cleanedText = textResult.trim();
        if (cleanedText.startsWith('```json')) cleanedText = cleanedText.substring(7);
        if (cleanedText.startsWith('```')) cleanedText = cleanedText.substring(3);
        if (cleanedText.endsWith('```')) cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        cleanedText = cleanedText.trim();

        const drafts = JSON.parse(cleanedText);

        // Save instructions and drafts to database
        const now = new Date();
        const chatActivitiesData: any[] = [];

        for (const item of drafts) {
            if (!item.leadId || !item.draft) continue;

            // 1. User Instruction
            chatActivitiesData.push({
                leadId: item.leadId,
                role: 'user',
                text: `[Bulk WA Massal]: ${context}`,
                timestamp: now,
                isSent: true,
                status: 'SENT'
            });

            // 2. Model Draft
            chatActivitiesData.push({
                leadId: item.leadId,
                role: 'model',
                text: item.draft,
                timestamp: new Date(now.getTime() + 1000), // Ensures order
                isSent: false,
                status: 'DRAFT'
            });
        }

        if (chatActivitiesData.length > 0) {
            await prisma.$transaction(
                chatActivitiesData.map(data => prisma.chatActivity.create({ data }))
            );
            
            // Also update lastSync timestamp of the affected leads
            const leadIds = [...new Set(drafts.map((d: any) => d.leadId))] as string[];
            await prisma.lead.updateMany({
                where: { id: { in: leadIds } },
                data: { lastSync: new Date() }
            });
        }

        return NextResponse.json({ success: true, drafts });

    } catch (error: any) {
        console.error('Bulk generate error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

