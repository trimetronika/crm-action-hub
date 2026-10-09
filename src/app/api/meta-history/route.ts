import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import * as jwt from 'jose';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production');

async function getAuthUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('crm_session')?.value;
        if (!token) return null;
        const { payload } = await jwt.jwtVerify(token, JWT_SECRET);
        return payload.username as string;
    } catch {
        return null;
    }
}

export async function GET() {
    const username = await getAuthUser();
    if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const settings = await prisma.settings.findUnique({ where: { username } });
        if (settings?.metaAiHistory) {
            return NextResponse.json(JSON.parse(settings.metaAiHistory));
        }
        return NextResponse.json(null);
    } catch (error) {
        console.error("GET meta-history error", error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const username = await getAuthUser();
    if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        await prisma.settings.upsert({
            where: { username },
            update: { metaAiHistory: JSON.stringify(body.history) },
            create: { username, metaAiHistory: JSON.stringify(body.history) }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PUT meta-history error", error);
        return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
    }
}
