"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Users,
  Workflow,
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatRelativeTime } from "@/lib/utils"

type StudentWorkflow = {
  id: string
  name: string
  active: boolean
  nodeCount: number
  edgeCount: number
  executionCount: number
  updatedAt: string
}

type Student = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  workflowCount: number
  workflows: StudentWorkflow[]
}

export function AdminClient({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  )

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalWorkflows = students.reduce((sum, s) => sum + s.workflowCount, 0)
  const studentCount = students.filter((s) => s.role === "student").length

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Admin Dashboard</h1>
          <p className="text-xs text-zinc-500">
            {studentCount} students &middot; {totalWorkflows} workflows
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            className="pl-8 w-56 h-8 text-xs"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Users className="w-8 h-8 text-zinc-600" />
            <p className="text-zinc-500 text-sm">No students found</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {filtered.map((student) => (
              <div key={student.id}>
                <button
                  onClick={() => toggleExpand(student.id)}
                  className="w-full flex items-center gap-3 px-6 py-3 hover:bg-zinc-900/50 transition-colors text-left"
                >
                  {expanded.has(student.id) ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200 truncate">
                        {student.name || "Unnamed"}
                      </span>
                      {student.role === "admin" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{student.email}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-medium text-zinc-300">{student.workflowCount}</p>
                      <p className="text-[10px] text-zinc-600">workflows</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-600">joined</p>
                      <p className="text-xs text-zinc-500">{formatRelativeTime(student.createdAt)}</p>
                    </div>
                  </div>
                </button>

                {expanded.has(student.id) && (
                  <div className="px-6 pb-3 pl-14">
                    {student.workflows.length === 0 ? (
                      <p className="text-xs text-zinc-600 py-2">No workflows created yet</p>
                    ) : (
                      <div className="rounded-lg border border-zinc-800/60 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-zinc-900/50 border-b border-zinc-800/40">
                              <th className="text-left px-3 py-2 text-zinc-500 font-medium">Workflow</th>
                              <th className="text-left px-3 py-2 text-zinc-500 font-medium">Nodes</th>
                              <th className="text-left px-3 py-2 text-zinc-500 font-medium">Connections</th>
                              <th className="text-left px-3 py-2 text-zinc-500 font-medium">Executions</th>
                              <th className="text-left px-3 py-2 text-zinc-500 font-medium">Updated</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {student.workflows.map((wf) => (
                              <tr key={wf.id} className="border-b border-zinc-800/30 last:border-0">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1.5">
                                    <Workflow className="w-3 h-3 text-violet-400" />
                                    <span className="text-zinc-300">{wf.name}</span>
                                    {wf.active && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-zinc-500">{wf.nodeCount}</td>
                                <td className="px-3 py-2 text-zinc-500">{wf.edgeCount}</td>
                                <td className="px-3 py-2 text-zinc-500">{wf.executionCount}</td>
                                <td className="px-3 py-2 text-zinc-500">
                                  {formatRelativeTime(wf.updatedAt)}
                                </td>
                                <td className="px-3 py-2">
                                  <Link
                                    href={`/admin/workflow/${wf.id}`}
                                    className="text-violet-400 hover:text-violet-300 transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
