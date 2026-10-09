import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        return new NextResponse("Invalid ID", { status: 400 });
    }

    const filePath = path.join(os.tmpdir(), `crm_doc_${id}.docx`);

    try {
        if (!fs.existsSync(filePath)) {
            return new NextResponse("File not found or expired", { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        
        // Optionally delete after downloading to ensure privacy and cleanup
        // Comment out if you want multiple downloads. For security, one-time is good.
        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch(e) {}
        }, 1000 * 60 * 5); // Delete after 5 mins to be safe if multiple clicks happen

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Disposition': `attachment; filename="SPH_${id}.docx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            }
        });
    } catch (e) {
        return new NextResponse("Error reading file", { status: 500 });
    }
}
