'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type OCRResult = {
  id: number;
  file_url: string;
  extracted_text: string;
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<OCRResult[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('ocr_results')
        .select('*');

      if (error) {
        console.error('Error ', error);
        return;
      }

      if (data) {
        setResults(data);
      }
    } catch (error) {
      console.error('Error', error);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(`docs/${file.name}`, file);

    if (error) {
      setMessage('Upload failed');
      return;
    }

    const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/docs/${file.name}`;
    setCurrentFileUrl(fileUrl);

    const ocrResponse = await fetch('/api/ocr', {
      method: 'POST',
      body: JSON.stringify({ url: fileUrl }),
      headers: { 'Content-Type': 'application/json' },
    });

    const ocrData = await ocrResponse.json();
    console.log('OCR Response:', ocrData);
    
    if (!ocrResponse.ok) {
      setMessage('OCR processing failed');
      return;
    }

    try {
      // Parsear la cadena JSON dentro de data
      const parsedData = JSON.parse(ocrData.data);
      console.log('Parsed Data:', parsedData);

      if (!parsedData.id) {
        console.error('No job ID in parsed data:', parsedData);
        setMessage('Invalid OCR response');
        return;
      }

      setCurrentJobId(parsedData.id);
      setMessage('File uploaded.');
    } catch (error) {
      console.error('Error parsing OCR response:', error);
      setMessage('Error processing OCR response');
    }
  };

  const handleCheckStatus = async () => {
    if (!currentJobId || !currentFileUrl) {
      setMessage('upload a file');
      return;
    }

    setIsProcessing(true);
    setMessage('Checking status...');

    try {
      const statusResponse = await fetch('/api/ocr/status', {
        method: 'POST',
        body: JSON.stringify({ jobId: currentJobId }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const statusData = await statusResponse.json();
      console.log('Status Response:', statusData);
      
      if (!statusResponse.ok) {
        setMessage('Error checking status');
        return;
      }

      if (statusData.status.status === 'SUCCESS') {
        const resultResponse = await fetch('/api/ocr/result', {
          method: 'POST',
          body: JSON.stringify({ jobId: currentJobId }),
          headers: { 'Content-Type': 'application/json' },
        });
        
        const resultData = await resultResponse.json();
        console.log('Result Response:', resultData);
        
        if (!resultResponse.ok) {
          setMessage('Error getting result');
          return;
        }

        // Parsear el markdown anidado
        const parsedMarkdown = JSON.parse(resultData.markdown);
        console.log('Parsed Markdown:', parsedMarkdown);

        // Guardar en Supabase usando currentFileUrl
        const { error: dbError } = await supabase
          .from('ocr_results')
          .insert([
            { 
              file_url: currentFileUrl,
              extracted_text: parsedMarkdown.markdown
            }
          ]);
        
        if (dbError) {
          setMessage('Error saving result');
          return;
        }

        setMessage('Processing complete!');
        setCurrentJobId(null);
        setCurrentFileUrl(null);
        await fetchResults();
      } else if (statusData.status.status === 'failed') {
        setMessage('Processing failed');
        setCurrentJobId(null);
      } else {
        setMessage('Still processing...');
      }
    } catch (error) {
      console.error('Error in handleCheckStatus:', error);
      setMessage('Error checking status');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Uploader OCR</h1>

      <div className="mb-6">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleUploadClick}
          className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
        >
          Upload File
        </button>
        <button
          onClick={handleCheckStatus}
          disabled={isProcessing}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {isProcessing ? 'Checking...' : 'Check Status'}
        </button>
        <p className="mt-2 text-green-600">{message}</p>
      </div>

      <hr className="mb-6" />

      <h2 className="text-xl font-semibold mb-4">Uploaded Files & OCR Results</h2>
      {results.length === 0 && <p>No files uploaded yet.</p>}
      {results.map((res) => (
        <div key={res.id} className="border p-4 rounded mb-4">
          {res.file_url.endsWith('.pdf') ? (
            <a
              href={res.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Open PDF
            </a>
          ) : (
            <img src={res.file_url} alt="Uploaded" className="max-w-sm mb-2" />
          )}
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{res.extracted_text}</p>
        </div>
      ))}
    </main>
  );
  
}
