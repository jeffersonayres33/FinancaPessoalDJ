
export const formatCurrency = (value: number): string => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    // Se for uma string ISO com tempo (ex: 2026-03-16T16:06:12.000Z)
    if (dateString.includes('T')) {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR').format(date);
    }

    // Correção de Fuso Horário para datas no formato YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Verifica se os componentes são válidos
    if (!year || !month || !day) return dateString;

    const date = new Date(year, month - 1, day);
    
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch (e) {
    return dateString;
  }
};

// Nova função helper para obter a data atual em formato YYYY-MM-DD (Local Time)
// Evita o problema do toISOString() que retorna o dia anterior/posterior dependendo da hora UTC
export const getCurrentLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentFinancialPeriod = (startDay: number): { month: number, year: number } => {
  if (!startDay || startDay < 1 || startDay > 31) {
    startDay = 1;
  }

  const now = new Date();
  const currentDay = now.getDate();
  let currentMonth = now.getMonth();
  let currentYear = now.getFullYear();

  if (currentDay < startDay) {
    // We are still in the previous financial month
    currentMonth -= 1;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear -= 1;
    }
  }

  return { month: currentMonth, year: currentYear };
};

export const getFinancialMonthRange = (year: number, month: number, startDay: number) => {
  if (!startDay || startDay < 1 || startDay > 31) {
    startDay = 1;
  }

  // Opção B: O mês selecionado dita o mês em que o ciclo COMEÇA.
  // Ex: Se startDay = 25 e month = 2 (Março), o período é 25/03 a 24/04.
  const startDate = new Date(year, month, startDay);
  
  let endDate: Date;
  if (startDay === 1) {
    // Se for dia 1, o fim é o último dia do mês atual
    endDate = new Date(year, month + 1, 0);
  } else {
    // Se for > 1, o fim é o dia anterior ao startDay no próximo mês
    endDate = new Date(year, month + 1, startDay - 1);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

export const getFinancialYearRange = (year: number, startDay: number) => {
  if (!startDay || startDay < 1 || startDay > 31) {
    startDay = 1;
  }

  // Ano financeiro começa no startDay de Janeiro do ano selecionado
  const startDate = new Date(year, 0, startDay);
  
  let endDate: Date;
  if (startDay === 1) {
    endDate = new Date(year, 11, 31);
  } else {
    // Termina no dia anterior ao startDay de Janeiro do ano seguinte
    endDate = new Date(year + 1, 0, startDay - 1);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

export const printData = (title: string, headers: string[], rows: (string | number)[][]) => {
  const printWindow = window.open('', '', 'height=600,width=800');
  
  if (!printWindow) {
    alert('Por favor, permita pop-ups para imprimir.');
    return;
  }

  const tableHeaders = headers.map(h => 
    `<th style="border: 1px solid #000; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">${h}</th>`
  ).join('');

  const tableRows = rows.map((row, index) => {
    const bg = index % 2 === 0 ? '#fff' : '#f9f9f9';
    return `<tr style="background-color: ${bg};">
      ${row.map(cell => `<td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">${cell}</td>`).join('')}
    </tr>`;
  }).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; margin-bottom: 20px; font-size: 24px; }
          .meta { text-align: right; font-size: 10px; color: #666; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 500);
};
