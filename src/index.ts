#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import path from "path";
import fs from "fs";

// Convert exec to use promises
const execAsync = promisify(exec);

// Initialize FastMCP server
const server = new McpServer({
  name: "ios-simulator",
  version: "1.0.0",
});

/**
 * Get the ID of the currently booted iOS simulator
 * @returns The details and UUID of the booted simulator, or a message if none is booted
 */
server.tool("get_booted_sim_id", {}, async () => {
  try {
    const { stdout } = await execAsync("xcrun simctl list devices");

    // Parse the output to find booted device
    const lines = stdout.split("\n");
    for (const line of lines) {
      if (line.includes("Booted")) {
        // Extract the UUID - it's inside parentheses
        const match = line.match(/\(([-0-9A-F]+)\)/);
        if (match) {
          const deviceId = match[1];
          const deviceName = line.split("(")[0].trim();
          return {
            content: [
              {
                type: "text",
                text: `Booted Simulator: ${deviceName}\nUUID: ${deviceId}`,
              },
            ],
          };
        }
      }
    }

    return {
      content: [{ type: "text", text: "No booted simulator found." }],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Error: ${error.message || String(error)}` },
      ],
    };
  }
});

/**
 * Get a list of all available iOS simulators
 * @returns A formatted list of all simulators
 */
server.tool("get_all_simulators", {}, async () => {
  try {
    const { stdout } = await execAsync("xcrun simctl list devices");
    return {
      content: [{ type: "text", text: stdout }],
    };
  } catch (error: any) {
    return {
      content: [
        { type: "text", text: `Error: ${error.message || String(error)}` },
      ],
    };
  }
});

/**
 * Take a screenshot of a booted iOS simulator
 * @param deviceId The UUID of the simulator to screenshot
 * @param outputPath Optional path where to save the screenshot (default: timestamp-based filename in current directory)
 * @returns Path to the saved screenshot or error message
 */
server.tool(
  "take_screenshot",
  {
    deviceId: z.string().describe("The UUID of the simulator to screenshot"),
    outputPath: z
      .string()
      .optional()
      .describe("Optional path where to save the screenshot"),
  },
  async ({ deviceId, outputPath }) => {
    try {
      // Generate default filename with timestamp if no path provided
      const actualPath = outputPath || `simulator-screenshot-${Date.now()}.png`;

      // Ensure the directory exists
      const directory = path.dirname(actualPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Take the screenshot
      await execAsync(`xcrun simctl io ${deviceId} screenshot "${actualPath}"`);

      // Get absolute path
      const absolutePath = path.resolve(actualPath);

      return {
        content: [
          {
            type: "text",
            text: `Screenshot saved to: ${absolutePath}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error taking screenshot: ${error.message || String(error)}`,
          },
        ],
      };
    }
  }
);

/**
 * Boot a specific simulator by ID
 * @param deviceId The UUID of the simulator to boot
 * @returns Result of the boot operation
 */
server.tool(
  "boot_simulator",
  { deviceId: z.string().describe("The UUID of the simulator to boot") },
  async ({ deviceId }) => {
    try {
      const { stdout } = await execAsync(`xcrun simctl boot ${deviceId}`);
      return {
        content: [
          {
            type: "text",
            text: `Successfully booted simulator with ID: ${deviceId}\n${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error booting simulator: ${error.message || String(error)}`,
          },
        ],
      };
    }
  }
);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);

process.stdin.on("close", () => {
  console.error("Puppeteer MCP Server closed");
  server.close();
});
