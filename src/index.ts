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

// Configure screenshot resource directory
const SCREENSHOT_RESOURCE_DIR =
  process.env.SCREENSHOT_RESOURCE_DIR ||
  path.join(process.env.HOME || "", "Downloads", "ios-simulator-screenshots");

// Create the screenshot directory if it doesn't exist
if (!fs.existsSync(SCREENSHOT_RESOURCE_DIR)) {
  fs.mkdirSync(SCREENSHOT_RESOURCE_DIR, { recursive: true });
}

// Store screenshots in memory
const screenshots = new Map<string, string>();

// Initialize FastMCP server
const server = new McpServer({
  name: "ios-simulator",
  version: "1.0.0",
});

// Register new screenshots as they're created
function registerScreenshotResource(name: string, data: string) {
  screenshots.set(name, data);

  // Register a resource for this screenshot if it doesn't exist already
  server.resource(`screenshot-${name}`, `screenshot://${name}`, async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "image/png",
          blob: data,
        },
      ],
    };
  });
}

function toError(input: unknown): Error {
  if (input instanceof Error) return input;

  if (
    typeof input === "object" &&
    input &&
    "message" in input &&
    typeof input.message === "string"
  )
    return new Error(input.message);

  return new Error(JSON.stringify(input));
}

// Add a resource to list available screenshots
server.resource("screenshot-list", "screenshot://list", async (uri) => {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "text/plain",
        text: Array.from(screenshots.keys()).join("\n"),
      },
    ],
  };
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

async function getBootedDeviceId(
  deviceId: string | undefined
): Promise<string> {
  // If deviceId not provided, get the currently booted simulator
  let actualDeviceId = deviceId;
  if (!actualDeviceId) {
    const { stdout } = await execAsync("xcrun simctl list devices");

    // Parse the output to find booted device
    const lines = stdout.split("\n");
    for (const line of lines) {
      if (line.includes("Booted")) {
        // Extract the UUID - it's inside parentheses
        const match = line.match(/\(([-0-9A-F]+)\)/);
        if (match) {
          actualDeviceId = match[1];
          break;
        }
      }
    }

    if (!actualDeviceId) {
      throw new Error("No booted simulator found and no deviceId provided");
    }
  }
  return actualDeviceId;
}

/**
 * Take a screenshot of a booted iOS simulator
 * @param deviceId The UUID of the simulator to screenshot
 * @param name Name for the screenshot (used for resource access)
 * @param outputPath Optional path where to save the screenshot (default: timestamp-based filename in the screenshot resource directory)
 * @returns Path to the saved screenshot or error message
 */
server.tool(
  "take_screenshot",
  {
    deviceId: z
      .string()
      .optional()
      .describe(
        "The UUID of the simulator to screenshot (will use booted simulator if not provided)"
      ),
    name: z
      .string()
      .optional()
      .describe("Name for the screenshot to be accessed as a resource"),
    outputPath: z
      .string()
      .optional()
      .describe("Optional path where to save the screenshot"),
  },
  async ({ deviceId, name, outputPath }) => {
    try {
      const actualDeviceId = getBootedDeviceId(deviceId);
      // Generate timestamp for name if not provided
      const screenshotName = name || `screenshot-${Date.now()}`;

      // Generate default filename with timestamp if no path provided
      const actualPath =
        outputPath ||
        path.join(SCREENSHOT_RESOURCE_DIR, `${screenshotName}.png`);

      // Ensure the directory exists
      const directory = path.dirname(actualPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Take the screenshot
      await execAsync(
        `xcrun simctl io ${actualDeviceId} screenshot "${actualPath}"`
      );

      // Get absolute path
      const absolutePath = path.resolve(actualPath);

      // Read the file and store it in memory as base64
      const imageBuffer = fs.readFileSync(actualPath);
      const base64Data = imageBuffer.toString("base64");

      // Register as a resource
      registerScreenshotResource(screenshotName, base64Data);

      return {
        content: [
          {
            type: "text",
            text: `Screenshot saved to: ${absolutePath}\nAccessible as resource: screenshot://${screenshotName}`,
          },
          {
            type: "image",
            data: base64Data,
            mimeType: "image/png",
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error taking screenshot: ${toError(error).message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "ui-describe-all",
  "Describes Accessibility Information for the entire screen",
  {
    udid: z
      .string()
      .optional()
      .describe("Udid of target, can also be set with the IDB_UDID env var"),
  },
  async ({ udid }) => {
    try {
      const actualUdid = await getBootedDeviceId(udid);

      const { stdout } = await execAsync(
        `idb ui describe-all --udid ${actualUdid} --json --nested`
      );

      return {
        content: [{ type: "text", text: stdout }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error describing all of the ui: ${toError(error).message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "ui-tap",
  "Tap On the Screen",
  {
    duration: z.string().optional().describe("Press duration"),
    udid: z
      .string()
      .optional()
      .describe("Udid of target, can also be set with the IDB_UDID env var"),
    x: z.number().describe("The x-coordinate"),
    y: z.number().describe("The x-coordinate"),
  },
  async ({ duration, udid, x, y }) => {
    try {
      const actualUdid = await getBootedDeviceId(udid);
      const durationArg = duration ? `--duration ${duration}` : "";
      const { stderr } = await execAsync(
        `idb ui tap --udid ${actualUdid} ${durationArg} ${x} ${y}  --json`
      );

      if (stderr) throw new Error(stderr);

      return {
        content: [{ type: "text", text: "Tapped successfully" }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error describing all of the ui: ${toError(error).message}`,
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
  console.log("iOS Simulator MCP Server closed");
  server.close();
});
