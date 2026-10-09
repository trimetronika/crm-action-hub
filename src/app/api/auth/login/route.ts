import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { encryptString } from '@/lib/encryption';

const getJwtSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: SESSION_SECRET is not defined in production environment.');
    }
    return new TextEncoder().encode('fallback-secret-key-change-in-production');
  }
  return new TextEncoder().encode(secret);
};

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan Password wajib diisi' }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), 'python_scripts', 'sync_kanban.py');

    return new Promise<NextResponse>((resolve) => {
      execFile('python', [scriptPath, '--user', username, '--password', password, '--check-login-only'], async (error, stdout, stderr) => {
        if (error) {
          resolve(NextResponse.json({ success: false, error: 'Kredensial salah atau gagal memverifikasi login.' }, { status: 401 }));
          return;
        }

        try {
          const jsonStr = stdout.substring(stdout.indexOf('{'));
          const result = JSON.parse(jsonStr);

          if (result.success) {
            // Create JWT Token payload with ENCRYPTED password
            const encryptedPassword = encryptString(password);
            const token = await new SignJWT({ username, encryptedPassword })
              .setProtectedHeader({ alg: 'HS256' })
              .setExpirationTime('24h')
              .sign(getJwtSecret());

            // Set HTTP-only cookie
            const cookieStore = await cookies();
            cookieStore.set('crm_session', token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 // 1 day
            });

            resolve(NextResponse.json({ success: true, message: 'Login berhasil' }));
          } else {
            resolve(NextResponse.json({ success: false, error: result.error || 'Login gagal' }, { status: 401 }));
          }
        } catch (e: any) {
          console.error("DEBUG LOGIN ERROR:", e.message, "\nSTDOUT:", stdout, "\nSTDERR:", stderr);
          resolve(NextResponse.json({ success: false, error: 'Respon skrip tidak valid' }, { status: 500 }));
        }
      });
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server internal' }, { status: 500 });
  }
}
