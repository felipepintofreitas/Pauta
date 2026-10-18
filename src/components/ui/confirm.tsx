import type { ReactNode } from 'react'
import { Button } from './button'
import { Dialog } from './dialog'

export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  confirmar,
  aoConfirmar,
  aoCancelar,
  perigo,
  children,
  desabilitado,
}: {
  aberto: boolean
  titulo: string
  descricao?: string
  confirmar: string
  aoConfirmar: () => void
  aoCancelar: () => void
  perigo?: boolean
  children?: ReactNode
  desabilitado?: boolean
}) {
  return (
    <Dialog
      aberto={aberto}
      aoFechar={aoCancelar}
      titulo={titulo}
      descricao={descricao}
      tamanho="sm"
      rodape={
        <>
          <Button variant="outline" onClick={aoCancelar}>
            Cancelar
          </Button>
          <Button variant={perigo ? 'destructive' : 'default'} onClick={aoConfirmar} disabled={desabilitado}>
            {confirmar}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}
