import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('crm_session');
  return NextResponse.json({ success: true, message: 'Logout berhasil' });
}
