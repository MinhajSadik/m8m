import { NextResponse } from "next/server"
import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Node, Edge } from "@xyflow/react"
import type { NodeData } from "@/types"

interface ExecutionContext {
  nodeOutputs: Map<string, unknown>
  executionId: string
}

async function executeNode(
  node: Node<NodeData>,
  inputData: unknown,
  _ctx: ExecutionContext
): Promise<{ output: unknown; error?: string }> {
  const nodeType = node.data.type
  const config = node.data.config as Record<string, unknown>

  try {
    if (nodeType === "trigger.manual") {
      return { output: inputData ?? { triggered: true, timestamp: new Date().toISOString() } }
    }

    if (nodeType === "action.http") {
      const url = config.url as string
      if (!url) throw new Error("URL is required")

      const method = (config.method as string) ?? "GET"
      const headers = config.headers ? JSON.parse(config.headers as string) : {}
      const body = config.body && method !== "GET"
        ? JSON.stringify(JSON.parse(config.body as string))
        : undefined

      const response = await fetch(url, { method, headers, body })
      const contentType = response.headers.get("content-type")
      const data = contentType?.includes("application/json")
        ? await response.json()
        : await response.text()

      return { output: { statusCode: response.status, data, headers: Object.fromEntries(response.headers) } }
    }

    if (nodeType === "action.set") {
      const assignments = config.assignments
        ? JSON.parse(config.assignments as string)
        : []
      const result: Record<string, unknown> = typeof inputData === "object" && inputData !== null
        ? { ...(inputData as Record<string, unknown>) }
        : {}
      for (const { key, value } of assignments as { key: string; value: unknown }[]) {
        if (key) result[key] = value
      }
      return { output: result }
    }

    if (nodeType === "logic.if") {
      return { output: { condition: true, input: inputData } }
    }

    return { output: inputData }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { output: null, error: msg }
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
  })
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const nodes: Node<NodeData>[] = body.nodes ?? (workflow.nodes as unknown as Node<NodeData>[])
  const edges: Edge[] = body.edges ?? (workflow.edges as unknown as Edge[])

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: id,
      status: "RUNNING",
      mode: "MANUAL",
    },
  })

  const startTime = Date.now()
  const ctx: ExecutionContext = { nodeOutputs: new Map(), executionId: execution.id }
  let overallError: string | undefined

  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  for (const node of nodes) {
    adjacency.set(node.id, [])
    inDegree.set(node.id, 0)
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0)
  const visited = new Set<string>()

  while (queue.length > 0) {
    const node = queue.shift()!
    if (visited.has(node.id)) continue
    visited.add(node.id)

    const inputEdge = edges.find((e) => e.target === node.id)
    const inputData = inputEdge ? ctx.nodeOutputs.get(inputEdge.source) : undefined

    const stepStart = Date.now()
    let stepStatus: "SUCCESS" | "ERROR" = "SUCCESS"
    let stepError: string | undefined
    let stepOutput: unknown

    try {
      const result = await executeNode(node, inputData, ctx)
      if (result.error) {
        stepStatus = "ERROR"
        stepError = result.error
        overallError = result.error
      } else {
        stepOutput = result.output
        ctx.nodeOutputs.set(node.id, result.output)
      }
    } catch (err) {
      stepStatus = "ERROR"
      stepError = err instanceof Error ? err.message : String(err)
      overallError = stepError
    }

    const stepEnd = Date.now()
    await prisma.executionStep.create({
      data: {
        executionId: execution.id,
        nodeId: node.id,
        nodeName: node.data.label,
        nodeType: node.data.type,
        status: stepStatus,
        startedAt: new Date(stepStart),
        finishedAt: new Date(stepEnd),
        durationMs: stepEnd - stepStart,
        inputData: inputData ? (inputData as object) : undefined,
        outputData: stepOutput ? (stepOutput as object) : undefined,
        error: stepError,
      },
    })

    if (stepStatus === "ERROR") break

    const nextNodes = (adjacency.get(node.id) ?? [])
      .map((targetId) => nodes.find((n) => n.id === targetId))
      .filter((n): n is Node<NodeData> => !!n)
    queue.push(...nextNodes)
  }

  const endTime = Date.now()
  const finalStatus = overallError ? "ERROR" : "SUCCESS"

  const updated = await prisma.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: finalStatus,
      finishedAt: new Date(endTime),
      durationMs: endTime - startTime,
      error: overallError,
    },
  })

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    durationMs: updated.durationMs,
    error: updated.error,
  })
}
