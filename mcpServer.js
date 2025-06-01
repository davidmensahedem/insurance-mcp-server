#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import express from "express";
import { discoverTools } from "./lib/tools.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const SERVER_NAME = "insurance-mcp-server";

async function transformTools(tools) {
  return tools
    .map((tool) => {
      const definitionFunction = tool.definition?.function;
      if (!definitionFunction) return;
      return {
        name: definitionFunction.name,
        description: definitionFunction.description,
        inputSchema: definitionFunction.parameters,
      };
    })
    .filter(Boolean);
}

async function setupServerHandlers(server, tools) {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: await transformTools(tools),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = tools.find((t) => t.definition.function.name === toolName);
    if (!tool) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }
    const args = request.params.arguments;
    const requiredParameters =
      tool.definition?.function?.parameters?.required || [];
    for (const requiredParameter of requiredParameters) {
      if (!(requiredParameter in args)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Missing required parameter: ${requiredParameter}`
        );
      }
    }
    try {
      const result = await tool.function(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("[Error] Failed to fetch data:", error);
      throw new McpError(
        ErrorCode.InternalError,
        `API error: ${error.message}`
      );
    }
  });
}

async function run() {
  const args = process.argv.slice(2);
  const isSSE = args.includes("--sse");
  const tools = await discoverTools();

  if (isSSE) {
    const app = express();
    const transports = {};
    const servers = {};

    // Add Express middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Add CORS headers for development
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    // Health check and root route
    app.get("/", (req, res) => {
      res.json({
        name: SERVER_NAME,
        version: "0.1.0",
        status: "running",
        endpoints: {
          sse: "/sse",
          messages: "/messages",
          health: "/health"
        }
      });
    });

    app.get("/health", (req, res) => {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });

    app.get("/sse", async (_req, res) => {
      console.log("[SSE] New SSE connection requested");

      // Create a new Server instance for each session
      const server = new Server(
        {
          name: SERVER_NAME,
          version: "0.1.0",
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );
      server.onerror = (error) => console.error("[Error]", error);
      await setupServerHandlers(server, tools);

      const transport = new SSEServerTransport("/messages", res);
      transports[transport.sessionId] = transport;
      servers[transport.sessionId] = server;

      res.on("close", async () => {
        console.log("[SSE] Connection closed for session:", transport.sessionId);
        delete transports[transport.sessionId];
        await server.close();
        delete servers[transport.sessionId];
      });

      await server.connect(transport);
    });

    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId;
      const transport = transports[sessionId];
      const server = servers[sessionId];

      if (transport && server) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send("No transport/server found for sessionId");
      }
    });

    const port = process.env.PORT || 3001;
    const host = process.env.HOST || "0.0.0.0";

    app.listen(port, host, () => {
      console.log(`[SSE Server] running on ${host}:${port}`);
      console.log(`[SSE Server] Health check available at http://${host}:${port}/health`);
      console.log(`[SSE Server] SSE endpoint available at http://${host}:${port}/sse`);
    });
  } else {
    // stdio mode: single server instance
    const server = new Server(
      {
        name: SERVER_NAME,
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    server.onerror = (error) => console.error("[Error]", error);
    await setupServerHandlers(server, tools);

    process.on("SIGINT", async () => {
      await server.close();
      process.exit(0);
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

run().catch(console.error);
