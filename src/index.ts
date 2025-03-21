#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const server = new McpServer({
  name: "ios-simulator",
  version: require("../package.json").version,
});

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

async function getBootedDevice() {
  const { stdout, stderr } = await execAsync("xcrun simctl list devices");

  if (stderr) throw new Error(stderr);

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
          name: deviceName,
          id: deviceId,
        };
      }
    }
  }

  throw Error("No booted simulator found");
}

async function getBootedDeviceId(
  deviceId: string | undefined
): Promise<string> {
  // If deviceId not provided, get the currently booted simulator
  let actualDeviceId = deviceId;
  if (!actualDeviceId) {
    const { id } = await getBootedDevice();
    actualDeviceId = id;
  }
  if (!actualDeviceId) {
    throw new Error("No booted simulator found and no deviceId provided");
  }
  return actualDeviceId;
}

server.tool(
  "get_booted_sim_id",
  "Get the ID of the currently booted iOS simulator",
  async () => {
    try {
      const { id, name } = await getBootedDevice();

      return {
        content: [
          {
            type: "text",
            text: `Booted Simulator: "${name}". UUID: "${id}"`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          { type: "text", text: `Error: ${error.message || String(error)}` },
        ],
      };
    }
  }
);

server.tool(
  "ui_describe_all",
  "Describes accessibility information for the entire screen in the iOS Simulator",
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
  "ui_tap",
  "Tap on the screen in the iOS Simulator",
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
            text: `Error tapping on the screen: ${toError(error).message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "ui_type",
  "Input text into the iOS Simulator",
  {
    udid: z
      .string()
      .optional()
      .describe("Udid of target, can also be set with the IDB_UDID env var"),
    text: z.string().describe("Text to input"),
  },
  async ({ udid, text }) => {
    try {
      const actualUdid = await getBootedDeviceId(udid);
      const { stderr } = await execAsync(
        `idb ui text ${text} --udid ${actualUdid}`
      );

      if (stderr) throw new Error(stderr);

      return {
        content: [{ type: "text", text: "Typed successfully" }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error typing text into the iOS Simulator: ${
              toError(error).message
            }`,
          },
        ],
      };
    }
  }
);

server.tool(
  "ui_swipe",
  "Swipe on the screen in the iOS Simulator",
  {
    udid: z
      .string()
      .optional()
      .describe("Udid of target, can also be set with the IDB_UDID env var"),
    x_start: z.number().describe("The starting x-coordinate"),
    y_start: z.number().describe("The starting y-coordinate"),
    x_end: z.number().describe("The ending x-coordinate"),
    y_end: z.number().describe("The ending y-coordinate"),
    delta: z
      .number()
      .optional()
      .describe("The size of each step in the swipe (default is 1)")
      .default(1),
  },
  async ({ udid, x_start, y_start, x_end, y_end, delta }) => {
    try {
      const actualUdid = await getBootedDeviceId(udid);
      const deltaArg = delta ? `--delta ${delta}` : "";
      const { stderr } = await execAsync(
        `idb ui swipe --udid ${actualUdid} ${deltaArg} ${x_start} ${y_start} ${x_end} ${y_end} --json`
      );

      if (stderr) throw new Error(stderr);

      return {
        content: [{ type: "text", text: "Swiped successfully" }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error swiping on the screen: ${toError(error).message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "ui_describe_point",
  "Returns the accessibility element at given co-ordinates on the iOS Simulator's screen",
  {
    udid: z
      .string()
      .optional()
      .describe("Udid of target, can also be set with the IDB_UDID env var"),
    x: z.number().describe("The x-coordinate"),
    y: z.number().describe("The y-coordinate"),
  },
  async ({ udid, x, y }) => {
    try {
      const actualUdid = await getBootedDeviceId(udid);
      const { stdout, stderr } = await execAsync(
        `idb ui describe-point --udid ${actualUdid} ${x} ${y} --json`
      );

      if (stderr) throw new Error(stderr);

      return {
        content: [{ type: "text", text: stdout }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error describing point (${x}, ${y}): ${
              toError(error).message
            }`,
          },
        ],
      };
    }
  }
);

function ensureAbsolutePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  // Handle ~/something paths
  if (filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  // For relative paths, use ~/Downloads as default directory
  return path.join(os.homedir(), "Downloads", filePath);
}

server.tool(
  "screenshot",
  "Takes a screenshot of the iOS Simulator",
  {
    udid: z
      .string()
      .optional()
      .describe("Udid of target, can also be set with the IDB_UDID env var"),
    output_path: z
      .string()
      .describe(
        "File path where the screenshot will be saved (if relative, ~/Downloads will be used as base directory)"
      ),
    type: z
      .enum(["png", "tiff", "bmp", "gif", "jpeg"])
      .optional()
      .describe("Image format (png, tiff, bmp, gif, or jpeg). Default is png."),
    display: z
      .enum(["internal", "external"])
      .optional()
      .describe(
        "Display to capture (internal or external). Default depends on device type."
      ),
    mask: z
      .enum(["ignored", "alpha", "black"])
      .optional()
      .describe(
        "For non-rectangular displays, handle the mask by policy (ignored, alpha, or black)"
      ),
  },
  async ({ udid, output_path, type, display, mask }) => {
    try {
      const actualUdid = await getBootedDeviceId(udid);
      const absolutePath = ensureAbsolutePath(output_path);

      let command = `xcrun simctl io ${actualUdid} screenshot ${absolutePath}`;

      if (type) command += ` --type=${type}`;
      if (display) command += ` --display=${display}`;
      if (mask) command += ` --mask=${mask}`;

      // command is weird, it responds with stderr on success and stdout is blank
      const { stderr: stdout } = await execAsync(command);

      // throw if we don't get the expected success message
      if (stdout && !stdout.includes("Wrote screenshot to")) {
        throw new Error(stdout);
      }

      return {
        content: [
          {
            type: "text",
            text: stdout,
          },
        ],
      };
    } catch (error) {
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

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);

process.stdin.on("close", () => {
  console.log("iOS Simulator MCP Server closed");
  server.close();
});
