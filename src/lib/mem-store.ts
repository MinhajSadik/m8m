type Workflow = {
  id: string
  name: string
  description: string | null
  active: boolean
  nodes: unknown[]
  edges: unknown[]
  settings: Record<string, unknown>
  tags: string[]
  userId: string
  createdAt: Date
  updatedAt: Date
}

type Execution = {
  id: string
  workflowId: string
  status: string
  mode: string
  startedAt: Date
  finishedAt: Date | null
  durationMs: number | null
  error: string | null
  steps: ExecutionStep[]
}

type ExecutionStep = {
  id: string
  executionId: string
  nodeId: string
  nodeName: string
  nodeType: string
  status: string
  startedAt: Date
  finishedAt: Date | null
  durationMs: number | null
  inputData: unknown
  outputData: unknown
  error: string | null
}

type Credential = {
  id: string
  name: string
  type: string
  data: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const workflows = new Map<string, Workflow>()
const executions = new Map<string, Execution>()
const credentials = new Map<string, Credential>()

export const memStore = {
  workflow: {
    findMany(userId: string): Workflow[] {
      return [...workflows.values()]
        .filter((w) => w.userId === userId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    },
    findFirst(id: string, userId: string): Workflow | null {
      const w = workflows.get(id)
      if (!w || w.userId !== userId) return null
      return w
    },
    create(data: Omit<Workflow, "id" | "createdAt" | "updatedAt" | "active"> & { active?: boolean; id?: string }): Workflow {
      const now = new Date()
      const w: Workflow = {
        id: data.id ?? genId(),
        active: data.active ?? false,
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      workflows.set(w.id, w)
      return w
    },
    update(id: string, data: Partial<Omit<Workflow, "id" | "createdAt">>): Workflow | null {
      const w = workflows.get(id)
      if (!w) return null
      const updated = { ...w, ...data, updatedAt: new Date() }
      workflows.set(id, updated)
      return updated
    },
    delete(id: string): boolean {
      return workflows.delete(id)
    },
  },
  execution: {
    findMany(workflowId: string): Execution[] {
      return [...executions.values()]
        .filter((e) => e.workflowId === workflowId)
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 50)
    },
    findByWorkflow(workflowId: string): Execution[] {
      return this.findMany(workflowId)
    },
    create(workflowId: string, mode: string): Execution {
      const e: Execution = {
        id: genId(),
        workflowId,
        status: "RUNNING",
        mode,
        startedAt: new Date(),
        finishedAt: null,
        durationMs: null,
        error: null,
        steps: [],
      }
      executions.set(e.id, e)
      return e
    },
    update(id: string, data: Partial<Omit<Execution, "id" | "steps">>): Execution | null {
      const e = executions.get(id)
      if (!e) return null
      const updated = { ...e, ...data }
      executions.set(id, updated)
      return updated
    },
    addStep(executionId: string, step: Omit<ExecutionStep, "id" | "executionId">): ExecutionStep {
      const e = executions.get(executionId)
      const s: ExecutionStep = { id: genId(), executionId, ...step }
      if (e) e.steps.push(s)
      return s
    },
  },
  credential: {
    findMany(userId: string): Credential[] {
      return [...credentials.values()]
        .filter((c) => c.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    create(data: Omit<Credential, "id" | "createdAt" | "updatedAt">): Credential {
      const now = new Date()
      const c: Credential = { id: genId(), createdAt: now, updatedAt: now, ...data }
      credentials.set(c.id, c)
      return c
    },
    findFirst(id: string, userId: string): Credential | null {
      const c = credentials.get(id)
      if (!c || c.userId !== userId) return null
      return c
    },
    delete(id: string): boolean {
      return credentials.delete(id)
    },
  },
}
