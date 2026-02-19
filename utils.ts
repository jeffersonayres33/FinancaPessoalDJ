
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
    // Correção de Fuso Horário:
    // Ao invés de criar new Date(dateString) que assume UTC ou Local dependendo do formato,
    // nós dividimos a string YYYY-MM-DD e criamos a data explicitamente no fuso local.
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
