export const COMMISSION_RATE = 0.20

export interface CRMRow {
  created_at?: string
  name?: string | null
  number?: string | null
  email?: string | null
  product?: string | null
  Event?: string | null
  utm_source?: string | null
  '($)'?: string | number | null
  status?: string | null
}

const isAbandoned = (r: CRMRow) => r.Event === 'abandoned_cart'
const isPaid = (r: CRMRow) => r.Event === 'order_paid'
const isWPP = (r: CRMRow) => r.utm_source?.includes('WPP') ?? false
const isFront = (r: CRMRow) => !isWPP(r)
const toValue = (r: CRMRow) => parseFloat(String(r['($)'] ?? '0')) || 0

export function calcAbandonedCarts(rows: CRMRow[]): number {
  return rows.filter(isAbandoned).length
}

export function calcResponseRate(rows: CRMRow[]): number {
  const carrinhos = rows.filter(isAbandoned).length
  if (!carrinhos) return 0
  const responderam = rows.filter(
    (r) => isAbandoned(r) && !!r.status && r.status !== 'primeiro_contato',
  ).length
  return (responderam / carrinhos) * 100
}

export function calcRecoveredSales(rows: CRMRow[]): number {
  return rows.filter((r) => isPaid(r) && isWPP(r)).length
}

export function calcConversionRate(recoveredSales: number, abandonedCarts: number): number {
  if (!abandonedCarts) return 0
  return (recoveredSales / abandonedCarts) * 100
}

export function calcTicketMedio(rows: CRMRow[]): number {
  const wppSales = rows.filter((r) => isPaid(r) && isWPP(r))
  if (!wppSales.length) return 0
  const total = wppSales.reduce((acc, r) => acc + toValue(r), 0)
  return total / wppSales.length
}

export function calcValorRecuperado(rows: CRMRow[]): number {
  return rows
    .filter((r) => isPaid(r) && isWPP(r))
    .reduce((acc, r) => acc + toValue(r), 0)
}

export function calcComissaoLumix(valorRecuperado: number): number {
  return valorRecuperado * COMMISSION_RATE
}

export function calcFaturamentoFront(rows: CRMRow[]): number {
  return rows
    .filter((r) => isPaid(r) && isFront(r))
    .reduce((acc, r) => acc + toValue(r), 0)
}

export function calcFaturamentoSobFront(valorRecuperado: number, faturamentoFront: number): number {
  if (!faturamentoFront) return 0
  return (valorRecuperado / faturamentoFront) * 100
}
