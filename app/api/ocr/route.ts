import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    console.log('📁 URL del archivo recibido:', url);

    // Descargar el archivo desde Supabase
    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      throw new Error(`No se pudo descargar el archivo: ${fileRes.status}`);
    }

    const blob = await fileRes.blob();

    // Subir a LlamaParse
    const formData = new FormData();
    formData.append('file', blob, 'document.pdf');

    const llamaRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LLAMAPARSE_API_KEY!}`,
      },
      body: formData,
    });

    const responseText = await llamaRes.text();

    if (!llamaRes.ok) {
      console.error('❌ Error desde LlamaParse:', responseText);
      return NextResponse.json(
        { error: 'Error uploading to LlamaParse', details: responseText },
        { status: 500 }
      );
    }

    console.log('✅ Respuesta de LlamaParse:', responseText);

    return NextResponse.json({ message: 'Uploaded to LlamaParse successfully!', data: responseText });
  } catch (err: any) {
    console.error('💥 Error inesperado:', err.message || err);
    return NextResponse.json({ error: 'Server error', details: err.message || err }, { status: 500 });
  }
}
