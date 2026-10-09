import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

export async function GET(request: Request) {
  const correlationId = randomUUID();
  try {
    // Authenticated health check: ensure client has some token if you want, 
    // but for now, we simply don't leak sensitive stats.
    // Check DB connectivity
    await prisma.$queryRaw`SELECT 1`;

    logger.info('Health check executed', { correlationId, status: 'ok' });
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      correlationId
    });
  } catch (error: any) {
    logger.error('Health check failed', { 
      correlationId, 
      error: error.message 
    });
    
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Service is degraded',
      correlationId
    }, { status: 503 });
  }
}
