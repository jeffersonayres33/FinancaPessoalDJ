
import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, AlertTriangle, Lightbulb, History, CheckCircle2, Clock, X, ChevronRight } from 'lucide-react';
import { Despesa, AIAnalysis, User } from '../types';
import { analyzeFinances } from '../services/geminiService';
import { dataService } from '../services/dataService';

interface AIInsightProps {
  despesas: Despesa[];
  user: User;
}

export const AIInsight: React.FC<AIInsightProps> = ({ despesas, user }) => {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [history, setHistory] = useState<AIAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Carregar última análise do banco de dados ao montar
  useEffect(() => {
    const loadLastAnalysis = async () => {
      try {
        const lastAnalysis = await dataService.fetchLatestAnalysis(user.dataContextId, user.id);
        if (lastAnalysis) {
          setAnalysis(lastAnalysis);
        }
      } catch (e) {
        console.error("Erro ao carregar análise inicial:", e);
      } finally {
        setInitialLoading(false);
      }
    };
    loadLastAnalysis();
  }, [user.dataContextId, user.id]);

  const loadHistory = async () => {
    try {
      const data = await dataService.fetchAnalysisHistory(user.dataContextId, user.id);
      setHistory(data);
      setShowHistory(true);
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
  };

  const canGenerateNewAnalysis = useCallback(() => {
    if (!analysis) return { allowed: true };

    const lastDate = new Date(analysis.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

    // Regra 1: Limite de 24 horas
    if (diffHours < 24) {
      return { 
        allowed: false, 
        reason: `Aguarde mais ${Math.ceil(24 - diffHours)}h para uma nova análise automática.` 
      };
    }

    // Regra 2: Mudança significativa nos dados
    const currentExpenses = despesas.filter(d => d.type === 'expense').reduce((acc, d) => acc + d.amount, 0);
    const currentIncome = despesas.filter(d => d.type === 'income').reduce((acc, d) => acc + d.amount, 0);
    const currentInvestments = despesas.filter(d => d.type === 'investment').reduce((acc, d) => acc + d.amount, 0);
    const currentCount = despesas.length;

    const expenseDiff = Math.abs(currentExpenses - analysis.totalExpenses) / (analysis.totalExpenses || 1);
    const incomeDiff = Math.abs(currentIncome - analysis.totalIncome) / (analysis.totalIncome || 1);
    const investmentDiff = Math.abs(currentInvestments - (analysis.totalInvestments || 0)) / (analysis.totalInvestments || 1);
    const countDiff = Math.abs(currentCount - analysis.transactionCount);

    // Consideramos mudança significativa se:
    // - Gastos, Receitas ou Investimentos mudaram mais de 10%
    // - Mais de 5 transações novas foram adicionadas
    const isSignificant = expenseDiff > 0.1 || incomeDiff > 0.1 || investmentDiff > 0.1 || countDiff >= 5;

    if (!isSignificant) {
      return { 
        allowed: false, 
        reason: "Não houve mudanças significativas nos seus dados financeiros para justificar uma nova análise." 
      };
    }

    return { allowed: true };
  }, [analysis, despesas]);

  const handleAnalyze = async () => {
    const check = canGenerateNewAnalysis();
    
    if (!check.allowed) {
      setMessage({ text: check.reason || "Não permitido no momento.", type: 'warning' });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    setLoading(true);
    setError(false);
    setMessage(null);

    try {
      // 1. Gerar análise via Gemini
      const result = await analyzeFinances(despesas);
      
      // 2. Calcular métricas atuais para o cache
      const currentExpenses = despesas.filter(d => d.type === 'expense').reduce((acc, d) => acc + d.amount, 0);
      const currentIncome = despesas.filter(d => d.type === 'income').reduce((acc, d) => acc + d.amount, 0);
      const currentInvestments = despesas.filter(d => d.type === 'investment').reduce((acc, d) => acc + d.amount, 0);
      
      // 3. Salvar no banco de dados
      const savedAnalysis = await dataService.saveAnalysis({
        dataContextId: user.dataContextId,
        userId: user.id,
        summary: result.summary,
        tips: result.tips,
        anomalies: result.anomalies,
        totalExpenses: currentExpenses,
        totalIncome: currentIncome,
        totalInvestments: currentInvestments,
        transactionCount: despesas.length
      });

      if (savedAnalysis) {
        setAnalysis(savedAnalysis);
        setMessage({ text: "Nova análise gerada e salva com sucesso!", type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center justify-center border border-gray-100">
        <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
        <p className="text-gray-500 text-sm">Carregando consultor financeiro...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg shadow-md border border-indigo-100 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
            <Sparkles className="text-indigo-600" size={20} />
            Consultor Financeiro AI
          </h3>
          {analysis && (
            <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
              <History size={12} />
              Última análise: {new Date(analysis.createdAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row items-end md:items-center gap-2">
          <button
            onClick={loadHistory}
            className="w-full md:w-auto text-indigo-600 hover:text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-indigo-200 bg-white"
          >
            <History size={18} />
            Histórico
          </button>
          <button
            onClick={handleAnalyze}
            disabled={loading || despesas.length === 0}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {analysis ? 'Atualizar Análise' : 'Gerar Primeira Análise'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 
          message.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
          {message.text}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle size={16} />
          Erro ao conectar com o serviço de AI. Tente novamente em instantes.
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="text-center py-8 bg-white/50 rounded-xl border border-dashed border-indigo-200">
          <Sparkles className="mx-auto text-indigo-300 mb-3" size={40} />
          <p className="text-indigo-700 font-medium">Sua inteligência financeira está pronta!</p>
          <p className="text-sm text-indigo-500 mt-1">
            Clique no botão acima para analisar seus hábitos de consumo e receber dicas personalizadas.
          </p>
        </div>
      )}
      
      {analysis && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm">
            <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Resumo da Saúde Financeira</h4>
            <p className="text-gray-600 leading-relaxed">{analysis.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-green-100 shadow-sm">
              <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Lightbulb size={18} className="text-green-600" /> Dicas Práticas
              </h4>
              <ul className="space-y-3">
                {analysis.tips.map((tip, idx) => (
                  <li key={idx} className="flex gap-2 text-gray-600 text-sm">
                    <span className="text-green-500 font-bold">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {analysis.anomalies.length > 0 && (
              <div className="bg-white p-5 rounded-xl border border-yellow-100 shadow-sm">
                <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <AlertTriangle size={18} className="text-yellow-600" /> Alertas e Atenção
                </h4>
                <ul className="space-y-3">
                  {analysis.anomalies.map((anomaly, idx) => (
                    <li key={idx} className="flex gap-2 text-gray-600 text-sm">
                      <span className="text-yellow-500 font-bold">!</span>
                      {anomaly}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <History className="text-indigo-600" />
                Histórico de Análises
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {history.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhuma análise anterior encontrada.</p>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-4 border rounded-xl hover:border-indigo-300 transition-colors cursor-pointer group"
                    onClick={() => {
                      setAnalysis(item);
                      setShowHistory(false);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-tighter">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{item.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
