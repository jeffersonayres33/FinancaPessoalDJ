
import { GoogleGenAI, Type } from "@google/genai";
import { Despesa, AIAnalysisResult, ReceiptData } from '../types';
import { getCurrentLocalDateString } from '../utils';

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
      throw new Error("API key must be set when using the Gemini API.");
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
};

export const analyzeFinances = async (despesas: Despesa[]): Promise<AIAnalysisResult> => {
  if (despesas.length === 0) {
    return {
      summary: "Não há transações suficientes para análise.",
      tips: ["Adicione receitas e despesas para receber dicas."],
      anomalies: []
    };
  }

  // Filter last 50 transactions to keep payload reasonable
  const recentTransactions = despesas.slice(0, 50).map(t => ({
    title: t.title,
    amount: t.amount,
    type: t.type,
    category: t.category,
    date: t.date
  }));

  const prompt = `
    Atue como um consultor financeiro pessoal experiente.
    Analise os seguintes dados financeiros (JSON) e forneça um resumo breve, 3 dicas práticas de economia e identifique se há algo fora do comum (anomalias).
    Responda EXCLUSIVAMENTE em formato JSON seguindo o schema.
    Dados: ${JSON.stringify(recentTransactions)}
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    
    let mimeType = 'image/jpeg';
    let base64Data = base64Image;

    if (base64Image.startsWith('data:')) {
      const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      } else {
        base64Data = base64Image.split(',')[1] || base64Image;
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `Analise esta imagem de recibo/nota fiscal. Extraia os dados e retorne ESTRITAMENTE um JSON válido.
            
            Estrutura do JSON desejado:
            {
              "title": "string (Nome do estabelecimento)",
              "amount": number (Valor total numérico),
              "date": "string (YYYY-MM-DD, se não encontrar use ${getCurrentLocalDateString()})",
              "observation": "string (Resumo dos itens)"
            }`
          }
        ]
      },
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
