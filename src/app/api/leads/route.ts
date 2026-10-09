import { NextResponse } from 'next/server';
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

export async function GET() {
  const username = await checkAuth();
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const leads = await prisma.lead.findMany({
      where: { username, deletedAt: null },
      orderBy: { lastSync: 'desc' },
      include: { chatActivities: { orderBy: { timestamp: 'asc' } } }
    });

    // Map chatActivities back to chatHistory string for frontend compatibility
    const mappedLeads = leads.map((lead: any) => {
      const chatHistoryObj = lead.chatActivities.map((c: any) => ({
        id: c.id,
        role: c.role,
        text: c.text,
        timestamp: new Date(c.timestamp).getTime(),
        isSent: c.isSent,
        status: c.status
      }));
      return {
        ...lead,
        chatHistory: chatHistoryObj.length > 0 ? JSON.stringify(chatHistoryObj) : null
      };
    });

    return NextResponse.json({ success: true, data: mappedLeads });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const username = await checkAuth();
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, email, catatan, chatHistory, nextFollowUpDate } = body;
    
    // First, verify the lead belongs to this user
    const existingLead = await prisma.lead.findFirst({ where: { id, username } });
    if (!existingLead) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    const updateData: any = { lastSync: new Date() };
    if (email !== undefined) updateData.email = email;
    if (catatan !== undefined) updateData.catatan = catatan;
    if (nextFollowUpDate !== undefined) updateData.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;

    let updatedLead;
    
    // Use transaction to ensure chatActivities and lead update succeed together
    updatedLead = await prisma.$transaction(async (tx) => {
      if (chatHistory !== undefined) {
        // Clear existing chats for this lead to replace with the new state
        await tx.chatActivity.deleteMany({ where: { leadId: id } });
        
        let msgs = [];
        try { msgs = JSON.parse(chatHistory); } catch(e) {}
        
        if (msgs.length > 0) {
          const activities = msgs.map((m: any) => ({
            leadId: id,
            role: m.role || 'user',
            text: m.text || '',
            timestamp: new Date(m.timestamp || Date.now()),
            isSent: m.isSent || false,
            status: m.status || (m.isSent ? 'SENT' : 'DRAFT')
          }));
          for (const act of activities) {
            await tx.chatActivity.create({ data: act });
          }
        }
      }

      return await tx.lead.update({
        where: { id },
        data: updateData
      });
    });
    
    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
