import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFilters } from './useFilters'
import { startOfDayUTC, endOfDayUTC } from '@/lib/dates'
import {
  calcAbandonedCarts,
  calcResponseRate,
  calcRecoveredSales,
  calcConversionRate,
  calcTicketMedio,
  calcValorRecuperado,
  calcComissaoLumix,
  calcFaturamentoFront,
  calcFaturamentoSobFront,
  CRMRow,
} from '@/lib/metrics'

const TABLE = 'ancore_info_br_CRM'

async function fetchAllRows(from: string, to: string, productFilter: string | null): Promise<CRMRow[]> {
  const PAGE_SIZE = 1000
  let allRows: CRMRow[] = []
  let page = 0

  while (true) {
    let q = supabase
      .from(TABLE)
      .select('id, created_at, "Event", utm_source, status, "($)"')
      .gte('created_at', from)
      .lte('created_at', to)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (productFilter) q = q.eq('product', productFilter)

    const { data, error } = await q

    if (error) throw error
    if (!data || data.length === 0) break

    allRows = allRows.concat(data as CRMRow[])

    if (data.length < PAGE_SIZE) break
    page++
  }

  return allRows
}

export interface DashboardMetrics {
  carrinhosAbandonados: number
  taxaResposta: number
  vendasRecuperadas: number
  taxaConversao: number
  ticketMedio: number
  valorRecuperado: number
  faturamentoFront: number
  comissaoLumix: number
  faturamentoSobFrontPct: number
}

const zero: DashboardMetrics = {
  carrinhosAbandonados: 0,
  taxaResposta: 0,
  vendasRecuperadas: 0,
  taxaConversao: 0,
  ticketMedio: 0,
  valorRecuperado: 0,
  faturamentoFront: 0,
  comissaoLumix: 0,
  faturamentoSobFrontPct: 0,
}

export function useMetrics() {
  const { dateFrom, dateTo, product } = useFilters()
  const [metrics, setMetrics] = useState<DashboardMetrics>(zero)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const from = startOfDayUTC(dateFrom)
        const to = endOfDayUTC(dateTo)

        const productFilter = product && product !== 'Todos' ? product : null

        const rows = await fetchAllRows(from, to, productFilter)

        if (cancelled) return

        const carrinhosAbandonados = calcAbandonedCarts(rows)
        const taxaResposta = calcResponseRate(rows)
        const vendasRecuperadas = calcRecoveredSales(rows)
        const taxaConversao = calcConversionRate(vendasRecuperadas, carrinhosAbandonados)
        const ticketMedio = calcTicketMedio(rows)
        const valorRecuperado = calcValorRecuperado(rows)
        const faturamentoFront = calcFaturamentoFront(rows)
        const comissaoLumix = calcComissaoLumix(valorRecuperado)
        const faturamentoSobFrontPct = calcFaturamentoSobFront(valorRecuperado, faturamentoFront)

        setMetrics({
          carrinhosAbandonados,
          taxaResposta,
          vendasRecuperadas,
          taxaConversao,
          ticketMedio,
          valorRecuperado,
          faturamentoFront,
          comissaoLumix,
          faturamentoSobFrontPct,
        })
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Erro ao buscar dados')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [dateFrom, dateTo, product])

  return { metrics, loading, error }
}
