// app/api/ocr/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();

    const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.LLAMAPARSE_API_KEY!}`,
        'Accept': 'application/json',
      }
    });

    const statusData = await statusRes.json();

    if (!statusRes.ok) {
      console.error('❌ Error al verificar el estado del trabajo:', statusData);
      return NextResponse.json({ error: 'Error checking job status', details: statusData }, { status: 500 });
    }

    console.log('✅ Estado del trabajo:', statusData);
    return NextResponse.json({ status: statusData });
  } catch (err: any) {
    console.error('💥 Error inesperado:', err.message || err);
    return NextResponse.json({ error: 'Server error', details: err.message || err }, { status: 500 });
  }
}
