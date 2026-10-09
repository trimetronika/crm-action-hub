import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
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
    const { leadData } = body;

    const settings = await prisma.settings.findUnique({ where: { username } });
    const templatePath = settings?.templatePath || path.join(process.cwd(), 'templates', 'default.docx');

    const scriptPath = path.join(process.cwd(), 'python_scripts', 'generate_doc.py');
    
    // Generate unique ID and secure temp path
    const fileId = crypto.randomBytes(16).toString('hex');
    const outputPath = path.join(os.tmpdir(), `crm_doc_${fileId}.docx`);
    
    const dataStr = JSON.stringify(leadData);
    
    return new Promise<NextResponse>((resolve) => {
      execFile('python', [scriptPath, '--template', templatePath, '--output', outputPath, '--data', dataStr], (error, stdout, stderr) => {
        if (error) {
          const requestId = Math.random().toString(36).substring(7);
          console.error(`[ReqID: ${requestId}] generate-doc execFile error:`, error);
          resolve(NextResponse.json({ success: false, error: "Gagal membuat dokumen. Hubungi administrator.", requestId }, { status: 500 }));
          return;
        }

        try {
            const jsonStr = stdout.substring(stdout.indexOf('{'));
            const data = JSON.parse(jsonStr);
            if(data.success) {
                // Return only the ID, not the absolute path
                resolve(NextResponse.json({ success: true, url: fileId }));
            } else {
                resolve(NextResponse.json({ success: false, error: "Skrip merespons gagal." }));
            }
        } catch(e: any) {
            const requestId = Math.random().toString(36).substring(7);
            console.error(`[ReqID: ${requestId}] generate-doc parse error:`, e, stdout);
            resolve(NextResponse.json({ success: false, error: "Mendapat output tidak terduga dari generator dokumen.", requestId }, { status: 500 }));
        }
      });
    });

  } catch (error: any) {
    const requestId = Math.random().toString(36).substring(7);
    console.error(`[ReqID: ${requestId}] generate-doc server error:`, error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server internal.", requestId }, { status: 500 });
  }
}
