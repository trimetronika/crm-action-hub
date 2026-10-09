import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_USER = 'bowo'; // Based on project specs

export async function GET() {
    try {
        const memories = await prisma.aiMemory.findMany({
            where: { username: DEFAULT_USER },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(memories);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { content } = await req.json();
        if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

        const memory = await prisma.aiMemory.create({
            data: {
                content,
                username: DEFAULT_USER
            }
        });
        return NextResponse.json(memory);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.aiMemory.delete({
            where: { id, username: DEFAULT_USER }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
