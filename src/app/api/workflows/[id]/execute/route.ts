import { NextResponse } from "next/server"
import { ensureUserId } from "@/lib/auth"
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

      case "integration.postgres": {
        const operation = (config.operation as string | undefined) ?? "executeQuery"
        const ops: Record<string, unknown> = {
          executeQuery: { rows: [{ id: 1, name: "Alice", email: "alice@demo.com" }, { id: 2, name: "Bob", email: "bob@demo.com" }], rowCount: 2, command: "SELECT" },
          insert: { rowCount: 1, command: "INSERT", returning: [{ id: 3 }] },
          update: { rowCount: 1, command: "UPDATE" },
          delete: { rowCount: 1, command: "DELETE" },
          select: { rows: [{ id: 1, name: "Record 1", created_at: mockTimestamp() }], rowCount: 1, command: "SELECT" },
        }
        return { output: ops[operation] ?? ops.executeQuery }
      }

      case "integration.sheets": {
        const operation = (config.operation as string | undefined) ?? "appendRow"
        const ops: Record<string, unknown> = {
          appendRow: { spreadsheetId: config.spreadsheetId ?? "abc123", updatedRange: "Sheet1!A1:C1", updatedRows: 1, updatedCells: 3 },
          readRows: { values: [["Name", "Email", "Score"], ["Alice", "alice@demo.com", "95"], ["Bob", "bob@demo.com", "87"]], range: "Sheet1!A1:C3" },
          updateRow: { updatedRange: "Sheet1!A2:C2", updatedRows: 1, updatedCells: 3 },
          clearSheet: { clearedRange: "Sheet1!A1:Z1000", spreadsheetId: config.spreadsheetId ?? "abc123" },
        }
        return { output: ops[operation] ?? ops.appendRow }
      }

      case "integration.telegram": {
        return {
          output: {
            ok: true,
            result: {
              message_id: Math.floor(Math.random() * 10000),
              from: { id: 123456789, is_bot: true, first_name: "m8m Bot" },
              chat: { id: config.chatId ?? 123456789, type: "private" },
              date: Math.floor(Date.now() / 1000),
              text: config.text ?? "Hello from m8m!",
            },
          },
        }
      }

      case "integration.stripe": {
        const operation = (config.operation as string | undefined) ?? "createPaymentIntent"
        const ops: Record<string, unknown> = {
          createPaymentIntent: { id: "pi_" + randomId(), object: "payment_intent", amount: 2000, currency: "usd", status: "requires_payment_method", client_secret: "pi_" + randomId() + "_secret_" + randomId() },
          getCustomer: { id: "cus_" + randomId(), object: "customer", name: "John Doe", email: "john@example.com", created: Math.floor(Date.now() / 1000) },
          createCustomer: { id: "cus_" + randomId(), object: "customer", name: "New Customer", email: "new@example.com", created: Math.floor(Date.now() / 1000) },
          listCharges: { data: [{ id: "ch_" + randomId(), amount: 5000, currency: "usd", status: "succeeded", created: Math.floor(Date.now() / 1000) }], has_more: false },
          getSubscription: { id: "sub_" + randomId(), object: "subscription", status: "active", current_period_end: Math.floor(Date.now() / 1000) + 2592000 },
        }
        return { output: ops[operation] ?? ops.createPaymentIntent }
      }

      case "integration.whatsapp": {
        const operation = (config.operation as string | undefined) ?? "sendText"
        const phone = (config.phoneNumber as string | undefined) ?? "+1234567890"
        const message = (config.message as string | undefined) ?? "Hello from m8m!"
        const msgId = "wamid." + randomId() + randomId()

        const ops: Record<string, unknown> = {
          sendText: { messaging_product: "whatsapp", contacts: [{ input: phone, wa_id: phone.replace("+", "") }], messages: [{ id: msgId, message_status: "sent" }] },
          sendTemplate: { messaging_product: "whatsapp", contacts: [{ input: phone, wa_id: phone.replace("+", "") }], messages: [{ id: msgId, message_status: "sent" }], template: { name: "hello_world", language: "en" } },
          sendImage: { messaging_product: "whatsapp", contacts: [{ input: phone, wa_id: phone.replace("+", "") }], messages: [{ id: msgId, message_status: "sent" }], type: "image" },
          sendDocument: { messaging_product: "whatsapp", contacts: [{ input: phone, wa_id: phone.replace("+", "") }], messages: [{ id: msgId, message_status: "sent" }], type: "document" },
          markRead: { messaging_product: "whatsapp", status: "read", message_id: msgId },
        }
        return { output: { ...ops[operation] as object, phone, message, timestamp: mockTimestamp() } }
      }

      case "integration.facebook": {
        const operation = (config.operation as string | undefined) ?? "createPost"
        const pageId = (config.pageId as string | undefined) ?? "page_" + randomId()
        const message = (config.message as string | undefined) ?? "Posted from m8m!"
        const postId = pageId + "_" + randomId()

        const ops: Record<string, unknown> = {
          createPost: { id: postId, message, created_time: mockTimestamp(), permalink_url: `https://facebook.com/${postId}` },
          getPagePosts: { data: [{ id: postId, message: "Latest post", created_time: mockTimestamp(), likes: { summary: { total_count: 42 } } }, { id: pageId + "_" + randomId(), message: "Earlier post", created_time: mockTimestamp() }], paging: { next: null } },
          getPostInsights: { data: [{ name: "post_impressions", values: [{ value: 1250 }] }, { name: "post_engagements", values: [{ value: 89 }] }, { name: "post_reactions_like_total", values: [{ value: 42 }] }] },
          sendMessage: { recipient_id: randomId(), message_id: "m_" + randomId(), timestamp: mockTimestamp() },
          getPageInfo: { id: pageId, name: "My Business Page", fan_count: 15420, followers_count: 15380, category: "Business", link: `https://facebook.com/${pageId}` },
        }
        return { output: ops[operation] ?? ops.createPost }
      }

      case "integration.youtube": {
        const operation = (config.operation as string | undefined) ?? "getVideo"
        const videoId = (config.videoId as string | undefined) ?? "dQw4w9WgXcQ"

        const ops: Record<string, unknown> = {
          uploadVideo: { id: randomId(), snippet: { title: "My Video", publishedAt: mockTimestamp(), channelTitle: "My Channel" }, status: { uploadStatus: "uploaded", privacyStatus: "private" } },
          getVideo: { id: videoId, snippet: { title: "Sample Video", description: "A great video", publishedAt: mockTimestamp(), channelTitle: "Sample Channel", thumbnails: { default: { url: `https://i.ytimg.com/vi/${videoId}/default.jpg` } } }, statistics: { viewCount: "125000", likeCount: "4200", commentCount: "350" } },
          listVideos: { items: [{ id: randomId(), snippet: { title: "Video 1", publishedAt: mockTimestamp() }, statistics: { viewCount: "50000" } }, { id: randomId(), snippet: { title: "Video 2", publishedAt: mockTimestamp() }, statistics: { viewCount: "32000" } }], pageInfo: { totalResults: 2 } },
          getChannelStats: { id: config.channelId ?? "UC" + randomId(), statistics: { subscriberCount: "45000", videoCount: "120", viewCount: "5600000" }, snippet: { title: "My Channel", description: "Channel description" } },
          addComment: { id: randomId(), snippet: { textDisplay: "Great video!", authorDisplayName: "m8m Bot", publishedAt: mockTimestamp(), videoId } },
          searchVideos: { items: [{ id: { videoId: randomId() }, snippet: { title: "Search Result 1", channelTitle: "Creator", publishedAt: mockTimestamp() } }, { id: { videoId: randomId() }, snippet: { title: "Search Result 2", channelTitle: "Other Creator", publishedAt: mockTimestamp() } }], pageInfo: { totalResults: 2 } },
        }
        return { output: ops[operation] ?? ops.getVideo }
      }

      case "integration.twitter": {
        const operation = (config.operation as string | undefined) ?? "postTweet"
        const text = (config.text as string | undefined) ?? "Hello from m8m!"
        const tweetId = randomId() + randomId()

        const ops: Record<string, unknown> = {
          postTweet: { data: { id: tweetId, text, edit_history_tweet_ids: [tweetId], created_at: mockTimestamp() } },
          getTweet: { data: { id: config.tweetId ?? tweetId, text: "This is a sample tweet", author_id: randomId(), created_at: mockTimestamp(), public_metrics: { retweet_count: 12, reply_count: 3, like_count: 45, quote_count: 2 } } },
          searchTweets: { data: [{ id: randomId(), text: "Found tweet 1", author_id: randomId(), created_at: mockTimestamp() }, { id: randomId(), text: "Found tweet 2", author_id: randomId(), created_at: mockTimestamp() }], meta: { result_count: 2 } },
          getUserTimeline: { data: [{ id: randomId(), text: "Recent tweet 1", created_at: mockTimestamp() }, { id: randomId(), text: "Recent tweet 2", created_at: mockTimestamp() }], meta: { result_count: 2 } },
          likeTweet: { data: { liked: true } },
          retweet: { data: { retweeted: true } },
        }
        return { output: ops[operation] ?? ops.postTweet }
      }

      case "integration.instagram": {
        const operation = (config.operation as string | undefined) ?? "createMedia"
        const mediaId = randomId()

        const ops: Record<string, unknown> = {
          createMedia: { id: mediaId, status: "PUBLISHED", permalink: `https://instagram.com/p/${mediaId}`, timestamp: mockTimestamp(), media_type: "IMAGE", caption: config.caption ?? "Posted from m8m!" },
          getMedia: { id: mediaId, media_type: "IMAGE", media_url: "https://placehold.co/1080x1080", caption: "Sample media", timestamp: mockTimestamp(), like_count: 125, comments_count: 8 },
          getUserProfile: { id: randomId(), username: "m8m_user", name: "M8M User", biography: "Building with m8m", followers_count: 5420, following_count: 320, media_count: 48 },
          getInsights: { data: [{ name: "impressions", values: [{ value: 15000 }] }, { name: "reach", values: [{ value: 8500 }] }, { name: "profile_views", values: [{ value: 320 }] }] },
          getRecentMedia: { data: [{ id: randomId(), media_type: "IMAGE", caption: "Post 1", timestamp: mockTimestamp(), like_count: 89 }, { id: randomId(), media_type: "VIDEO", caption: "Post 2", timestamp: mockTimestamp(), like_count: 234 }] },
        }
        return { output: ops[operation] ?? ops.createMedia }
      }

      case "integration.linkedin": {
        const operation = (config.operation as string | undefined) ?? "createPost"
        const text = (config.text as string | undefined) ?? "Exciting update from m8m!"

        const ops: Record<string, unknown> = {
          createPost: { id: "urn:li:share:" + randomId(), activity: "urn:li:activity:" + randomId(), text: { text }, created: { time: Date.now() }, distribution: { linkedInDistributionTarget: {} } },
          getProfile: { id: randomId(), firstName: "John", lastName: "Doe", headline: "Software Engineer | AI Builder", profilePicture: { displayImage: "urn:li:digitalmediaAsset:" + randomId() }, vanityName: "johndoe" },
          getCompanyUpdates: { elements: [{ activity: "urn:li:activity:" + randomId(), commentary: "Company update 1", created: { time: Date.now() } }], paging: { total: 1 } },
          sendMessage: { id: randomId(), deliveredAt: Date.now(), subject: "Message from m8m", body: text },
        }
        return { output: ops[operation] ?? ops.createPost }
      }

      case "integration.drive": {
        const operation = (config.operation as string | undefined) ?? "listFiles"
        const fileId = (config.fileId as string | undefined) ?? randomId()

        const ops: Record<string, unknown> = {
          uploadFile: { id: fileId, name: "uploaded-file.pdf", mimeType: "application/pdf", size: "1048576", webViewLink: `https://drive.google.com/file/d/${fileId}/view`, createdTime: mockTimestamp() },
          downloadFile: { id: fileId, name: "downloaded-file.pdf", mimeType: "application/pdf", size: "1048576", content: "[binary content]" },
          listFiles: { files: [{ id: randomId(), name: "Document.docx", mimeType: "application/vnd.google-apps.document", modifiedTime: mockTimestamp() }, { id: randomId(), name: "Photo.jpg", mimeType: "image/jpeg", modifiedTime: mockTimestamp() }, { id: randomId(), name: "Data.csv", mimeType: "text/csv", modifiedTime: mockTimestamp() }], nextPageToken: null },
          createFolder: { id: randomId(), name: config.folderName ?? "New Folder", mimeType: "application/vnd.google-apps.folder", createdTime: mockTimestamp() },
          moveFile: { id: fileId, name: "moved-file.pdf", parents: [randomId()] },
          deleteFile: { deleted: true, fileId },
        }
        return { output: ops[operation] ?? ops.listFiles }
      }

      case "integration.spotify": {
        const operation = (config.operation as string | undefined) ?? "searchTracks"

        const ops: Record<string, unknown> = {
          searchTracks: { tracks: { items: [{ id: randomId(), name: "Shape of You", artists: [{ name: "Ed Sheeran" }], album: { name: "÷" }, duration_ms: 233700, popularity: 92 }, { id: randomId(), name: "Blinding Lights", artists: [{ name: "The Weeknd" }], album: { name: "After Hours" }, duration_ms: 200000, popularity: 95 }], total: 2 } },
          getPlaylist: { id: config.playlistId ?? randomId(), name: "My Playlist", description: "A great playlist", tracks: { total: 25 }, owner: { display_name: "m8m User" }, followers: { total: 150 } },
          addToPlaylist: { snapshot_id: randomId(), added: true },
          getCurrentlyPlaying: { is_playing: true, item: { name: "Bohemian Rhapsody", artists: [{ name: "Queen" }], album: { name: "A Night at the Opera" }, duration_ms: 354000 }, progress_ms: 125000 },
          getTopTracks: { items: [{ name: "Track 1", artists: [{ name: "Artist 1" }], popularity: 88 }, { name: "Track 2", artists: [{ name: "Artist 2" }], popularity: 85 }] },
        }
        return { output: ops[operation] ?? ops.searchTracks }
      }

      case "integration.tiktok": {
        const operation = (config.operation as string | undefined) ?? "getVideoInfo"

        const ops: Record<string, unknown> = {
          getVideoInfo: { data: { id: config.videoId ?? randomId(), title: "Viral TikTok Video", create_time: Math.floor(Date.now() / 1000), duration: 30, cover_image_url: "https://placehold.co/720x1280", share_count: 5400, view_count: 2500000, like_count: 450000, comment_count: 12000 } },
          getUserInfo: { data: { user: { open_id: randomId(), display_name: config.username ?? "tiktok_user", avatar_url: "https://placehold.co/100x100", follower_count: 125000, following_count: 450, likes_count: 3200000, video_count: 89 } } },
          getUserVideos: { data: { videos: [{ id: randomId(), title: "Video 1", create_time: Math.floor(Date.now() / 1000), view_count: 50000, like_count: 8900 }, { id: randomId(), title: "Video 2", create_time: Math.floor(Date.now() / 1000) - 86400, view_count: 120000, like_count: 23000 }] } },
          searchVideos: { data: { videos: [{ id: randomId(), title: "Search Result", create_time: Math.floor(Date.now() / 1000), view_count: 800000 }], cursor: 0, has_more: false } },
        }
        return { output: ops[operation] ?? ops.getVideoInfo }
      }

      case "integration.shopify": {
        const operation = (config.operation as string | undefined) ?? "listOrders"

        const ops: Record<string, unknown> = {
          createProduct: { product: { id: Math.floor(Math.random() * 9000000000) + 1000000000, title: config.productTitle ?? "New Product", status: "active", variants: [{ id: randomId(), price: "29.99", inventory_quantity: 100 }], created_at: mockTimestamp(), handle: "new-product" } },
          getProduct: { product: { id: Math.floor(Math.random() * 9000000000), title: "Sample Product", body_html: "<p>Great product</p>", vendor: "m8m Store", product_type: "Digital", status: "active", variants: [{ price: "49.99", inventory_quantity: 50 }] } },
          listOrders: { orders: [{ id: Math.floor(Math.random() * 9000000000), order_number: 1042, total_price: "79.98", financial_status: "paid", fulfillment_status: "fulfilled", created_at: mockTimestamp(), customer: { first_name: "Alice", last_name: "Smith" } }, { id: Math.floor(Math.random() * 9000000000), order_number: 1041, total_price: "29.99", financial_status: "paid", fulfillment_status: null, created_at: mockTimestamp(), customer: { first_name: "Bob", last_name: "Jones" } }] },
          createOrder: { order: { id: Math.floor(Math.random() * 9000000000), order_number: 1043, total_price: "59.99", financial_status: "pending", created_at: mockTimestamp() } },
          getCustomer: { customer: { id: Math.floor(Math.random() * 9000000000), email: "customer@example.com", first_name: "Alice", last_name: "Smith", orders_count: 5, total_spent: "399.95", created_at: mockTimestamp() } },
          updateInventory: { inventory_level: { inventory_item_id: randomId(), available: 75, updated_at: mockTimestamp() } },
        }
        return { output: ops[operation] ?? ops.listOrders }
      }

      case "integration.twilio": {
        const operation = (config.operation as string | undefined) ?? "sendSMS"
        const to = (config.to as string | undefined) ?? "+1234567890"
        const body = (config.body as string | undefined) ?? "Hello from m8m!"
        const sid = "SM" + randomId() + randomId()

        const ops: Record<string, unknown> = {
          sendSMS: { sid, account_sid: "AC" + randomId(), to, from: "+1987654321", body, status: "queued", direction: "outbound-api", date_created: mockTimestamp(), price: "-0.0075", price_unit: "USD" },
          sendWhatsApp: { sid, to: "whatsapp:" + to, from: "whatsapp:+14155238886", body, status: "queued", date_created: mockTimestamp() },
          makeCall: { sid: "CA" + randomId(), to, from: "+1987654321", status: "queued", direction: "outbound-api", duration: null, date_created: mockTimestamp() },
          getMessage: { sid, to, from: "+1987654321", body, status: "delivered", date_sent: mockTimestamp(), price: "-0.0075" },
        }
        return { output: ops[operation] ?? ops.sendSMS }
      }

      case "integration.mongodb": {
        const operation = (config.operation as string | undefined) ?? "find"
        const collection = (config.collection as string | undefined) ?? "users"

        const ops: Record<string, unknown> = {
          find: { documents: [{ _id: randomId(), name: "Alice", email: "alice@example.com", createdAt: mockTimestamp() }, { _id: randomId(), name: "Bob", email: "bob@example.com", createdAt: mockTimestamp() }], count: 2, collection },
          insertOne: { acknowledged: true, insertedId: randomId(), collection },
          updateOne: { acknowledged: true, matchedCount: 1, modifiedCount: 1, collection },
          deleteOne: { acknowledged: true, deletedCount: 1, collection },
          aggregate: { documents: [{ _id: "group1", count: 15, avgScore: 87.5 }, { _id: "group2", count: 8, avgScore: 92.1 }], collection },
        }
        return { output: ops[operation] ?? ops.find }
      }

      case "integration.s3": {
        const operation = (config.operation as string | undefined) ?? "listObjects"
        const bucket = (config.bucket as string | undefined) ?? "my-bucket"
        const key = (config.key as string | undefined) ?? "files/document.pdf"

        const ops: Record<string, unknown> = {
          putObject: { ETag: '"' + randomId() + '"', Location: `https://${bucket}.s3.amazonaws.com/${key}`, Key: key, Bucket: bucket, ContentLength: 1048576 },
          getObject: { Body: "[binary content]", ContentType: "application/pdf", ContentLength: 1048576, LastModified: mockTimestamp(), ETag: '"' + randomId() + '"' },
          listObjects: { Contents: [{ Key: "files/report.pdf", Size: 2048000, LastModified: mockTimestamp() }, { Key: "files/data.csv", Size: 512000, LastModified: mockTimestamp() }, { Key: "images/logo.png", Size: 128000, LastModified: mockTimestamp() }], Name: bucket, IsTruncated: false, KeyCount: 3 },
          deleteObject: { DeleteMarker: true, VersionId: randomId(), Key: key },
          createBucket: { Location: `http://${bucket}.s3.amazonaws.com/`, Bucket: bucket },
        }
        return { output: ops[operation] ?? ops.listObjects }
      }

      case "integration.firebase": {
        const operation = (config.operation as string | undefined) ?? "getDocument"
        const collection = (config.collection as string | undefined) ?? "users"
        const docId = (config.documentId as string | undefined) ?? randomId()

        const ops: Record<string, unknown> = {
          getDocument: { id: docId, exists: true, data: { name: "Alice", email: "alice@example.com", score: 95, createdAt: mockTimestamp() }, path: `${collection}/${docId}`, createTime: mockTimestamp(), updateTime: mockTimestamp() },
          createDocument: { id: docId, path: `${collection}/${docId}`, createTime: mockTimestamp(), fields: { created: true } },
          updateDocument: { id: docId, path: `${collection}/${docId}`, updateTime: mockTimestamp(), fields: { updated: true } },
          deleteDocument: { id: docId, path: `${collection}/${docId}`, deleted: true },
          queryCollection: { documents: [{ id: randomId(), data: { name: "User 1", active: true } }, { id: randomId(), data: { name: "User 2", active: true } }], size: 2, collection },
        }
        return { output: ops[operation] ?? ops.getDocument }
      }

      case "integration.hubspot": {
        const operation = (config.operation as string | undefined) ?? "createContact"
        const contactId = randomId()

        const ops: Record<string, unknown> = {
          createContact: { id: contactId, properties: { email: config.email ?? "contact@example.com", firstname: "John", lastname: "Doe", createdate: mockTimestamp() }, createdAt: mockTimestamp() },
          getContact: { id: contactId, properties: { email: "contact@example.com", firstname: "Jane", lastname: "Smith", company: "Acme Inc", phone: "+1234567890", lifecyclestage: "lead" } },
          createDeal: { id: randomId(), properties: { dealname: "New Deal", amount: "5000", dealstage: "appointmentscheduled", pipeline: "default", createdate: mockTimestamp() } },
          listContacts: { results: [{ id: randomId(), properties: { email: "alice@example.com", firstname: "Alice" } }, { id: randomId(), properties: { email: "bob@example.com", firstname: "Bob" } }], total: 2 },
          updateContact: { id: contactId, properties: { email: config.email ?? "updated@example.com" }, updatedAt: mockTimestamp() },
        }
        return { output: ops[operation] ?? ops.createContact }
      }

      case "integration.airtable": {
        const operation = (config.operation as string | undefined) ?? "listRecords"

        const ops: Record<string, unknown> = {
          listRecords: { records: [{ id: "rec" + randomId(), fields: { Name: "Record 1", Status: "Active", Score: 95 }, createdTime: mockTimestamp() }, { id: "rec" + randomId(), fields: { Name: "Record 2", Status: "Pending", Score: 78 }, createdTime: mockTimestamp() }], offset: null },
          createRecord: { id: "rec" + randomId(), fields: { Name: "New Record", Status: "Active" }, createdTime: mockTimestamp() },
          updateRecord: { id: "rec" + randomId(), fields: { Name: "Updated Record", Status: "Done" }, createdTime: mockTimestamp() },
          deleteRecord: { id: "rec" + randomId(), deleted: true },
          searchRecords: { records: [{ id: "rec" + randomId(), fields: { Name: "Found Record", Status: "Active" }, createdTime: mockTimestamp() }] },
        }
        return { output: ops[operation] ?? ops.listRecords }
      }

      case "integration.zoom": {
        const operation = (config.operation as string | undefined) ?? "createMeeting"
        const meetingId = Math.floor(Math.random() * 9000000000) + 1000000000

        const ops: Record<string, unknown> = {
          createMeeting: { id: meetingId, topic: config.topic ?? "Team Meeting", type: 2, start_time: mockTimestamp(), duration: config.duration ?? 30, timezone: "UTC", join_url: `https://zoom.us/j/${meetingId}`, password: randomId().slice(0, 6), host_email: "host@example.com" },
          getMeeting: { id: meetingId, topic: "Existing Meeting", status: "waiting", start_time: mockTimestamp(), duration: 60, join_url: `https://zoom.us/j/${meetingId}`, participants_count: 0 },
          listMeetings: { meetings: [{ id: meetingId, topic: "Daily Standup", start_time: mockTimestamp(), duration: 15 }, { id: meetingId + 1, topic: "Sprint Review", start_time: mockTimestamp(), duration: 60 }], total_records: 2 },
          deleteMeeting: { deleted: true, id: meetingId },
          listRecordings: { meetings: [{ id: meetingId, topic: "Recorded Meeting", recording_files: [{ file_type: "MP4", file_size: 52428800, download_url: "https://zoom.us/recording/" + randomId() }] }] },
        }
        return { output: ops[operation] ?? ops.createMeeting }
      }

      case "integration.calendly": {
        const operation = (config.operation as string | undefined) ?? "listEvents"
        const eventId = randomId()

        const ops: Record<string, unknown> = {
          listEvents: { collection: [{ uri: `https://api.calendly.com/scheduled_events/${eventId}`, name: "30 Minute Meeting", status: "active", start_time: mockTimestamp(), end_time: mockTimestamp(), event_memberships: [{ user: "https://api.calendly.com/users/" + randomId() }] }], pagination: { count: 1 } },
          getEvent: { resource: { uri: `https://api.calendly.com/scheduled_events/${eventId}`, name: "Consultation Call", status: "active", start_time: mockTimestamp(), end_time: mockTimestamp(), location: { type: "zoom", join_url: "https://zoom.us/j/" + randomId() } } },
          listInvitees: { collection: [{ uri: "https://api.calendly.com/invitees/" + randomId(), name: "Alice Smith", email: "alice@example.com", status: "active", created_at: mockTimestamp() }], pagination: { count: 1 } },
          cancelEvent: { resource: { uri: `https://api.calendly.com/scheduled_events/${eventId}`, status: "canceled", cancellation: { reason: "Rescheduled" } } },
        }
        return { output: ops[operation] ?? ops.listEvents }
      }

      case "integration.jira": {
        const operation = (config.operation as string | undefined) ?? "createIssue"
        const projectKey = (config.projectKey as string | undefined) ?? "PROJ"
        const issueKey = `${projectKey}-${Math.floor(Math.random() * 900) + 100}`

        const ops: Record<string, unknown> = {
          createIssue: { id: randomId(), key: issueKey, self: `https://jira.example.com/rest/api/2/issue/${issueKey}`, fields: { summary: config.summary ?? "New Issue", issuetype: { name: config.issueType ?? "Task" }, status: { name: "To Do" }, project: { key: projectKey }, created: mockTimestamp() } },
          getIssue: { id: randomId(), key: issueKey, fields: { summary: "Existing Issue", description: "Issue description", issuetype: { name: "Bug" }, status: { name: "In Progress" }, priority: { name: "High" }, assignee: { displayName: "Alice" }, created: mockTimestamp() } },
          updateIssue: { id: randomId(), key: issueKey, updated: true },
          addComment: { id: randomId(), body: "Comment added via m8m", author: { displayName: "m8m Bot" }, created: mockTimestamp() },
          transitionIssue: { id: randomId(), key: issueKey, transition: { name: "Done" }, status: { name: "Done" } },
        }
        return { output: ops[operation] ?? ops.createIssue }
      }

      case "integration.mailchimp": {
        const operation = (config.operation as string | undefined) ?? "addSubscriber"
        const listId = (config.listId as string | undefined) ?? randomId()
        const email = (config.email as string | undefined) ?? "subscriber@example.com"

        const ops: Record<string, unknown> = {
          addSubscriber: { id: randomId(), email_address: email, status: "subscribed", list_id: listId, timestamp_signup: mockTimestamp(), merge_fields: { FNAME: "New", LNAME: "Subscriber" } },
          removeSubscriber: { id: randomId(), email_address: email, status: "unsubscribed", list_id: listId },
          createCampaign: { id: randomId(), type: "regular", status: "save", create_time: mockTimestamp(), settings: { subject_line: "Campaign from m8m", from_name: "m8m Team" }, recipients: { list_id: listId } },
          sendCampaign: { id: randomId(), status: "sending", send_time: mockTimestamp(), emails_sent: 1500 },
          getListMembers: { members: [{ email_address: "alice@example.com", status: "subscribed" }, { email_address: "bob@example.com", status: "subscribed" }], total_items: 2, list_id: listId },
        }
        return { output: ops[operation] ?? ops.addSubscriber }
      }

      case "integration.dropbox": {
        const operation = (config.operation as string | undefined) ?? "listFiles"
        const path = (config.path as string | undefined) ?? "/documents"

        const ops: Record<string, unknown> = {
          uploadFile: { name: path.split("/").pop(), path_display: path, id: "id:" + randomId(), size: 1048576, server_modified: mockTimestamp(), content_hash: randomId() + randomId() },
          downloadFile: { name: path.split("/").pop(), path_display: path, size: 2048000, content: "[binary content]", server_modified: mockTimestamp() },
          listFiles: { entries: [{ ".tag": "file", name: "report.pdf", path_display: "/documents/report.pdf", size: 2048000, server_modified: mockTimestamp() }, { ".tag": "file", name: "notes.txt", path_display: "/documents/notes.txt", size: 4096, server_modified: mockTimestamp() }, { ".tag": "folder", name: "images", path_display: "/documents/images" }], has_more: false },
          createFolder: { metadata: { name: path.split("/").pop(), path_display: path, id: "id:" + randomId() } },
          deleteFile: { metadata: { name: path.split("/").pop(), path_display: path, ".tag": "file" } },
          getMetadata: { ".tag": "file", name: path.split("/").pop(), path_display: path, size: 1048576, server_modified: mockTimestamp(), is_downloadable: true },
        }
        return { output: ops[operation] ?? ops.listFiles }
      }

      case "integration.redis": {
        const operation = (config.operation as string | undefined) ?? "get"
        const key = (config.key as string | undefined) ?? "myKey"
        const value = (config.value as string | undefined) ?? "myValue"

        const ops: Record<string, unknown> = {
          get: { key, value: "stored_value_" + randomId(), ttl: 3600 },
          set: { key, value, result: "OK" },
          delete: { key, deleted: 1 },
          keys: { pattern: "*", keys: ["user:1", "user:2", "session:abc", "cache:data"], count: 4 },
          incr: { key, value: 42 },
          publish: { channel: key, message: value, receivers: 3 },
        }
        return { output: ops[operation] ?? ops.get }
      }

      case "integration.openrouter": {
        const model = (config.model as string | undefined) ?? "anthropic/claude-3.5-sonnet"
        return {
          output: {
            id: "gen-" + randomId(),
            model,
            choices: [{
              index: 0,
              message: {
                role: "assistant",
                content: `This is a simulated response from ${model.split("/")[1] ?? model}. In production with a real OpenRouter API key, this would route to the actual model and generate a real response.`,
              },
              finish_reason: "stop",
            }],
            usage: { prompt_tokens: 30, completion_tokens: 45, total_tokens: 75 },
          },
        }
      }

      case "integration.supabase": {
        const operation = (config.operation as string | undefined) ?? "select"
        const table = (config.table as string | undefined) ?? "users"

        const ops: Record<string, unknown> = {
          select: { data: [{ id: 1, name: "Alice", email: "alice@example.com", created_at: mockTimestamp() }, { id: 2, name: "Bob", email: "bob@example.com", created_at: mockTimestamp() }], count: 2, status: 200, statusText: "OK" },
          insert: { data: [{ id: 3, name: "Charlie", created_at: mockTimestamp() }], count: 1, status: 201, statusText: "Created" },
          update: { data: [{ id: 1, name: "Alice Updated" }], count: 1, status: 200, statusText: "OK" },
          delete: { data: [], count: 1, status: 200, statusText: "OK" },
          rpc: { data: { result: "Function executed successfully", rows_affected: 5 }, status: 200 },
        }
        return { output: { ...ops[operation] as object, table } }
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
  const userId = await ensureUserId()

  const workflow = await prisma.workflow.findFirst({ where: { id, userId } })
  if (!workflow) return NextResponse.json({ error: "No workflow data to execute" }, { status: 400 })

  const body = await request.json()
  const nodes: Node<NodeData>[] = body.nodes ?? (workflow.nodes as unknown as Node<NodeData>[])
  const edges: Edge[] = body.edges ?? (workflow.edges as unknown as Edge[])

  const execution = await prisma.workflowExecution.create({
    data: { workflowId: id, status: "RUNNING", mode: "MANUAL" },
  })
  const executionId = execution.id

  const startTime = Date.now()
  const ctx: ExecutionContext = { nodeOutputs: new Map(), executionId }
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
        executionId,
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
    where: { id: executionId },
    data: {
      status: finalStatus,
      finishedAt: new Date(endTime),
      durationMs: endTime - startTime,
      error: overallError,
    },
    include: {
      steps: {
        orderBy: { startedAt: "asc" },
        select: {
          id: true,
          nodeId: true,
          nodeName: true,
          nodeType: true,
          status: true,
          durationMs: true,
          outputData: true,
          error: true,
        },
      },
    },
  })

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    durationMs: updated.durationMs,
    error: updated.error,
    steps: updated.steps,
  })
}
