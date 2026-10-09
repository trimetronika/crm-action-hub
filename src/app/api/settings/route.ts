import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Helper to verify session in API
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

export async function GET() {
  const username = await checkAuth();
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let settings = await prisma.settings.findUnique({ where: { username } });
    if (!settings) {
      // Ensure user exists
      await prisma.user.upsert({ where: { username }, create: { username }, update: {} });
      settings = await prisma.settings.create({
        data: { username, aiModel: 'gemini-3.6-flash' }
      });
    }
    
    // Mask API key for GET request security
    const maskedKey = settings.geminiKey ? "••••••••" : "";
    return NextResponse.json({ ...settings, geminiKey: maskedKey });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const username = await checkAuth();
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { geminiKey, aiModel, templatePath } = body;
    
    const dataToUpdate: any = { aiModel, templatePath };
    if (geminiKey && geminiKey !== "••••••••") {
      dataToUpdate.geminiKey = geminiKey;
    }

    // Ensure user exists
    await prisma.user.upsert({ where: { username }, create: { username }, update: {} });

    const settings = await prisma.settings.upsert({
      where: { username },
      update: dataToUpdate,
      create: {
        username,
        ...dataToUpdate
      }
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
