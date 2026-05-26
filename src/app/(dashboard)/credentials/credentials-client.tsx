"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, KeyRound, Trash2, Eye, EyeOff, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { formatRelativeTime } from "@/lib/utils"

const CREDENTIAL_TYPES = [
  { value: "api_key", label: "API Key" },
  { value: "oauth2", label: "OAuth2" },
  { value: "basic_auth", label: "Basic Auth" },
  { value: "smtp", label: "SMTP" },
  { value: "postgres", label: "PostgreSQL" },
  { value: "github", label: "GitHub" },
  { value: "slack", label: "Slack" },
  { value: "openai", label: "OpenAI" },
  { value: "stripe", label: "Stripe" },
  { value: "telegram", label: "Telegram" },
  { value: "google", label: "Google" },
]

type Credential = {
  id: string
  name: string
  type: string
  createdAt: string
  updatedAt: string
}

export function CredentialsClient({ credentials: initial }: { credentials: Credential[] }) {
  const [credentials, setCredentials] = useState(initial)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: "", type: "api_key", data: "" })
  const [showData, setShowData] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.data) {
      toast.error("Name and data are required")
      return
    }
    setSaving(true)
    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      toast.error("Failed to create credential")
      return
    }
    const data = await res.json()
    setCredentials((prev) => [data, ...prev])
    setCreating(false)
    setForm({ name: "", type: "api_key", data: "" })
    toast.success("Credential saved")
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete credential "${name}"?`)) return
    const res = await fetch(`/api/credentials/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete")
      return
    }
    setCredentials((prev) => prev.filter((c) => c.id !== id))
    toast.success("Credential deleted")
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Credentials</h1>
          <p className="text-xs text-zinc-500">Securely stored API keys and auth tokens</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" />
          Add credential
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {credentials.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-800/60 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-zinc-400 font-medium">No credentials yet</p>
              <p className="text-zinc-600 text-sm mt-1">Add credentials to use in your workflows</p>
            </div>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" />
              Add credential
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 group hover:border-zinc-700 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{cred.name}</p>
                  <p className="text-xs text-zinc-500">
                    {CREDENTIAL_TYPES.find((t) => t.value === cred.type)?.label ?? cred.type} · Updated {formatRelativeTime(cred.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(cred.id, cred.name)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credential</DialogTitle>
            <DialogDescription>
              Credentials are encrypted at rest and only accessible in your workflows.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="My Slack Token"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {CREDENTIAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Credential Data (JSON or string)</Label>
              <div className="relative">
                <Input
                  type={showData ? "text" : "password"}
                  value={form.data}
                  onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                  placeholder='{"apiKey": "sk-..."}'
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowData((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save credential"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
