import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function getAuthUsername() {
    const cookieStore = await cookies();
    const token = cookieStore.get('crm_session')?.value;
    if (!token) return null;
    try {
        const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production');
        const { payload } = await jwtVerify(token, secret);
        return payload.username as string;
    } catch {
        return null;
    }
}

export async function GET() {
    try {
        const username = await getAuthUsername();
        if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const memories = await prisma.aiMemory.findMany({
            where: { username },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(memories);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const username = await getAuthUsername();
        if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { content } = await req.json();
        if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

        const memory = await prisma.aiMemory.create({
            data: {
                content,
                username
            }
        });
        return NextResponse.json(memory);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const username = await getAuthUsername();
        if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.aiMemory.deleteMany({
            where: { id, username }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
