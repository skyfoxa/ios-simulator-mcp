#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const child_process_1 = require("child_process");
const util_1 = require("util");
const zod_1 = require("zod");
// Convert exec to use promises
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Initialize FastMCP server
const server = new mcp_js_1.McpServer({
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
    }
    catch (error) {
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
    }
    catch (error) {
        return {
            content: [
                { type: "text", text: `Error: ${error.message || String(error)}` },
            ],
        };
    }
});
/**
 * Boot a specific simulator by ID
 * @param deviceId The UUID of the simulator to boot
 * @returns Result of the boot operation
 */
server.tool("boot_simulator", { deviceId: zod_1.z.string().describe("The UUID of the simulator to boot") }, async ({ deviceId }) => {
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
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error booting simulator: ${error.message || String(error)}`,
                },
            ],
        };
    }
});
async function runServer() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
runServer().catch(console.error);
process.stdin.on("close", () => {
    console.error("Puppeteer MCP Server closed");
    server.close();
});
