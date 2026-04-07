
import { GoogleGenAI, Type } from "@google/genai";
import { Despesa, AIAnalysisResult, ReceiptData } from '../types';
import { getCurrentLocalDateString } from '../utils';
import Tesseract, { createWorker, PSM } from 'tesseract.js';

let aiInstance: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!aiInstance) {
    let key = '';
    
    // Tenta pegar a chave injetada pelo AI Studio ou pelo build do Vite
    try {
      key = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    } catch (e) {
      // Ignora erro se process não estiver definido no navegador
    }
    
    // Tenta pegar a chave das variáveis de ambiente do Vite (se existirem)
    if (!key) {
      // @ts-ignore
      key = import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.VITE_API_KEY || '';
    }

    if (!key) {
      console.error("Erro Crítico: Chave da API do Gemini não encontrada!");
      console.error("Verifique se a variável GEMINI_API_KEY ou VITE_GEMINI_API_KEY está configurada corretamente no seu ambiente de deploy (ex: GitHub Actions).");
      throw new Error("API key must be set when using the Gemini API.");
    }
    
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
};

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

  const prompt = `
    Atue como um consultor financeiro pessoal experiente.
    Analise os seguintes dados financeiros AGREGADOS (JSON) que incluem Receitas, Despesas e Investimentos.
    Forneça um resumo breve, 3 dicas práticas de economia/investimento e identifique se há algo fora do comum (anomalias).
    Responda EXCLUSIVAMENTE em formato JSON seguindo o schema.
    
    Dados Agregados: ${JSON.stringify(aggregatedData)}
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview', // Modelo mais econômico
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Um resumo geral da saúde financeira em português." },
            tips: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de 3 dicas práticas."
            },
            anomalies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de possíveis gastos anômalos ou alertas."
            }
          },
          required: ["summary", "tips", "anomalies"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta do Gemini");
    
    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("Erro ao analisar finanças:", error);
    return {
      summary: "Não foi possível gerar a análise no momento.",
      tips: ["Tente novamente mais tarde."],
      anomalies: []
    };
  }
};

export const extractReceiptData = async (base64Image: string): Promise<ReceiptData | null> => {
  try {
    const ai = getAI();
    
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

    // 2. Análise Semântica com Gemini (Apenas Texto)
    console.log("Enviando texto extraído para o Gemini...");
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview', // Modelo mais econômico
      contents: `Analise o seguinte texto extraído de um recibo/nota fiscal via OCR. 
      Extraia os dados e retorne ESTRITAMENTE um JSON válido.
      
      Texto extraído:
      """
      ${extractedText}
      """
      
      Estrutura do JSON desejado:
      {
        "title": "string (Nome do estabelecimento)",
        "amount": number (Valor total numérico),
        "date": "string (YYYY-MM-DD, se não encontrar use ${getCurrentLocalDateString()})",
        "observation": "string (Resumo dos itens)"
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Nome do estabelecimento" },
            amount: { type: Type.NUMBER, description: "Valor total numérico" },
            date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
            observation: { type: Type.STRING, description: "Resumo dos itens" }
          },
          required: ["title", "amount"]
        }
      }
    });

    if (response.text) {
      let jsonStr = response.text.trim();
      
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(jsonStr) as ReceiptData;
    }
    return null;
  } catch (error) {
    console.error("Erro ao extrair dados do recibo:", error);
    throw error;
  }
};
