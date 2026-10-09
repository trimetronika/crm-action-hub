import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Helper to verify session
async function getAuthUser() {
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
  try {
    const username = await getAuthUser();
    if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, leadData, context, history, message } = body;

    const settings = await prisma.settings.findUnique({ where: { username } });
    const finalApiKey = settings?.geminiKey || process.env.GEMINI_API_KEY;
    const finalModel = settings?.aiModel || 'gemini-3.6-flash';

    if (!finalApiKey) {
       // Return a dummy fallback if no API key is provided
       const ctxMsg = context ? `\n\n(Catatan: Konfigurasi API AI belum diatur di server. Ini adalah pesan otomatis. Konteks Anda: ${context})` : "\n\n(Catatan: Konfigurasi API AI belum diatur di server.)";
       if (action === 'wa') {
           return NextResponse.json({ text: `Halo Bapak/Ibu ${leadData?.['PIC'] || ''}, perkenalkan kami dari Absenku. Kami ingin menanyakan kabar mengenai rencana penggunaan layanan ${leadData?.['Layanan'] || ''} di perusahaan ${leadData?.['Nama Perusahaan'] || ''}?${ctxMsg}` });
       }
       return NextResponse.json({ text: `Subject: Follow up Layanan ${leadData?.['Layanan'] || ''}\n\nYth. ${leadData?.['PIC'] || ''},\n\nKami dari Absenku ingin memfollow-up...${ctxMsg}` });
    }

    const genAI = new GoogleGenerativeAI(finalApiKey);
    
    // Override strictly old models that might be stuck in DB
    let modelToUse = finalModel;
    if (["gemini-1.5-flash", "gemini-2.5-flash", "gemini-pro"].includes(modelToUse)) {
        modelToUse = "gemini-3.6-flash";
    }

    const memories = await prisma.aiMemory.findMany({ where: { username } });
    const memoryString = memories.length > 0 
        ? `\n[MEMORI USER]\nPatuhi:\n${memories.map(m => `- ${m.content}`).join('\n')}\n`
        : "";

    let finalMessage = message || context || "Bantu saya buatkan draf pesan.";
    let sysInstruct = "";

    if (leadData?.id === 'META_AI') {
        const lastHistoryText = (history && history.length > 0) ? history[history.length - 1].parts[0].text : "";
        const combinedText = finalMessage + " " + lastHistoryText;
        const needsAnalytics = /analisis|lead|prospek|data|tahapan|deal|statistik|total|berapa|ringkasan|bulan|perusahaan|klien/i.test(combinedText);
        let leadsContext = "";

        if (needsAnalytics) {
            const allLeads = await prisma.lead.findMany({ 
                where: { username, deletedAt: null },
                select: { namaPerusahaan: true, pic: true, layanan: true, tahapan: true, bulan: true, nilaiDeal: true }
            });
            
            // Format without quotes to save tokens. Sanitize commas.
            const csv = ["Perusahaan,PIC,Layanan,Tahapan,Bulan,NilaiDeal"];
            allLeads.forEach(l => {
                const pt = (l.namaPerusahaan || '-').replace(/,/g, '');
                const pic = (l.pic || '-').replace(/,/g, '');
                const lay = (l.layanan || '-').replace(/,/g, '');
                const tah = (l.tahapan || '-').replace(/,/g, '');
                const bln = (l.bulan || '-').replace(/,/g, '');
                csv.push(`${pt},${pic},${lay},${tah},${bln},${l.nilaiDeal || 0}`);
            });
            
            leadsContext = `\n[DATABASE PROSPEK CRM (${allLeads.length} leads - Format CSV)]\n${csv.join('\n')}\nJawab pertanyaan analisis berdasarkan data ini.`;
        }

        sysInstruct = `Anda adalah Absenku AI, Asisten CRM.
Tugas:
1. Jawab pertanyaan & bantu tugas CRM.
2. Analisis data prospek (suplai data ada di bawah jika diminta).
3. Ingat preferensi user.
${leadsContext}
${memoryString}
Jika ada instruksi permanen, konfirmasi Anda mengingatnya. Jawab dengan ramah, ringkas, & profesional.`;
    } else {
        sysInstruct = `Anda adalah Asisten AI CRM Absenku. 
Tugas: Buat draf pesan (WA/Email) untuk prospek.
Data Prospek:
- PT: ${leadData?.['Nama Perusahaan'] || '-'}
- PIC: ${leadData?.['PIC'] || '-'}
- Layanan: ${leadData?.['Layanan'] || '-'}
- Tahapan: ${leadData?.['Tahapan'] || '-'}
- Deal: ${leadData?.['Nilai Deal'] || '-'}
${memoryString}
Aturan: Bahasa Indonesia, santai-profesional. HANYA berikan isi draf final tanpa basa-basi pembuka/penutup/catatan/placeholder.`;
    }

    const model = genAI.getGenerativeModel({ 
        model: modelToUse,
        systemInstruction: sysInstruct
    });

    if (action === 'chat') {
        
        // Optimize Extraction: Only run if it looks like an instruction to save API Quota
        const mightBeRule = /ingat|panggil|mulai|jangan|selalu|aturan|biasakan|wajib|harus/i.test(finalMessage);
        
        if (leadData?.id === 'META_AI' && mightBeRule) {
            try {
                // BUGFIX: Respect user's selected model to prevent quota leak on 3.6-flash
                const extractionModel = genAI.getGenerativeModel({ model: modelToUse });
                const extResult = await extractionModel.generateContent(`Ekstrak instruksi permanen dari pesan berikut ke dalam 1 kalimat ringkas. Jika tidak ada aturan permanen, balas "NONE". Pesan: "${finalMessage}"`);
                const rule = extResult.response.text().trim();
                
                if (rule && rule !== 'NONE' && !rule.toLowerCase().includes('none') && rule.length > 3) {
                    await prisma.aiMemory.create({
                        data: { username, content: rule }
                    });
                }
            } catch (e) {
                console.error("Memory extraction error", e);
            }
        }

        const chat = model.startChat({
            history: history || [],
        });
        const result = await chat.sendMessage(finalMessage);
        const text = result.response.text();
        return NextResponse.json({ text });
    }

    // Fallback for older modal logic if still used
    let prompt = "";
    const ctxString = context ? `\nInstruksi Khusus: ${context}\n` : "";

    if (action === 'wa') {
        prompt = `Buatlah draf pesan WhatsApp awal untuk prospek ini.${ctxString}`;
    } else if (action === 'email') {
        prompt = `Buatlah draf email (Subjek dan Isi) untuk prospek ini.${ctxString}`;
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    const requestId = Math.random().toString(36).substring(7);
    console.error(`[ReqID: ${requestId}] Gemini API Error:`, error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan saat memproses permintaan AI.", requestId }, { status: 500 });
  }
}
