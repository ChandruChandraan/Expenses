import { useMemo, useState } from 'react'
import { Check, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useData } from '../context/DataContext'
import { formatINR } from '../lib/format'
import { Modal } from '../components/Modal'
import { MemberDetailsModal } from '../components/MemberDetailsModal'
import type { Member } from '../lib/types'

export function MembersPage() {
  const { members, expenses, addMember, renameMember, removeMember } = useData()
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [detailMember, setDetailMember] = useState<Member | null>(null)

  const stats = useMemo(() => {
    const paid = new Map<string, number>()
    const share = new Map<string, number>()
    const pending = new Map<string, number>()
    const count = new Map<string, number>()
    for (const m of members) {
      paid.set(m.id, 0)
      share.set(m.id, 0)
      pending.set(m.id, 0)
      count.set(m.id, 0)
    }
    for (const e of expenses) {
      if (paid.has(e.paidBy)) {
        paid.set(e.paidBy, (paid.get(e.paidBy) ?? 0) + e.amount)
      }
      const valid = e.splitAmong.filter((id) => share.has(id))
      if (valid.length > 0) {
        const per = e.amount / valid.length
        for (const id of valid) {
          share.set(id, (share.get(id) ?? 0) + per)
          count.set(id, (count.get(id) ?? 0) + 1)
          if (!e.settledBy.includes(id)) {
            pending.set(id, (pending.get(id) ?? 0) + per)
          }
        }
      }
    }
    return members.map((m) => ({
      member: m,
      paid: Math.round((paid.get(m.id) ?? 0) * 100) / 100,
      share: Math.round((share.get(m.id) ?? 0) * 100) / 100,
      pending: Math.round((pending.get(m.id) ?? 0) * 100) / 100,
      net:
        Math.round(((paid.get(m.id) ?? 0) - (share.get(m.id) ?? 0)) * 100) /
        100,
      count: count.get(m.id) ?? 0,
    }))
  }, [expenses, members])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      setError('Enter a name.')
      return
    }
    const added = addMember(name)
    if (!added) {
      setError('A member with that name already exists.')
      return
    }
    setNewName('')
    setError(null)
    setOpen(false)
  }

  const handleDelete = (id: string, name: string) => {
    const used = expenses.some(
      (e) => e.paidBy === id || e.splitAmong.includes(id),
    )
    const msg = used
      ? `Delete "${name}"? They appear in existing expenses — those expenses will also be removed.`
      : `Delete "${name}"?`
    if (confirm(msg)) removeMember(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            People who share expenses with you.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <Plus className="h-4 w-4" />
          Add member
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-neutral-200 px-5 py-3 text-sm font-medium dark:border-neutral-800">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </div>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {stats.map((s) => {
            const initial = s.member.name.trim().charAt(0).toUpperCase() || '?'
            const isEditing = editingId === s.member.id
            return (
              <li
                key={s.member.id}
                className="flex flex-wrap items-center gap-4 px-5 py-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditing) setDetailMember(s.member)
                  }}
                  className="flex flex-1 items-center gap-3 text-left hover:opacity-80"
                  aria-label={`Open details for ${s.member.name}`}
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {initial}
                  </span>
                  {isEditing ? (
                    <></>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1 font-medium">
                        {s.member.name}
                        <ChevronRight className="h-4 w-4 text-neutral-400" />
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {s.count} {s.count === 1 ? 'expense' : 'expenses'} · view breakdown
                      </div>
                    </div>
                  )}
                </button>
                {isEditing && (
                    <div className="flex items-center gap-2">
                      <input
                        value={editingName}
                        onChange={(ev) => setEditingName(ev.target.value)}
                        autoFocus
                        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          renameMember(s.member.id, editingName)
                          setEditingId(null)
                        }}
                        aria-label="Save"
                        className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel"
                        className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-right text-sm tabular-nums sm:grid-cols-4 sm:gap-6">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Paid
                    </div>
                    <div>{formatINR(s.paid)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Share
                    </div>
                    <div>{formatINR(s.share)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Pending
                    </div>
                    <div
                      className={
                        s.pending > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-neutral-400 dark:text-neutral-500'
                      }
                    >
                      {formatINR(s.pending)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Net
                    </div>
                    <div
                      className={`font-semibold ${
                        s.net > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : s.net < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : ''
                      }`}
                    >
                      {s.net > 0 ? '+' : ''}
                      {formatINR(s.net)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(s.member.id)
                        setEditingName(s.member.name)
                      }}
                      aria-label="Rename"
                      className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(s.member.id, s.member.name)}
                    aria-label="Delete"
                    className="rounded-md p-2 text-neutral-500 hover:bg-rose-50 hover:text-rose-600 dark:text-neutral-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <MemberDetailsModal
        member={detailMember}
        onClose={() => setDetailMember(null)}
      />

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setError(null)
        }}
        title="Add member"
        description="People in this list appear in the paid-by and split-among pickers."
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Name
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              placeholder="e.g. Priya"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Add member
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
