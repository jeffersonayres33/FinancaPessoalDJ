
import React, { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, Lightbulb } from 'lucide-react';
import { Despesa, AIAnalysisResult } from '../types';
import { analyzeFinances } from '../services/geminiService';

interface AIInsightProps {
  despesas: Despesa[];
}

export const AIInsight: React.FC<AIInsightProps> = ({ despesas }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await analyzeFinances(despesas);
      setAnalysis(result);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg shadow-md border border-indigo-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
          <Sparkles className="text-indigo-600" size={20} />
          Consultor Financeiro AI
        </h3>
        <button
          onClick={handleAnalyze}
          disabled={loading || despesas.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {analysis ? 'Analisar Novamente' : 'Gerar Análise'}
        </button>
      </div>

      {!analysis && !loading && !error && (
        <p className="text-sm text-indigo-700">
          Clique no botão acima para receber dicas personalizadas e análises sobre seus hábitos de consumo usando a inteligência do Gemini.
        </p>
      )}
      
      {error && (
        <p className="text-sm text-red-600">Erro ao conectar com o serviço de AI. Tente novamente.</p>
      )}

      {analysis && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded border border-indigo-100 shadow-sm">
            <h4 className="font-semibold text-gray-800 mb-2">Resumo</h4>
            <p className="text-gray-600 text-sm">{analysis.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded border border-green-100 shadow-sm">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <Lightbulb size={18} /> Dicas de Economia
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {analysis.tips.map((tip, idx) => (
                  <li key={idx} className="text-gray-600 text-sm">{tip}</li>
                ))}
              </ul>
            </div>

            {analysis.anomalies.length > 0 && (
              <div className="bg-white p-4 rounded border border-yellow-100 shadow-sm">
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertTriangle size={18} /> Atenção
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.anomalies.map((anomaly, idx) => (
                    <li key={idx} className="text-gray-600 text-sm">{anomaly}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
