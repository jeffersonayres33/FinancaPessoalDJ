import React from 'react';
import { LayoutDashboard, Receipt, TrendingUp, LineChart, ListChecks, Tags, Users, FileSpreadsheet, Printer, ShieldAlert, Download, Upload, Settings, Calendar, Palette, Sparkles } from 'lucide-react';
import { APP_VERSION, BUILD_DATE } from '../constants';

export const HelpSection: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <ShieldAlert size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Ajuda e Funcionalidades</h2>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-gray-400 block">Versão: {APP_VERSION}</span>
            <span className="text-[10px] font-mono text-gray-300 block">Build: {BUILD_DATE}</span>
          </div>
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

          {/* Backup e Restauração */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Download size={20} className="text-teal-600" /> Backup e Restaurar Backup
            </h3>
            <p className="text-gray-600 mb-2">
              Mantenha seus dados seguros fazendo cópias de segurança.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Fazer Backup:</strong> Acesse o menu principal e clique em "Backup". Um arquivo contendo todos os seus dados será baixado para o seu dispositivo.</li>
              <li><strong>Restaurar Backup:</strong> No mesmo menu, clique em "Restaurar Backup" e selecione o arquivo gerado anteriormente para recuperar suas informações.</li>
            </ul>
          </section>

          {/* Configurações do Usuário */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Settings size={20} className="text-gray-600" /> Configurações do Usuário
            </h3>
            <p className="text-gray-600 mb-2">
              Personalize sua experiência clicando no ícone de engrenagem no topo da tela.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Data de Início do Mês:</strong> Defina o dia em que seu mês financeiro começa (ex: dia 5, quando você recebe o salário). O sistema ajustará os relatórios e o dashboard para considerar o período do dia escolhido até o dia anterior do mês seguinte.</li>
              <li><strong>Cor do Perfil:</strong> Escolha uma cor para o seu perfil. Isso ajuda a identificar rapidamente qual conta está sendo acessada, especialmente útil se você gerencia contas de membros da família.</li>
            </ul>
          </section>

          {/* Acessar Perfil de Membros */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Users size={20} className="text-pink-600" /> Acessar Perfil de Membros
            </h3>
            <p className="text-gray-600 mb-2">
              Como administrador, você pode gerenciar as finanças dos membros da sua família.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>Como acessar:</strong> Vá até a seção "Membros", encontre o membro desejado e clique no botão "Acessar Perfil" (ícone de seta).</li>
              <li><strong>O que acontece:</strong> Você entrará no sistema como se fosse aquele membro, podendo ver e editar as transações dele. Um aviso colorido no topo da tela indicará que você está no perfil de outra pessoa.</li>
              <li><strong>Como voltar:</strong> Clique no botão "Voltar para Conta Principal" no aviso do topo da tela.</li>
            </ul>
          </section>

          {/* Consultor Financeiro AI */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Sparkles size={20} className="text-purple-500" /> Consultor Financeiro AI
            </h3>
            <p className="text-gray-600 mb-2">
              Uma inteligência artificial integrada para ajudar nas suas decisões financeiras.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li><strong>O que é:</strong> Um assistente virtual que analisa seus dados financeiros e oferece conselhos personalizados.</li>
              <li><strong>Como funciona:</strong> O assistente pode sugerir onde economizar, alertar sobre gastos excessivos em categorias específicas e dar dicas de investimento com base no seu perfil de uso.</li>
              <li><strong>Onde encontrar:</strong> Procure pelo ícone de brilho ou botão do Consultor AI na interface para iniciar uma análise.</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
};
