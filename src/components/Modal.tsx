import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, description, children, footer }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 pb-5 pt-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-800 dark:bg-neutral-950/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
