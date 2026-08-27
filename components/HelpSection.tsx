import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  LineChart, 
  ListChecks, 
  Tags, 
  Users, 
  FileSpreadsheet, 
  Download, 
  Settings, 
  Sparkles, 
  Camera, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  BookOpen, 
  Lightbulb, 
  Zap, 
  PieChart, 
  BarChart3, 
  CalendarClock, 
  ShieldCheck, 
  Wifi, 
  Layers, 
  Sliders, 
  HelpCircle, 
  Target, 
  Smartphone,
  Copy,
  ArrowRight,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';
import { APP_VERSION, BUILD_DATE } from '../constants';

interface TutorialTopic {
  id: string;
  category: 'start' | 'dashboard' | 'transactions' | 'ai' | 'categories' | 'members' | 'settings' | 'faq';
  title: string;
  icon: React.ElementType;
  badgeColor: string;
  summary: string;
  keyFeatures: string[];
  stepByStep: string[];
  proTips: string[];
  tags: string[];
}

export const HelpSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({
    'getting-started': true,
    'dashboard-overview': true
  });
  const [faqExpanded, setFaqExpanded] = useState<Record<number, boolean>>({});

  const categories = [
    { id: 'all', label: 'Todos os Recursos', icon: Layers },
    { id: 'start', label: 'Primeiros Passos', icon: Zap },
    { id: 'dashboard', label: 'Dashboard & Gráficos', icon: LayoutDashboard },
    { id: 'transactions', label: 'Receitas, Despesas & Contas', icon: Receipt },
    { id: 'ai', label: 'Consultor AI & OCR', icon: Sparkles },
    { id: 'categories', label: 'Categorias & Orçamentos', icon: Tags },
    { id: 'members', label: 'Membros da Família', icon: Users },
    { id: 'settings', label: 'Backup & Configurações', icon: Settings },
    { id: 'faq', label: 'Dúvidas Frequentes', icon: HelpCircle },
  ];

  const topics: TutorialTopic[] = [
    {
      id: 'getting-started',
      category: 'start',
      title: 'Guia de Início Rápido (Do Zero ao Controle Total)',
      icon: Zap,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      summary: 'Aprenda o fluxo ideal para organizar suas finanças em 4 passos práticos e começar a ter clareza financeira imediata.',
      keyFeatures: [
        'Configuração inicial da data de corte salarial',
        'Criação e personalização de categorias com metas orçamentárias',
        'Registro dos lançamentos fixos recorrentes',
        'Instalação no celular como aplicativo nativo (PWA)'
      ],
      stepByStep: [
        '1. Ajuste a Competência: Clique no ícone de Engrenagem (Configurações) no topo e defina o "Dia de Início do Mês" conforme seu dia de recebimento (ex: dia 5).',
        '2. Configure suas Categorias: Acesse "Categorias" e defina seus limites de gastos (Orçamento) para Alimentação, Moradia, Transporte, Lazer, etc.',
        '3. Lance seus Gastos e Receitas Fixas: Em "Despesas" e "Receitas", cadastre contas que se repetem todo mês marcando a opção "Despesa/Receita Fixa".',
        '4. Instale no Celular: No menu do topo, clique em "Instalar Aplicativo" para usar com ícone direto na tela inicial, com suporte a modo offline.'
      ],
      proTips: [
        'Definir a data de início do mês financeiro alinhada ao seu salário transforma a precisão do seu saldo real.',
        'O sistema funciona mesmo sem internet! Seus lançamentos ficam salvos localmente e são sincronizados assim que a conexão retornar.'
      ],
      tags: ['inicio', 'comecar', 'guia', 'pwa', 'offline', 'primeiros passos', 'celular', 'atalho']
    },
    {
      id: 'dashboard-overview',
      category: 'dashboard',
      title: 'Dashboard Interativo & Indicadores em Tempo Real',
      icon: LayoutDashboard,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      summary: 'Visão panorâmica da sua saúde financeira com métricas em tempo real, saldo consolidado e widgets reorganizáveis.',
      keyFeatures: [
        'Cards de Receitas, Despesas e Investimentos com valores realizados e pendentes',
        'Saldo Atual (dinheiro em conta) vs. Saldo Geral Previsto (após pagar e receber tudo)',
        'Taxa de Economia Inteligente com cálculo de percentual poupado',
        'Comparativo de Orçamento vs. Gasto Realizado por Categoria',
        'Totalmente personalizável: arraste, reordene ou oculte widgets como preferir'
      ],
      stepByStep: [
        '1. Filtrar Período: Utilize os seletores de Mês e Ano no topo para visualizar uma competência específica ou o histórico acumulado ("Todos").',
        '2. Analisar o Saldo: Observe a distinção entre o Saldo Atual (já liquidado) e o Saldo Geral (inclui pendências do período).',
        '3. Personalizar Visualização: Clique no botão "Personalizar Dashboard" para ativar/desativar widgets e reordená-los com as setas para cima/baixo.',
        '4. Restaurar Layout: Se desejar voltar ao layout original, clique em "Restaurar Padrão" dentro do painel de personalização.'
      ],
      proTips: [
        'Uma taxa de economia acima de 20% é considerada excelente para construção de patrimônio e reserva de emergência.',
        'A barra de progresso no "Saldo por Categoria" muda de cor e avisa se você estourou ou está próximo do teto de gastos estipulado.'
      ],
      tags: ['dashboard', 'painel', 'saldo', 'receitas', 'despesas', 'widgets', 'personalizar', 'economia', 'orcamento']
    },
    {
      id: 'charts-analytics',
      category: 'dashboard',
      title: 'Gráficos Analíticos & Inteligência Visual',
      icon: BarChart3,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      summary: 'Explore 7 tipos de gráficos e relatórios visuais dinâmicos para entender exatamente para onde o seu dinheiro está indo.',
      keyFeatures: [
        'Evolução de Saldo Mensal (linha do tempo ao longo dos 12 meses)',
        'Evolução de Gastos por Categoria (identifique tendências sazonais)',
        'Destino do Dinheiro & Gráficos de Rosca por Tipo',
        'Top 5 Maiores Gastos do Período',
        'Evolução de Investimentos e Fluxo de Caixa Acumulado'
      ],
      stepByStep: [
        '1. Acesse o Dashboard e role até a seção de gráficos analíticos.',
        '2. Passe o cursor (ou toque) sobre as barras e fatias para inspecionar valores exatos e percentuais detalhados.',
        '3. Troque o ano de referência no filtro superior para comparar o comportamento financeiro atual com anos anteriores.'
      ],
      proTips: [
        'Use o gráfico "Top 5 Gastos" para identificar custos supérfluos que estão pesando no orçamento sem você perceber.',
        'O gráfico de fluxo de caixa ajuda a antecipar se haverá escassez de liquidez nos meses futuros com base nos lançamentos fixos.'
      ],
      tags: ['graficos', 'analise', 'evolucao', 'fluxo de caixa', 'top gastos', 'estatisticas', 'relatorios visuais']
    },
    {
      id: 'expenses-management',
      category: 'transactions',
      title: 'Gestão Completa de Despesas & Comprovantes OCR',
      icon: Receipt,
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      summary: 'Cadastre gastos simples, fixos e parcelados. Utilize a IA para ler notas fiscais e altere status com 1 clique.',
      keyFeatures: [
        'Lançamento Avulso, Recorrente (Fixo) ou Parcelado (em até 72x)',
        'Leitura Inteligente de Recibos/Notas por Foto ou Câmera com IA (OCR)',
        'Ações em Lote: Selecione múltiplas despesas para editar ou excluir juntas',
        'Filtros completos por texto, categoria, status, datas e períodos',
        'Exportação profissional para PDF com numeração "Página X de Y" e planilha Excel (.xlsx)'
      ],
      stepByStep: [
        '1. Cadastrar Despesa: Clique em "Nova Despesa" no canto superior da listagem.',
        '2. Lançamento por Foto: Clique no ícone de Câmera dentro do formulário para fotografar ou enviar uma nota fiscal. A IA preenche título, valor, data e categoria automaticamente.',
        '3. Parcelamento Inteligente: Escolha o número de parcelas (ex: 12x). O sistema calcula o valor unitário e agenda todas as competências futuras.',
        '4. Alterar Status: Clique no ícone de relógio (Pendente) para transformá-lo em check verde (Pago) e atualizar seu saldo instantaneamente.',
        '5. Seleção e Edição em Lote: Marque os checkboxes ao lado dos itens para excluí-los em massa ou alterar categoria/status simultaneamente.'
      ],
      proTips: [
        'O botão "Limpar Filtros" reseta imediatamente todas as buscas por texto, datas, categorias e desmarca quaisquer seleções ativas.',
        'Ao gerar o PDF, se houver itens selecionados via checkbox, o relatório trará exclusivamente a seleção; caso contrário, exportará tudo o que estiver filtrado na tela.'
      ],
      tags: ['despesas', 'gastos', 'ocr', 'camera', 'recibo', 'nota fiscal', 'parcelado', 'lote', 'pdf', 'excel', 'filtros']
    },
    {
      id: 'income-management',
      category: 'transactions',
      title: 'Gestão de Receitas & Entradas Financeiras',
      icon: TrendingUp,
      badgeColor: 'bg-green-100 text-green-800 border-green-200',
      summary: 'Registre salários, comissões, freelas, rendimentos e bonificações com botão de pagamento/recebimento rápido e modal de data.',
      keyFeatures: [
        'Botão "Pagar/Receber" verde com modal de confirmação e alteração da data de recebimento',
        'Quitação em lote de múltiplas receitas com 1 clique',
        'Receitas fixas recorrentes que geram previsibilidade automática',
        'Marcação de recebimento (Pendente / Recebido) com impacto no saldo real',
        'Edição e exclusão em lote para agilizar a manutenção',
        'Relatórios completos em PDF (com paginação X de Y) e exportação em Excel'
      ],
      stepByStep: [
        '1. Clique em "Nova Receita" na tela de Receitas.',
        '2. Informe o título, valor, data de recebimento esperada e categoria (ex: Salário, Rendimentos, Vendas).',
        '3. Se for salário ou rendimento mensal contínuo, ative "Receita Fixa" para replicar nos próximos períodos.',
        '4. Para confirmar recebimento: clique no botão verde "Pagar", confira ou ajuste a data real de recebimento no modal e confirme.',
        '5. Para quitar várias receitas de uma vez: marque as caixas de seleção e clique no botão verde "Pagar (X)" no cabeçalho.'
      ],
      proTips: [
        'O modal de confirmação permite ajustar a data em que o dinheiro realmente caiu na sua conta corrente.',
        'Cadastre receitas pendentes com as datas previstas de recebimento para que o cálculo de Saldo Geral Previsto do Dashboard seja 100% exato.'
      ],
      tags: ['receitas', 'salario', 'entradas', 'rendimentos', 'ganhos', 'pagar', 'receber', 'modal data', 'relatorios', 'pdf', 'excel']
    },
    {
      id: 'investments-management',
      category: 'transactions',
      title: 'Controle de Investimentos & Aplicações',
      icon: LineChart,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      summary: 'Monitore aportes, reservas financeiras, renda fixa, ações e resgates de capital com botão de liquidação e modal de data.',
      keyFeatures: [
        'Botão "Pagar" verde com modal de confirmação e seleção da data de liquidação',
        'Liquidação em lote de múltiplos investimentos selecionados',
        'Classificação de operações: Entrada (Aporte/Aplicação) e Saída (Resgate/Venda)',
        'Histórico cronológico de rentabilidade e evolução patrimonial',
        'Widget dedicado no Dashboard para acompanhar o crescimento dos investimentos',
        'Exportação de relatórios específicos para declaração e controle de patrimônio'
      ],
      stepByStep: [
        '1. Acesse a aba "Investimentos" e clique em "Novo Investimento".',
        '2. Selecione a operação: "Entrada" (quando colocar dinheiro no investimento) ou "Saída" (quando resgatar de volta para a conta corrente).',
        '3. Atribua à categoria correspondente (ex: CDB, Tesouro Direto, Ações, FIIs, Cripto).',
        '4. Para liquidar o aporte/operação: clique no botão verde "Pagar", escolha a data no modal e confirme.',
        '5. Para liquidar vários aportes juntos: marque os checkboxes e clique em "Pagar (X)" no cabeçalho.'
      ],
      proTips: [
        'Manter investimentos cadastrados separadamente de despesas cotidianas impede distorções na sua taxa de economia real.'
      ],
      tags: ['investimentos', 'aporte', 'resgate', 'renda fixa', 'acoes', 'patrimonio', 'pagar', 'modal data', 'cdb', 'tesouro']
    },
    {
      id: 'payable-management',
      category: 'transactions',
      title: 'Contas a Pagar & Quitação Rápida em Lote',
      icon: ListChecks,
      badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      summary: 'Central de controle focada 100% nas contas pendentes de vencimento, com quitação de múltiplos boletos em um único clique.',
      keyFeatures: [
        'Painel limpo focado exclusivamente no que está pendente de pagamento',
        'Quitação em Lote: selecione 5, 10 ou 20 contas e marque todas como pagas de uma só vez',
        'Filtro rápido por Tipo (Recorrentes, Parceladas ou Avulsas) e Categorias',
        'Exportação de lista de pendências em PDF para imprimir ou salvar'
      ],
      stepByStep: [
        '1. No menu lateral/superior, clique em "A Pagar".',
        '2. Veja a lista organizada por data de vencimento com totalizador das contas do período.',
        '3. Para pagar várias contas juntas: marque a caixa de seleção de cada uma delas (ou selecione todas no topo) e clique no botão verde "Pagar Selecionados".',
        '4. Todas as contas selecionadas serão marcadas como pagas e debitadas do seu saldo em tempo real.'
      ],
      proTips: [
        'Utilize esta tela todo início de semana para fazer o checklist de contas a vencer nos próximos 7 dias e evitar juros por atraso.'
      ],
      tags: ['a pagar', 'contas a pagar', 'boletos', 'vencimento', 'pagamento em lote', 'quitacao', 'pendencias']
    },
    {
      id: 'future-launches',
      category: 'transactions',
      title: 'Lançamentos Futuros & Previsibilidade Financeira',
      icon: CalendarClock,
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      summary: 'Visão unificada de todas as despesas fixas, receitas recorrentes e parcelas futuras agendadas para os próximos meses.',
      keyFeatures: [
        'Visualização consolidada de compromissos recorrentes ativos',
        'Antecipação com 1 clique: lance a próxima competência antes do tempo',
        'Pausa ou cancelamento de séries de recorrências',
        'Cálculo do impacto financeiro nos meses subsequentes'
      ],
      stepByStep: [
        '1. Acesse a aba "Lançamentos Futuros" no menu principal.',
        '2. Navegue pelos cards de compromissos fixos e contratos recorrentes.',
        '3. Clique em "Antecipar" se quiser adiantar o pagamento ou recebimento de um mês futuro.',
        '4. Se cancelou uma assinatura ou serviço, clique em "Remover Recorrência" para não gerar lançamentos nos meses seguintes.'
      ],
      proTips: [
        'Lançamentos Futuros é a ferramenta ideal para simular seu orçamento antes de assumir novos parcelamentos.'
      ],
      tags: ['futuros', 'previsao', 'recorrencia', 'antecipacao', 'parcelas futuras', 'assinaturas']
    },
    {
      id: 'ai-advisor',
      category: 'ai',
      title: 'Consultor Financeiro AI (Powered by Gemini AI)',
      icon: Sparkles,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      summary: 'Um consultor financeiro de inteligência artificial de ponta que analisa seu padrão de consumo, detecta anomalias e orienta cortes.',
      keyFeatures: [
        'Diagnóstico completo de receitas, despesas e taxa de poupança',
        'Detecção de anomalias (gastos que fugiram da média habitual)',
        '3 Recomendações personalizadas e práticas para você economizar',
        'Até 3 análises diárias com histórico salvo para você acompanhar seu progresso'
      ],
      stepByStep: [
        '1. No Dashboard, localize o bloco "Consultor Financeiro AI".',
        '2. Clique em "Gerar Nova Análise". A IA processará todas as suas transações do período.',
        '3. Leia o Resumo Executivo, as Dicas Personalizadas e as Anomalias Encontradas.',
        '4. Clique em "Ver Histórico de Análises" para comparar diagnósticos de meses anteriores.'
      ],
      proTips: [
        'Quanto mais detalhadas forem suas categorias e observações, mais precisos e inteligentes serão os conselhos da IA.',
        'O limite de 3 análises por dia garante respostas detalhadas e processamento analítico profundo sem lentidão.'
      ],
      tags: ['ia', 'ai', 'consultor', 'gemini', 'inteligencia artificial', 'dicas', 'analise financeira', 'anomalias']
    },
    {
      id: 'categories-budgets',
      category: 'categories',
      title: 'Categorias, Metas de Orçamento & Inativação Inteligente',
      icon: Tags,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      summary: 'Organize suas movimentações com cores e ícones, defina tetos de gastos e inative categorias antigas sem quebrar o histórico.',
      keyFeatures: [
        'Criação de categorias personalizadas para Despesas, Receitas e Investimentos',
        'Definição de Orçamento (Teto Mensal) com controle de estouro de gastos',
        'Inativação com 3 Opções de Efeito: Todas as Datas, Efeito Imediato ou Efeito Futuro',
        'Migração em lote de transações ao renomear ou reorganizar categorias',
        'Reativação simples a qualquer momento com preservação histórica'
      ],
      stepByStep: [
        '1. Acesse o menu "Categorias".',
        '2. Para criar: clique em "Nova Categoria", digite o nome, escolha a cor, tipo e o orçamento mensal teto.',
        '3. Para inativar: clique no botão de status/ações da categoria. Escolha:',
        '   - "Todas as Datas": inativa em todo o histórico;',
        '   - "Efeito Imediato": inativa a partir do mês escolhido mantendo o passado intacto;',
        '   - "Efeito Futuro": permanece ativa no mês atual e inativa a partir do próximo.',
        '4. Para reativar: selecione a categoria inativa e clique em "Reativar".'
      ],
      proTips: [
        'A inativação inteligente é perfeita para contratos que encerraram (ex: aluguel antigo ou financiamento quitado), preservando os relatórios dos anos anteriores sem poluir os novos lançamentos.'
      ],
      tags: ['categorias', 'orcamento', 'metas', 'inativar', 'migracao', 'teto de gastos', 'cores']
    },
    {
      id: 'family-members',
      category: 'members',
      title: 'Múltiplos Perfis & Gestão Familiar Compartilhada',
      icon: Users,
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
      summary: 'Adicione cônjuge, filhos ou dependentes. Acesse a conta de qualquer membro com 1 clique para auditar e gerenciar.',
      keyFeatures: [
        'Criação de perfis vinculados com e-mail e senha individuais',
        'Acesso Imediato ao Perfil (Masquerading): o administrador navega como se fosse o dependente',
        'Barra de Notificação Superior com botão "Voltar para Conta Principal"',
        'Controle financeiro individualizado mantendo a privacidade ou a visão do responsável'
      ],
      stepByStep: [
        '1. No menu, clique em "Membros".',
        '2. Clique em "Adicionar Membro", preencha o nome, e-mail e senha de acesso.',
        '3. Para entrar na conta do membro: clique no botão "Acessar Perfil" (ícone de seta).',
        '4. Uma barra colorida no topo indicará que você está navegando no perfil do membro.',
        '5. Para sair: clique no botão "Voltar para Conta Principal" no topo.'
      ],
      proTips: [
        'Ideal para ensinar educação financeira para os filhos ou consolidar o controle da família sob a tutela dos pais.'
      ],
      tags: ['membros', 'familia', 'dependentes', 'filhos', 'perfis', 'acessar perfil', 'compartilhar']
    },
    {
      id: 'backup-security',
      category: 'settings',
      title: 'Segurança, Backup Offline & Configurações de Perfil',
      icon: Settings,
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      summary: 'Mantenha seus dados blindados com backup e restauração instantâneos em arquivo, personalização de cores e corte financeiro.',
      keyFeatures: [
        'Exportação completa de Backup (arquivo .json seguro baixado no seu dispositivo)',
        'Restauração de Backup com 1 clique em caso de troca de aparelho ou emergência',
        'Configuração do Dia de Início do Mês Financeiro (dia 1 a 31)',
        'Cor de Perfil personalizada para fácil identificação visual',
        'Sincronização em nuvem segura via Supabase com criptografia'
      ],
      stepByStep: [
        '1. Gerar Backup: Abra o menu lateral/superior e clique em "Fazer Backup". Um arquivo seguro será baixado imediatamente no seu computador ou celular.',
        '2. Restaurar Backup: No menu, clique em "Restaurar Backup" e selecione o arquivo gerado anteriormente.',
        '3. Ajustar Perfil: Clique no ícone de Engrenagem (topo direito) para alterar seu nome, cor do perfil ou o dia de corte do mês financeiro.'
      ],
      proTips: [
        'Recomendamos baixar um backup mensalmente antes do fechamento de mês para manter uma cópia física offline adicional.'
      ],
      tags: ['backup', 'restaurar', 'seguranca', 'configuracoes', 'perfil', 'cor', 'mes financeiro', 'dia de corte']
    }
  ];

  const faqs = [
    {
      q: 'Como funciona o botão "Limpar Filtros" nas telas de listagem?',
      a: 'O botão "Limpar Filtros" reseta instantaneamente todos os campos de pesquisa por texto, filtros de categoria, filtros de status (Pendente/Pago), intervalos de datas e desmarca todas as seleções de checkboxes ativas na tela, retornando à visualização completa.'
    },
    {
      q: 'Como são gerados os relatórios em PDF com a numeração de páginas?',
      a: 'Ao clicar no botão "Imprimir / PDF" em Despesas, Receitas, Investimentos ou Contas a Pagar, o sistema gera automaticamente um documento formatado com cabeçalho colorido, totais consolidados e a numeração oficial "Página X de Y" no rodapé de cada folha, abrindo diretamente em uma nova aba para visualização e impressão.'
    },
    {
      q: 'O que acontece se eu usar o aplicativo sem internet (offline)?',
      a: 'O aplicativo foi construído com arquitetura Offline-First. Você pode adicionar despesas, marcar contas como pagas e editar transações normalmente. Todas as ações ficam guardadas em uma fila segura no seu dispositivo e são sincronizadas automaticamente com o servidor assim que a conexão for restabelecida.'
    },
    {
      q: 'Como a IA lê meus recibos e comprovantes fiscais?',
      a: 'Ao clicar no ícone de câmera no formulário de despesa e anexar uma foto de comprovante ou cupom fiscal, nosso modelo Gemini 3.5 com visão computacional extrai o valor total, o nome do estabelecimento, a data da compra e infere a melhor categoria, preenchendo tudo para você em segundos.'
    },
    {
      q: 'Qual a diferença entre Saldo Atual e Saldo Geral Previsto?',
      a: 'O Saldo Atual considera apenas o dinheiro real (Receitas Recebidas menos Despesas já Pagas). O Saldo Geral Previsto projeta o cenário completo até o final do período, somando receitas que você ainda vai receber e subtraindo contas que ainda faltam pagar.'
    },
    {
      q: 'Posso alterar a data de início do meu mês financeiro para o dia do meu salário?',
      a: 'Sim! Acesse o ícone de Engrenagem (Configurações do Usuário) no canto superior direito e selecione o dia desejado (por exemplo, dia 5 ou dia 10). Todos os dashboards, relatórios e filtros mensais passarão a calcular o período de competência a partir desse dia.'
    }
  ];

  const filteredTopics = useMemo(() => {
    return topics.filter(topic => {
      const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        topic.title.toLowerCase().includes(q) ||
        topic.summary.toLowerCase().includes(q) ||
        topic.keyFeatures.some(f => f.toLowerCase().includes(q)) ||
        topic.stepByStep.some(s => s.toLowerCase().includes(q)) ||
        topic.proTips.some(p => p.toLowerCase().includes(q)) ||
        topic.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  const toggleTopic = (id: string) => {
    setExpandedTopics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllTopics = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    topics.forEach(t => { next[t.id] = expand; });
    setExpandedTopics(next);
  };

  const toggleFaq = (index: number) => {
    setFaqExpanded(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header do Tutorial com Visual Moderno e Versão */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-12 w-96 h-32 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-purple-100 uppercase">
              <BookOpen size={14} /> Central de Treinamento & Recursos
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tutorial Completo & Possibilidades da Ferramenta
            </h1>
            <p className="text-purple-100 text-sm sm:text-base leading-relaxed">
              Explore cada recurso, atalho, automação com IA e funcionalidade avançada para dominar suas finanças com máxima precisão e praticidade.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-right shrink-0 self-start md:self-auto">
            <div className="text-xs text-purple-200 font-medium">Finanças Pessoais DJ</div>
            <div className="text-sm font-bold font-mono text-white mt-0.5">v{APP_VERSION}</div>
            <div className="text-[11px] text-purple-300 font-mono mt-0.5">Build: {BUILD_DATE}</div>
          </div>
        </div>

        {/* Barra de Pesquisa Rápida */}
        <div className="relative mt-6 z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquise por qualquer recurso (ex: OCR, parcelamento, IA, PDF, membros, orçamento, backup)..."
              className="w-full pl-12 pr-10 py-3.5 bg-white text-gray-900 rounded-xl shadow-md text-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-300/50 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navegação por Pílulas / Categorias */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${
                isActive
                  ? 'bg-purple-700 text-white shadow-purple-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200/80 hover:border-purple-300'
              }`}
            >
              <Icon size={16} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Controles de Expansão Global */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <div>
          Mostrando <strong>{filteredTopics.length}</strong> tópicos de guia {searchQuery && <span>para "<strong>{searchQuery}</strong>"</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleAllTopics(true)}
            className="text-purple-600 hover:text-purple-800 font-medium hover:underline flex items-center gap-1"
          >
            <ChevronDown size={14} /> Expandir todos
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => toggleAllTopics(false)}
            className="text-gray-500 hover:text-gray-700 font-medium hover:underline flex items-center gap-1"
          >
            <ChevronUp size={14} /> Recolher todos
          </button>
        </div>
      </div>

      {/* Lista de Tópicos do Tutorial */}
      <div className="space-y-4">
        {filteredTopics.map((topic) => {
          const isExpanded = !!expandedTopics[topic.id];
          const Icon = topic.icon;

          return (
            <div
              key={topic.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden transition-all hover:border-purple-200 hover:shadow-md"
            >
              {/* Cabeçalho do Card (Clicável) */}
              <button
                onClick={() => toggleTopic(topic.id)}
                className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-purple-50/30"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl mt-0.5 shrink-0 border border-purple-100">
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${topic.badgeColor}`}>
                        {categories.find(c => c.id === topic.category)?.label || 'Guia'}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        {topic.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {topic.summary}
                    </p>
                  </div>
                </div>

                <div className="p-1 text-gray-400 hover:text-purple-600 rounded-lg shrink-0 mt-1">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {/* Conteúdo Expandido do Tópico */}
              {isExpanded && (
                <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50/40 space-y-5 animate-fade-in text-sm">
                  
                  {/* Recursos Principais */}
                  <div>
                    <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-purple-700">
                      <Sparkles size={15} /> O que você pode fazer (Possibilidades & Recursos):
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {topic.keyFeatures.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-white p-3 rounded-lg border border-gray-200/60 shadow-xs">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-gray-700 text-xs sm:text-sm leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Passo a Passo de Utilização */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-purple-100 shadow-xs space-y-3">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wider text-purple-700">
                      <Target size={15} /> Passo a Passo Como Usar:
                    </h4>
                    <div className="space-y-2">
                      {topic.stepByStep.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-gray-700 leading-relaxed">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-xs shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{step.replace(/^[0-9]+\.\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dicas de Ouro / Boas Práticas */}
                  {topic.proTips.length > 0 && (
                    <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-xl space-y-2">
                      <h4 className="font-bold text-amber-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                        <Lightbulb size={15} className="text-amber-600" /> Dica de Ouro & Melhores Práticas:
                      </h4>
                      <ul className="space-y-1.5">
                        {topic.proTips.map((tip, idx) => (
                          <li key={idx} className="text-xs sm:text-sm text-amber-900 flex items-start gap-2 leading-relaxed">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Palavras-chave:</span>
                    {topic.tags.map((t, idx) => (
                      <span key={idx} className="text-[11px] bg-gray-200/70 text-gray-600 px-2 py-0.5 rounded-md font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {filteredTopics.length === 0 && (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center space-y-3">
            <HelpCircle size={40} className="mx-auto text-gray-300" />
            <h4 className="font-bold text-gray-700 text-base">Nenhum tópico encontrado</h4>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Não encontramos resultados para sua busca por "<strong>{searchQuery}</strong>". Tente buscar por outros termos ou selecione "Todos os Recursos".
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              <RotateCcw size={14} /> Limpar Busca
            </button>
          </div>
        )}
      </div>

      {/* Seção de Perguntas Frequentes (FAQ) */}
      {(selectedCategory === 'all' || selectedCategory === 'faq') && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200/80 space-y-6 mt-8">
          <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Perguntas Frequentes (FAQ)</h2>
              <p className="text-xs sm:text-sm text-gray-500">Respostas diretas para as dúvidas mais comuns do dia a dia</p>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isFaqOpen = !!faqExpanded[index];
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left p-4 bg-gray-50/50 hover:bg-purple-50/40 flex items-center justify-between gap-4 font-semibold text-gray-900 text-sm transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="text-gray-400 shrink-0">
                      {isFaqOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>
                  {isFaqOpen && (
                    <div className="p-4 bg-white text-gray-600 text-xs sm:text-sm leading-relaxed border-t border-gray-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cartão de Dicas Rápidas de Teclado & Acessibilidade */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wide">
            <Zap size={14} /> Produtividade Máxima
          </div>
          <h3 className="text-lg font-bold text-white">
            Pronto para transformar sua gestão financeira?
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
            Salve comprovantes no momento da compra, use o Consultor AI para auditar seus gastos semanalmente e mantenha suas categorias sempre alinhadas com suas metas!
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setSelectedCategory('all');
              setSearchQuery('');
              toggleAllTopics(true);
            }}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all text-center shadow-sm"
          >
            Ver Todos os Recursos
          </button>
        </div>
      </div>
    </div>
  );
};
