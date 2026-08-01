import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ReportRow = { name: string; count: number; revenue: number; received: number; commission: number };
export type FinancialReport = {
  orgName: string;
  periodLabel: string;
  totals: { count: number; revenue: number; received: number; toReceive: number };
  perMember: ReportRow[];
  perMethod: { method: string; value: number }[];
};

/** Baixa uma tabela genérica como CSV (Excel PT-BR). */
export function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(escape).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const brl = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const brlInt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

/** Baixa o relatório como CSV (separador ; e BOM para Excel PT-BR). */
export function exportReportCsv(r: FinancialReport) {
  const lines: string[][] = [];
  lines.push([`Relatório financeiro — ${r.orgName}`]);
  lines.push([`Período: ${r.periodLabel}`]);
  lines.push([]);
  lines.push(['Resumo']);
  lines.push(['Atendimentos', String(r.totals.count)]);
  lines.push(['Faturamento', brl(r.totals.revenue)]);
  lines.push(['Recebido', brl(r.totals.received)]);
  lines.push(['A receber', brl(r.totals.toReceive)]);
  lines.push([]);
  lines.push(['Por profissional']);
  lines.push(['Profissional', 'Atendimentos', 'Faturamento', 'Recebido', 'Comissão']);
  r.perMember.forEach((m) => lines.push([m.name, String(m.count), brl(m.revenue), brl(m.received), brl(m.commission)]));
  lines.push([]);
  lines.push(['Por forma de pagamento']);
  lines.push(['Forma', 'Recebido']);
  r.perMethod.forEach((p) => lines.push([p.method, brl(p.value)]));

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = lines.map((row) => row.map(escape).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-${r.periodLabel.replace(/[^\w]/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Baixa o relatório como PDF (uma página, tabelas por profissional e por forma). */
export function exportReportPdf(r: FinancialReport) {
  const doc = new jsPDF();
  const indigo: [number, number, number] = [79, 70, 229];

  doc.setFontSize(18);
  doc.setTextColor(...indigo);
  doc.text('Relatório financeiro', 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(r.orgName, 14, 28);
  doc.setTextColor(120);
  doc.text(`Período: ${r.periodLabel}`, 14, 34);

  autoTable(doc, {
    startY: 42,
    head: [['Resumo', '']],
    body: [
      ['Atendimentos', String(r.totals.count)],
      ['Faturamento', `R$ ${brlInt(r.totals.revenue)}`],
      ['Recebido', `R$ ${brlInt(r.totals.received)}`],
      ['A receber', `R$ ${brlInt(r.totals.toReceive)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: indigo },
    styles: { fontSize: 10 },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [['Profissional', 'Atend.', 'Faturamento', 'Recebido', 'Comissão']],
    body: r.perMember.map((m) => [m.name, String(m.count), `R$ ${brlInt(m.revenue)}`, `R$ ${brlInt(m.received)}`, `R$ ${brlInt(m.commission)}`]),
    theme: 'striped',
    headStyles: { fillColor: indigo },
    styles: { fontSize: 10 },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [['Forma de pagamento', 'Recebido']],
    body: r.perMethod.map((p) => [p.method, `R$ ${brlInt(p.value)}`]),
    theme: 'striped',
    headStyles: { fillColor: indigo },
    styles: { fontSize: 10 },
  });

  doc.save(`relatorio-${r.periodLabel.replace(/[^\w]/g, '_')}.pdf`);
}
