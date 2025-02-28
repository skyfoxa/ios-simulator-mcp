# iOS Simulator MCP Tool

A Model Context Protocol (MCP) tool for interacting with iOS simulators. This tool allows you to get information about booted simulators, list all available simulators, and boot simulators.

## Features

- Get the ID of the currently booted iOS simulator
- List all available iOS simulators
- Boot a specific iOS simulator by ID

## Prerequisites

- Node.js (v16 or higher)
- TypeScript
- Xcode and iOS simulators installed
- macOS (as iOS simulators are only available on macOS)

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/ios-sim-mcp.git
   cd ios-sim-mcp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage with Claude Desktop

1. Make sure you have Claude for Desktop installed and updated to the latest version.

2. Edit your Claude for Desktop App configuration:

   ```bash
   code ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. Add the iOS simulator server to your configuration:

   ```json
   {
     "mcpServers": {
       "ios-simulator": {
         "command": "node",
         "args": ["/ABSOLUTE/PATH/TO/ios-sim-mcp/dist/ios-sim-tool.js"]
       }
     }
   }
   ```

   Replace `/ABSOLUTE/PATH/TO/` with the actual path to your project directory.

4. Restart Claude for Desktop.

5. In Claude, you can now use the simulator tools by clicking on the hammer icon and selecting the appropriate tool:
   - `get_booted_sim_id`: Get information about the currently booted simulator
   - `get_all_simulators`: List all available simulators
   - `boot_simulator`: Boot a specific simulator by ID

## Available Tools

### get_booted_sim_id

Gets the ID and details of the currently booted iOS simulator.

**Example usage in Claude:**

```
What simulator is currently running?
```

### get_all_simulators

Lists all available iOS simulators.

**Example usage in Claude:**

```
Show me all available iOS simulators
```

### boot_simulator

Boots a specific simulator by ID.

**Parameters:**

- `deviceId`: The UUID of the simulator to boot

**Example usage in Claude:**

```
Boot the simulator with ID 12345678-1234-1234-1234-123456789012
```

## License

MIT
