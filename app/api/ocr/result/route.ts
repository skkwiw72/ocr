// app/api/ocr/result/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();

    const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.LLAMAPARSE_API_KEY!}`,
        'Accept': 'application/json',
      },
    });

    const markdown = await resultRes.text(); // La API regresa texto plano

    if (!resultRes.ok) {
      console.error('❌ Error al obtener el resultado:', markdown);
      return NextResponse.json({ error: 'Error getting result', details: markdown }, { status: 500 });
    }

    console.log('📄 Resultado recibido de LlamaParse');
    return NextResponse.json({ markdown });
  } catch (err: any) {
    console.error('💥 Error inesperado:', err.message || err);
    return NextResponse.json({ error: 'Server error', details: err.message || err }, { status: 500 });
  }
}
