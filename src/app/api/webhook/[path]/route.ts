import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { memStore } from "@/lib/mem-store"
import type { Node, Edge } from "@xyflow/react"
import type { NodeData } from "@/types"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string }> }
) {
  return handleWebhook(request, await params, "GET")
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string }> }
) {
  return handleWebhook(request, await params, "POST")
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string }> }
) {
  return handleWebhook(request, await params, "PUT")
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ path: string }> }
) {
  return handleWebhook(request, await params, "PATCH")
}

async function handleWebhook(
  request: Request,
  { path }: { path: string },
  method: string
) {
  let workflow: { id: string; nodes: unknown; edges: unknown } | null = null

  try {
    const webhook = await prisma.webhookPath.findUnique({
      where: { path, active: true },
      include: { workflow: true },
    })
    if (webhook) workflow = webhook.workflow
  } catch { /* DB unavailable */ }

  if (!workflow) {
    return NextResponse.json({ error: "Webhook not found or inactive" }, { status: 404 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  let body: unknown = null
  if (method !== "GET") {
    if (contentType.includes("application/json")) {
      body = await request.json().catch(() => null)
    } else {
      body = await request.text().catch(() => null)
    }
  }

  const triggerData = JSON.parse(JSON.stringify({
    method,
    headers: Object.fromEntries(request.headers),
    body: body as string | Record<string, unknown> | null,
    query: Object.fromEntries(new URL(request.url).searchParams),
    timestamp: new Date().toISOString(),
  }))

  let executionId: string
  let useMemFallback = false
  try {
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        status: "RUNNING",
        mode: "WEBHOOK",
        triggerData,
      },
    })
    executionId = execution.id
  } catch {
    useMemFallback = true
    const execution = memStore.execution.create(workflow.id, "WEBHOOK")
    executionId = execution.id
  }

  const nodes = workflow.nodes as unknown as Node<NodeData>[]
  const edges = workflow.edges as unknown as Edge[]

  const startTime = Date.now()
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
  const outputs = new Map<string, unknown>()

  while (queue.length > 0) {
    const node = queue.shift()!
    const inputEdge = edges.find((e) => e.target === node.id)
    const inputData = inputEdge ? outputs.get(inputEdge.source) : triggerData

    const stepStart = Date.now()
    outputs.set(node.id, inputData)

    try {
      if (!useMemFallback) {
        await prisma.executionStep.create({
          data: {
            executionId,
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.type,
            status: "SUCCESS",
            startedAt: new Date(stepStart),
            finishedAt: new Date(),
            durationMs: Date.now() - stepStart,
            inputData: inputData as object,
            outputData: inputData as object,
          },
        })
      } else {
        memStore.execution.addStep(executionId, {
          nodeId: node.id,
          nodeName: node.data.label,
          nodeType: node.data.type,
          status: "SUCCESS",
          startedAt: new Date(stepStart),
          finishedAt: new Date(),
          durationMs: Date.now() - stepStart,
          inputData,
          outputData: inputData,
          error: null,
        })
      }
    } catch { /* non-fatal */ }

    const nextNodes = (adjacency.get(node.id) ?? [])
      .map((targetId) => nodes.find((n) => n.id === targetId))
      .filter((n): n is Node<NodeData> => !!n)
    queue.push(...nextNodes)
  }

  const endTime = Date.now()

  try {
    if (!useMemFallback) {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: overallError ? "ERROR" : "SUCCESS",
          finishedAt: new Date(endTime),
          durationMs: endTime - startTime,
          error: overallError,
        },
      })
    } else {
      memStore.execution.update(executionId, {
        status: overallError ? "ERROR" : "SUCCESS",
        finishedAt: new Date(endTime),
        durationMs: endTime - startTime,
        error: overallError ?? null,
      })
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ received: true, executionId })
}
