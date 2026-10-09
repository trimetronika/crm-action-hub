import { NextResponse } from 'next/server';
import { logger } from './logger';
import { randomUUID } from 'crypto';

export class ApiError extends Error {
  constructor(public code: string, public message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ApiError';
  }
}

export function withErrorHandler(
  handler: (req: Request, correlationId: string) => Promise<NextResponse>
) {
  return async (req: Request) => {
    const correlationId = req.headers.get('x-request-id') || randomUUID();
    
    try {
      return await handler(req, correlationId);
    } catch (error: any) {
      if (error instanceof ApiError) {
        logger.warn('API Error', { 
          correlationId, 
          code: error.code, 
          message: error.message 
        });
        
        return NextResponse.json({
          error: error.code,
          message: error.message,
          correlationId
        }, { status: error.statusCode });
      }

      // Unhandled/Internal Errors
      logger.error('Internal Server Error', { 
        correlationId, 
        error: error.message, 
        stack: error.stack 
      });

      return NextResponse.json({
        error: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem internal',
        correlationId
      }, { status: 500 });
    }
  };
}

