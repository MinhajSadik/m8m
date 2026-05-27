import { NextResponse } from "next/server"
import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Node, Edge } from "@xyflow/react"
import type { NodeData } from "@/types"

interface ExecutionContext {
  nodeOutputs: Map<string, unknown>
  executionId: string
}

function randomId() {
  return Math.random().toString(36).slice(2, 10)
}

function mockTimestamp() {
  return new Date().toISOString()
}

async function executeNode(
  node: Node<NodeData>,
  inputData: unknown,
  _ctx: ExecutionContext
): Promise<{ output: unknown; error?: string }> {
  const nodeType = node.data.type
  const config = (node.data.config ?? {}) as Record<string, unknown>

  try {
    switch (nodeType) {
      // ── Triggers ──────────────────────────────────────────────────────────

      case "trigger.manual":
        return {
          output: {
            triggered: true,
            timestamp: mockTimestamp(),
            mode: "manual",
            data: inputData ?? {},
          },
        }

      case "trigger.webhook":
        return {
          output: {
            method: config.method ?? "POST",
            path: config.path ?? `/webhook/${randomId()}`,
            headers: {
              "content-type": "application/json",
              "user-agent": "m8m-simulator/1.0",
              "x-forwarded-for": "203.0.113.42",
            },
            body: {
              event: "test_event",
              id: randomId(),
              data: { name: "Sample Payload", value: 42, active: true },
              timestamp: mockTimestamp(),
            },
            query: {},
          },
        }

      case "trigger.schedule":
        return {
          output: {
            scheduledTime: mockTimestamp(),
            cronExpression: config.cronExpression ?? "0 * * * *",
            timezone: config.timezone ?? "UTC",
            executionCount: 1,
          },
        }

      // ── Core Actions ──────────────────────────────────────────────────────

      case "action.http": {
        const url = (config.url as string | undefined) ?? ""
        const method = (config.method as string | undefined) ?? "GET"

        if (url && url.startsWith("http") && !url.includes("example.com") && !url.includes("placeholder")) {
          try {
            const headers = config.headers ? JSON.parse(config.headers as string) : {}
            const bodyStr =
              config.body && method !== "GET"
                ? JSON.stringify(JSON.parse(config.body as string))
                : undefined
            const response = await fetch(url, { method, headers, body: bodyStr })
            const contentType = response.headers.get("content-type") ?? ""
            const data = contentType.includes("application/json")
              ? await response.json()
              : await response.text()
            return {
              output: {
                statusCode: response.status,
                statusText: response.statusText,
                data,
                headers: Object.fromEntries(response.headers),
                url,
                method,
              },
            }
          } catch (httpErr) {
            // Fall through to simulated response on network error
          }
        }

        return {
          output: {
            statusCode: 200,
            statusText: "OK",
            data: {
              success: true,
              message: "Simulated HTTP response",
              url: url || "https://api.example.com/data",
              method,
              items: [
                { id: 1, name: "Item A", value: 100 },
                { id: 2, name: "Item B", value: 200 },
                { id: 3, name: "Item C", value: 300 },
              ],
            },
            headers: { "content-type": "application/json" },
            url: url || "https://api.example.com/data",
            method,
          },
        }
      }

      case "action.code": {
        const code = (config.code as string | undefined) ?? "return $input;"
        try {
          const fn = new Function("$input", code.replace(/return\s+\$input\.all\(\)/g, "return $input"))
          const result = fn(inputData)
          return { output: result ?? inputData }
        } catch (codeErr) {
          return {
            output: null,
            error: codeErr instanceof Error ? codeErr.message : String(codeErr),
          }
        }
      }

      case "action.set": {
        const assignments = config.assignments
          ? (typeof config.assignments === "string"
              ? JSON.parse(config.assignments)
              : config.assignments)
          : []
        const result: Record<string, unknown> =
          typeof inputData === "object" && inputData !== null
            ? { ...(inputData as Record<string, unknown>) }
            : {}
        for (const { key, value } of assignments as { key: string; value: unknown }[]) {
          if (key) result[key] = value
        }
        return { output: result }
      }

      // ── Logic ─────────────────────────────────────────────────────────────

      case "logic.if": {
        const conditions = config.conditions
          ? (typeof config.conditions === "string"
              ? JSON.parse(config.conditions)
              : config.conditions)
          : []
        const passed = conditions.length === 0 ? true : true // simulate always-true for practice
        return {
          output: {
            condition: passed,
            branches: [passed ? "true" : "false"],
            conditionCount: conditions.length,
            input: inputData,
          },
        }
      }

      case "logic.switch": {
        return {
          output: {
            branch: 0,
            matchedRule: "rule_0",
            value: config.value ?? null,
            input: inputData,
          },
        }
      }

      case "logic.merge": {
        const mode = (config.mode as string | undefined) ?? "append"
        const arr = Array.isArray(inputData) ? inputData : [inputData]
        return { output: { merged: true, mode, items: arr, count: arr.length } }
      }

      case "logic.loop": {
        const batchSize = (config.batchSize as number | undefined) ?? 1
        const items = Array.isArray(inputData) ? inputData : [inputData]
        return {
          output: {
            items,
            count: items.length,
            batchSize,
            currentBatch: items.slice(0, batchSize),
            done: true,
          },
        }
      }

      // ── Integrations ──────────────────────────────────────────────────────

      case "integration.slack": {
        const operation = (config.operation as string | undefined) ?? "sendMessage"
        const channel = (config.channel as string | undefined) ?? "#general"
        const text = (config.text as string | undefined) ?? "Hello from m8m!"

        const ops: Record<string, unknown> = {
          sendMessage: {
            ok: true,
            ts: `${Date.now()}.000000`,
            channel,
            message: { text, type: "message", ts: `${Date.now()}.000000` },
          },
          sendFile: { ok: true, file: { id: randomId(), name: "file.txt", title: "Uploaded file" } },
          getUser: { ok: true, user: { id: "U" + randomId(), name: "john.doe", real_name: "John Doe", email: "john@example.com" } },
          createChannel: { ok: true, channel: { id: "C" + randomId(), name: channel.replace("#", ""), is_member: true } },
        }
        return { output: ops[operation] ?? ops.sendMessage }
      }

      case "integration.discord": {
        const content = (config.content as string | undefined) ?? "Hello from m8m!"
        return {
          output: {
            id: randomId(),
            type: 0,
            content,
            author: { id: randomId(), username: "m8m-bot", discriminator: "0" },
            timestamp: mockTimestamp(),
            channel_id: randomId(),
          },
        }
      }

      case "integration.email": {
        const to = (config.to as string | undefined) ?? "recipient@example.com"
        const subject = (config.subject as string | undefined) ?? "Email from m8m"
        return {
          output: {
            messageId: `<${randomId()}.${Date.now()}@m8m.local>`,
            to: [to],
            subject,
            accepted: [to],
            rejected: [],
            response: "250 2.0.0 OK  - simulated",
            envelope: { from: "noreply@m8m.local", to: [to] },
          },
        }
      }

      case "integration.github": {
        const operation = (config.operation as string | undefined) ?? "createIssue"
        const owner = (config.owner as string | undefined) ?? "owner"
        const repo = (config.repo as string | undefined) ?? "repository"
        const base = `https://github.com/${owner}/${repo}`

        const ops: Record<string, unknown> = {
          createIssue: { id: 12345, number: 42, title: "Simulated Issue", state: "open", html_url: `${base}/issues/42`, created_at: mockTimestamp() },
          getIssue: { id: 12345, number: 42, title: "Simulated Issue", state: "open", body: "Issue body content", labels: [], html_url: `${base}/issues/42` },
          createPRComment: { id: 56789, body: "Comment from m8m", html_url: `${base}/pull/1#issuecomment-56789`, created_at: mockTimestamp() },
          listRepos: [{ name: repo, full_name: `${owner}/${repo}`, private: false, stargazers_count: 42, html_url: base }],
          getFileContent: { name: "README.md", path: "README.md", content: Buffer.from("# Project\n\nContent here").toString("base64"), encoding: "base64", html_url: `${base}/blob/main/README.md` },
        }
        return { output: ops[operation] ?? { ok: true } }
      }

      case "integration.notion": {
        const operation = (config.operation as string | undefined) ?? "createPage"
        const pageId = randomId()
        const base = { object: "page", id: pageId, created_time: mockTimestamp(), last_edited_time: mockTimestamp(), url: `https://notion.so/${pageId}` }

        const ops: Record<string, unknown> = {
          createPage: { ...base, properties: { title: { title: [{ text: { content: "New Page" } }] } } },
          updatePage: { ...base, archived: false },
          getPage: { ...base, properties: { title: { title: [{ text: { content: "Existing Page" } }] } } },
          queryDatabase: { object: "list", results: [{ ...base, properties: {} }], has_more: false },
        }
        return { output: ops[operation] ?? base }
      }

      case "integration.openai": {
        const operation = (config.operation as string | undefined) ?? "chat"

        if (operation === "chat" || operation === "completion") {
          return {
            output: {
              id: "chatcmpl-" + randomId(),
              object: "chat.completion",
              model: "gpt-4o",
              choices: [{
                index: 0,
                message: {
                  role: "assistant",
                  content: "This is a simulated AI response. In production with a real OpenAI API key, this would generate an actual response based on your prompt.",
                },
                finish_reason: "stop",
              }],
              usage: { prompt_tokens: 25, completion_tokens: 40, total_tokens: 65 },
            },
          }
        }

        if (operation === "embedding") {
          return {
            output: {
              object: "list",
              model: "text-embedding-3-small",
              data: [{ object: "embedding", index: 0, embedding: Array.from({ length: 8 }, () => Math.random() - 0.5) }],
              usage: { prompt_tokens: 8, total_tokens: 8 },
            },
          }
        }

        if (operation === "image") {
          return {
            output: {
              created: Math.floor(Date.now() / 1000),
              data: [{ url: "https://placehold.co/1024x1024?text=Simulated+Image", revised_prompt: "A simulated image" }],
            },
          }
        }

        return { output: { result: "Simulated OpenAI response", operation } }
      }

      default:
        return {
          output: {
            processed: true,
            nodeType,
            timestamp: mockTimestamp(),
            input: inputData,
          },
        }
    }
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

  let workflow
  try {
    workflow = await prisma.workflow.findFirst({
      where: { id, userId },
    })
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
  }
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const nodes: Node<NodeData>[] = body.nodes ?? (workflow.nodes as unknown as Node<NodeData>[])
  const edges: Edge[] = body.edges ?? (workflow.edges as unknown as Edge[])

  let execution: { id: string }
  try {
    execution = await prisma.workflowExecution.create({
      data: { workflowId: id, status: "RUNNING", mode: "MANUAL" },
    })
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
  }

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
    try {
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
    } catch { /* non-fatal: step recording failed */ }

    if (stepStatus === "ERROR") break

    const nextNodes = (adjacency.get(node.id) ?? [])
      .map((targetId) => nodes.find((n) => n.id === targetId))
      .filter((n): n is Node<NodeData> => !!n)
    queue.push(...nextNodes)
  }

  const endTime = Date.now()
  const finalStatus = overallError ? "ERROR" : "SUCCESS"

  try {
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
  } catch {
    return NextResponse.json({
      id: execution.id,
      status: finalStatus,
      durationMs: endTime - startTime,
      error: overallError ?? null,
    })
  }
}
