"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input, Label, Textarea } from "@/components/ui/input"
import { Save, User, Bell, Palette, Shield, Globe } from "lucide-react"
import { useSession } from "next-auth/react"

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState("profile")
  const [name, setName] = useState(session?.user?.name ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    setSaving(false)
    if (!res.ok) {
      toast.error("Failed to save profile")
      return
    }
    toast.success("Profile updated")
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center px-6 py-4 border-b border-zinc-800/60">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
          <p className="text-xs text-zinc-500">Manage your account and preferences</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-52 flex-shrink-0 border-r border-zinc-800/60 p-3 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                tab === id
                  ? "bg-violet-600/15 text-violet-300"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-8">
          {tab === "profile" && (
            <div className="max-w-md space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-200 mb-4">Profile Information</h2>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Display Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Email</Label>
                    <Input
                      value={session?.user?.email ?? ""}
                      disabled
                      className="opacity-50"
                    />
                    <p className="text-[10px] text-zinc-600">Email cannot be changed here</p>
                  </div>
                  <Button type="submit" size="sm" disabled={saving}>
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="max-w-md">
              <h2 className="text-sm font-semibold text-zinc-200 mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { label: "Execution failures", description: "Get notified when a workflow fails" },
                  { label: "Execution success", description: "Get notified on successful runs" },
                  { label: "Security alerts", description: "Account and security notifications" },
                ].map(({ label, description }) => (
                  <div key={label} className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-900/40">
                    <div>
                      <p className="text-sm text-zinc-300">{label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
                    </div>
                    <button className="relative w-9 h-5 rounded-full bg-zinc-800 border border-zinc-700 transition-colors">
                      <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-zinc-600 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "appearance" && (
            <div className="max-w-md">
              <h2 className="text-sm font-semibold text-zinc-200 mb-4">Appearance</h2>
              <div className="flex gap-3">
                {["Dark", "Light", "System"].map((theme) => (
                  <button
                    key={theme}
                    className={`flex-1 py-3 rounded-lg border text-sm transition-all ${
                      theme === "Dark"
                        ? "border-violet-500/50 bg-violet-600/10 text-violet-300"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="max-w-md">
              <h2 className="text-sm font-semibold text-zinc-200 mb-4">Security</h2>
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40">
                  <p className="text-sm text-zinc-300 font-medium">Change Password</p>
                  <p className="text-xs text-zinc-500 mt-1 mb-3">Update your password to keep your account secure</p>
                  <Button size="sm" variant="outline">Change password</Button>
                </div>
                <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40">
                  <p className="text-sm text-zinc-300 font-medium">Active Sessions</p>
                  <p className="text-xs text-zinc-500 mt-1">Manage devices that are signed in to your account</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
