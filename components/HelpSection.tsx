import React from 'react';
import { LayoutDashboard, Receipt, TrendingUp, LineChart, ListChecks, Tags, Users, FileSpreadsheet, Printer, ShieldAlert } from 'lucide-react';

export const HelpSection: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Ajuda e Funcionalidades</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Bem-vindo ao sistema de Finanças Pessoais! Aqui você encontra um guia completo sobre como utilizar cada seção do aplicativo para gerenciar seu dinheiro de forma eficiente.
        </p>

        <div className="space-y-8">
          {/* Dashboard */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <LayoutDashboard size={20} className="text-purple-600" /> Dashboard
            </h3>
            <p className="text-gray-600 mb-2">
              O Dashboard é o seu painel principal. Ele oferece uma visão geral da sua saúde financeira.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Resumo:</strong> Veja o total de receitas, despesas, contas a pagar e saldo do mês ou de todos os períodos.</li>
              <li><strong>Gráficos:</strong> Acompanhe a evolução do seu saldo ao longo do tempo e a distribuição das suas despesas por categoria.</li>
              <li><strong>Personalização:</strong> Você pode reordenar os blocos de informação (widgets) arrastando-os para a posição desejada.</li>
            </ul>
          </section>

          {/* Despesas */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Receipt size={20} className="text-red-600" /> Despesas
            </h3>
            <p className="text-gray-600 mb-2">
              Aqui você registra todo o dinheiro que sai da sua conta.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Adicionar:</strong> Clique em "Nova Despesa" para registrar um gasto. Você pode definir se é uma despesa fixa (que se repete todo mês) ou parcelada.</li>
              <li><strong>Status:</strong> Marque as despesas como "Pagas" ou "Pendentes" clicando no ícone de check ou relógio.</li>
              <li><strong>Filtros:</strong> Use os filtros no topo para ver despesas de um mês específico ou de uma categoria.</li>
            </ul>
          </section>

          {/* Receitas */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <TrendingUp size={20} className="text-green-600" /> Receitas
            </h3>
            <p className="text-gray-600 mb-2">
              Registre todo o dinheiro que entra na sua conta (salário, freelas, vendas).
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Adicionar:</strong> Clique em "Nova Receita". Assim como nas despesas, você pode marcar se é uma receita fixa.</li>
              <li><strong>Status:</strong> Acompanhe o que já foi recebido e o que ainda está pendente.</li>
            </ul>
          </section>

          {/* Investimentos */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <LineChart size={20} className="text-blue-600" /> Investimentos
            </h3>
            <p className="text-gray-600 mb-2">
              Controle suas aplicações financeiras e resgates.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Entradas e Saídas:</strong> Registre quando você aplica dinheiro (Entrada) ou quando resgata (Saída).</li>
              <li><strong>Acompanhamento:</strong> Veja o total investido e o histórico de movimentações.</li>
            </ul>
          </section>

          {/* A Pagar */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <ListChecks size={20} className="text-yellow-600" /> A Pagar
            </h3>
            <p className="text-gray-600 mb-2">
              Uma visão focada apenas nas contas que ainda precisam ser pagas.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Gestão Rápida:</strong> Veja facilmente o que está vencendo.</li>
              <li><strong>Pagamento em Lote:</strong> Selecione várias contas e marque todas como pagas de uma só vez.</li>
            </ul>
          </section>

          {/* Categorias */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Tags size={20} className="text-indigo-600" /> Categorias
            </h3>
            <p className="text-gray-600 mb-2">
              Organize suas transações para entender melhor para onde vai seu dinheiro.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Personalização:</strong> Crie, edite ou exclua categorias conforme sua necessidade (ex: Alimentação, Transporte, Lazer).</li>
              <li><strong>Orçamento (Premium):</strong> Defina um limite de gastos (orçamento) para cada categoria e acompanhe se você está dentro da meta.</li>
            </ul>
          </section>

          {/* Membros */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Users size={20} className="text-orange-600" /> Membros (Premium)
            </h3>
            <p className="text-gray-600 mb-2">
              Compartilhe a gestão financeira com sua família.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Adicionar Membros:</strong> Crie perfis para dependentes (ex: filhos) para que eles possam registrar seus próprios gastos.</li>
              <li><strong>Visão do Administrador:</strong> Como conta principal, você pode acessar e visualizar as finanças de todos os membros.</li>
            </ul>
          </section>

          {/* Exportação */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <FileSpreadsheet size={20} className="text-emerald-600" /> Exportação de Relatórios
            </h3>
            <p className="text-gray-600 mb-2">
              Gere relatórios das suas finanças em PDF ou Excel.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Onde encontrar:</strong> Disponível nas telas de Despesas, Receitas, Investimentos e A Pagar.</li>
              <li><strong>Como funciona:</strong> Se você selecionar itens específicos na lista, o relatório conterá apenas esses itens. Se não selecionar nenhum, o relatório trará todos os itens visíveis de acordo com os filtros atuais (Mês/Ano).</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
};
