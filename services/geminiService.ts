import { Despesa, AIAnalysisResult, ReceiptData } from '../types';
import { getCurrentLocalDateString } from '../utils';
import Tesseract, { createWorker, PSM } from 'tesseract.js';
import { supabase } from './supabaseClient';

// Função para melhorar a imagem antes do OCR (Grayscale + Contraste)
const enhanceImageForOCR = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Limita o tamanho máximo para evitar travamentos, mas mantém resolução alta para OCR
      const MAX_DIMENSION = 2048;
      let width = img.width;
      let height = img.height;
      
      if (width > height && width > MAX_DIMENSION) {
        height *= MAX_DIMENSION / width;
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width *= MAX_DIMENSION / height;
        height = MAX_DIMENSION;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);
      
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Aumentar contraste e converter para tons de cinza
      const contrast = 60; // Nível de contraste
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Luminância (Grayscale)
        const v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        
        // Contraste
        let c = factor * (v - 128) + 128;
        c = Math.max(0, Math.min(255, c));
        
        data[i] = c;
        data[i + 1] = c;
        data[i + 2] = c;
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
};

export const analyzeFinances = async (despesas: Despesa[]): Promise<AIAnalysisResult> => {
  if (despesas.length === 0) {
    return {
      summary: "Não há transações suficientes para análise.",
      tips: ["Adicione receitas e despesas para receber dicas."],
      anomalies: []
    };
  }

  // OTIMIZAÇÃO: Agregação de dados por categoria para reduzir tokens
  const aggregation: Record<string, { total: number, count: number, type: string }> = {};
  
  despesas.forEach(t => {
    const key = `${t.type}_${t.category}`;
    if (!aggregation[key]) {
      aggregation[key] = { total: 0, count: 0, type: t.type };
    }
    aggregation[key].total += t.amount;
    aggregation[key].count += 1;
  });

  const aggregatedData = Object.entries(aggregation).map(([key, data]) => ({
    category: (key || '').split('_')[1],
    type: data.type,
    totalAmount: data.total.toFixed(2),
    transactionCount: data.count
  }));

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Não autenticado");

    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ aggregatedData })
    });

    if (!response.ok) {
      throw new Error("Erro na resposta do servidor");
    }

    const data = await response.json();
    return data as AIAnalysisResult;

  } catch (error) {
    console.error("Erro ao analisar finanças:", error);
    throw error;
  }
};

export const extractReceiptData = async (base64Image: string): Promise<ReceiptData | null> => {
  try {
    // 1. Extração de Texto Local com Tesseract.js (OCR)
    console.log("Melhorando imagem para OCR...");
    const enhancedImage = await enhanceImageForOCR(base64Image);

    console.log("Iniciando OCR local com Tesseract.js...");
    const worker = await createWorker('por');
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // PSM 6: Assume a single uniform block of text. Good for receipts.
    });
    const { data: { text: extractedText } } = await worker.recognize(enhancedImage);
    await worker.terminate();
    
    console.log("Texto extraído com sucesso:", extractedText);

    if (!extractedText || extractedText.trim() === '') {
      throw new Error("Não foi possível ler nenhum texto na imagem.");
    }

    // 2. Análise Semântica via Backend
    console.log("Enviando texto extraído para o Backend...");
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Não autenticado");

    const response = await fetch('/api/gemini/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ 
        extractedText,
        fallbackDate: getCurrentLocalDateString()
      })
    });

    if (!response.ok) {
      throw new Error("Erro na analise do recibo pelo servidor");
    }

    const data = await response.json();
    return data as ReceiptData;

  } catch (error) {
    console.error("Erro ao extrair dados do recibo:", error);
    throw error;
  }
};
