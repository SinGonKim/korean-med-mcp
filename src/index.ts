#!/usr/bin/env node

import "dotenv/config"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import express from "express"
import { registerTools } from "./tool-registry.js"

const VERSION = "1.0.0"

function createServer(): Server {
  const server = new Server(
    { name: "korean-med-mcp", version: VERSION },
    { capabilities: { tools: {} } }
  )
  registerTools(server)
  return server
}

async function startHttpServer(port: number): Promise<void> {
  const app = express()
  app.use(express.json())

  app.post("/mcp", async (req, res) => {
    const server = createServer()
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on("close", () => { server.close().catch(() => undefined) })
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  })

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", name: "korean-med-mcp", version: VERSION })
  })

  app.listen(port, () => {
    process.stderr.write(`korean-med-mcp HTTP server listening on port ${port}\n`)
  })
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const modeIdx = args.indexOf("--mode")
  const mode = modeIdx !== -1 ? args[modeIdx + 1] : "stdio"
  const portIdx = args.indexOf("--port")
  const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 3000

  if (mode === "http") {
    await startHttpServer(port)
  } else {
    const toStderr = (...a: unknown[]) =>
      process.stderr.write(a.map(String).join(" ") + "\n")
    console.log = console.info = console.debug = console.warn = toStderr

    const server = createServer()
    const transport = new StdioServerTransport()
    await server.connect(transport)
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`)
  process.exit(1)
})
