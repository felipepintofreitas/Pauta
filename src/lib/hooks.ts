import { useEffect, useState } from 'react'

/** Simula o carregamento de dados para exibir skeletons. */
export function useCarregando(ms = 450, chave?: unknown) {
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    setCarregando(true)
    const t = window.setTimeout(() => setCarregando(false), ms)
    return () => window.clearTimeout(t)
  }, [ms, chave])
  return carregando
}

export function useAgora(intervaloMs = 1000, ativo = true) {
  const [agora, setAgora] = useState(Date.now())
  useEffect(() => {
    if (!ativo) return
    const t = window.setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => window.clearInterval(t)
  }, [intervaloMs, ativo])
  return agora
}

export function useMidia(consulta: string) {
  const [ok, setOk] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches)
  useEffect(() => {
    const m = window.matchMedia(consulta)
    const f = () => setOk(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [consulta])
  return ok
}
