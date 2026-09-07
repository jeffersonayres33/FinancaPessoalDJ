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

// Helper to retrieve valid auth headers with automatic token refresh and userId fallback
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  let token: string | null = null;
  let userId: string | null = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Se estiver prestes a expirar nos próximos 60s, faz o refresh preventivo
      if (session.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          token = refreshData.session?.access_token || session.access_token;
          userId = refreshData.session?.user?.id || session.user?.id || null;
        } catch {
          token = session.access_token;
          userId = session.user?.id || null;
        }
      } else {
        token = session.access_token;
        userId = session.user?.id || null;
      }
    }
  } catch (err) {
    console.warn("Falha ao obter sessão do Supabase:", err);
  }

  // Se não obteve userId pela sessão, tenta recuperar do usuário autenticado no localStorage
  if (!userId) {
    try {
      const stored = localStorage.getItem('finances_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        userId = parsed.id || null;
      }
      if (!userId) {
        userId = localStorage.getItem('budget_planner_session_uid') || null;
      }
    } catch {
      // Ignora erro de JSON
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (userId) {
    headers['x-user-id'] = userId;
  }

  return headers;
};

// Helper to retrieve client-side Gemini API key (e.g. injected during GitHub Actions build for GitHub Pages)
const getClientApiKey = (): string => {
  return (
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    ''
  );
};

// Fallback direct call to Gemini REST API for static deployments (e.g. GitHub Pages without Node.js server)
const callDirectGeminiAnalyze = async (aggregatedData: any[], apiKey: string): Promise<AIAnalysisResult> => {
  const prompt = `
    Atue como um consultor financeiro pessoal experiente.
    Analise os seguintes dados financeiros AGREGADOS (JSON) que incluem Receitas, Despesas e Investimentos.
    Forneça um resumo breve, 3 dicas práticas de economia/investimento e identifique se há algo fora do comum (anomalias).
    Responda EXCLUSIVAMENTE em formato JSON seguindo este formato exato:
    {
      "summary": "Um resumo geral da saúde financeira em português.",
      "tips": ["Dica 1", "Dica 2", "Dica 3"],
      "anomalies": ["Alerta 1", "Alerta 2"]
    }
    
    Dados Agregados: ${JSON.stringify(aggregatedData)}
  `;

  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Resposta vazia da IA.");

      let clean = text.trim();
      if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');

      return JSON.parse(clean) as AIAnalysisResult;
    } catch (err: any) {
      console.warn(`[Direct Gemini Analyze] Model ${model} failed, trying next:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("Falha ao comunicar com os modelos Gemini.");
};

const callDirectGeminiExtract = async (extractedText: string, fallbackDate: string, apiKey: string): Promise<ReceiptData> => {
  const prompt = `
    Analise o seguinte texto extraído de um recibo/nota fiscal via OCR. 
    Extraia os dados e retorne ESTRITAMENTE um JSON válido com o formato:
    {
      "title": "Nome do estabelecimento",
      "amount": 0.00,
      "date": "YYYY-MM-DD",
      "observation": "Resumo dos itens ou observação"
    }

    Se não encontrar a data, use "${fallbackDate}".
    O campo "amount" deve ser um número decimal (ex: 45.90).
    
    Texto extraído:
    """
    ${extractedText}
    """
  `;

  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Resposta vazia da IA.");

      let clean = text.trim();
      if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');

      return JSON.parse(clean) as ReceiptData;
    } catch (err: any) {
      console.warn(`[Direct Gemini Extract] Model ${model} failed, trying next:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("Falha ao extrair dados do recibo.");
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
    const headers = await getAuthHeaders();
    let response: Response | null = null;
    let isStaticHosting = false;

    try {
      response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ aggregatedData })
      });
      if (response.status === 404 || response.status === 405) {
        isStaticHosting = true;
      }
    } catch {
      isStaticHosting = true;
    }

    if (isStaticHosting || !response || !response.ok) {
      if (isStaticHosting || response?.status === 404 || response?.status === 405) {
        const clientApiKey = getClientApiKey();
        if (clientApiKey) {
          console.log("[analyzeFinances] Executando fallback de IA para ambiente estático...");
          return await callDirectGeminiAnalyze(aggregatedData, clientApiKey);
        }
        throw new Error(
          "Ambiente estático (ex: GitHub Pages) detectado sem backend Node.js ativo. " +
          "Para utilizar a IA fora do ambiente de teste, configure o segredo GEMINI_API_KEY no repositório do GitHub (Settings -> Secrets and variables -> Actions)."
        );
      }

      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Erro na resposta do servidor (${response.status}).`);
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

    // 2. Análise Semântica via Backend ou Fallback
    console.log("Processando análise do comprovante...");
    
    const headers = await getAuthHeaders();
    let response: Response | null = null;
    let isStaticHosting = false;

    try {
      response = await fetch('/api/gemini/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          extractedText,
          fallbackDate: getCurrentLocalDateString()
        })
      });
      if (response.status === 404 || response.status === 405) {
        isStaticHosting = true;
      }
    } catch {
      isStaticHosting = true;
    }

    if (isStaticHosting || !response || !response.ok) {
      if (isStaticHosting || response?.status === 404 || response?.status === 405) {
        const clientApiKey = getClientApiKey();
        if (clientApiKey) {
          console.log("[extractReceiptData] Executando fallback de IA para ambiente estático...");
          return await callDirectGeminiExtract(extractedText, getCurrentLocalDateString(), clientApiKey);
        }
        throw new Error(
          "Ambiente estático (ex: GitHub Pages) detectado sem backend Node.js ativo. " +
          "Para utilizar a IA fora do ambiente de teste, configure o segredo GEMINI_API_KEY no repositório do GitHub."
        );
      }

      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Erro na análise do recibo pelo servidor (${response.status}).`);
    }

    const data = await response.json();
    return data as ReceiptData;

  } catch (error) {
    console.error("Erro ao extrair dados do recibo:", error);
    throw error;
  }
};
