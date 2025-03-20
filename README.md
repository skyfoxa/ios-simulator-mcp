# iOS Simulator MCP Tool

A Model Context Protocol (MCP) tool for interacting with iOS simulators. This tool allows you to interact with iOS simulators by getting information about them, controlling UI interactions, and inspecting UI elements.

https://github.com/user-attachments/assets/f126ccf3-f16c-4759-8b42-b78a443c3a1f

## Features

- Get the ID of the currently booted iOS simulator
- Interact with the simulator UI:
  - Describe all accessibility elements on screen
  - Tap on screen coordinates
  - Input text
  - Swipe between coordinates
  - Get information about UI elements at specific coordinates

## Prerequisites

- Node.js (v16 or higher)
- TypeScript
- Xcode and iOS simulators installed
- macOS (as iOS simulators are only available on macOS)
- Facebook IDB tool installed (`brew install facebook/fb/idb`)


## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/joshuayoes/ios-simulator-mcp
   cd ios-simulator-mcp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage with Cursor

1. Make sure you have Cursor installed and updated to the latest version.

2. Edit your Cursor MCP configuration:

   ```bash
   code ~/.cursor/mcp.json
   ```

3. Add the iOS simulator server to your configuration:

   ```json
   {
     "mcpServers": {
       "ios-simulator": {
         "command": "node",
         "args": ["/Users/joshuayoes/Code/ios-simulator-mcp/build/index.js"]
       }
     }
   }
   ```

   Replace `"/Users/joshuayoes/Code` with the actual path to your project directory.

4. Restart Cursor.

5. In Cursor, you can now use the simulator tools by accessing the available MCP tools.

## Available Tools

### get_booted_sim_id

Gets the ID and details of the currently booted iOS simulator.

**Example usage in Cursor:**

```
What simulator is currently running?
```

### ui_describe_all

Describes accessibility information for the entire screen in the iOS Simulator.

**Parameters:**

- `udid` (optional): The UUID of the simulator to target (will use booted simulator if not provided)

**Example usage in Cursor:**

```
Show me all UI elements on the screen
```

### ui_tap

Tap on the screen in the iOS Simulator.

**Parameters:**

- `x`: The x-coordinate to tap
- `y`: The y-coordinate to tap
- `duration` (optional): Press duration
- `udid` (optional): The UUID of the simulator to target (will use booted simulator if not provided)

**Example usage in Cursor:**

```
Tap on the screen at coordinates x=150, y=300
```

### ui_text

Input text into the iOS Simulator.

**Parameters:**

- `text`: Text to input
- `udid` (optional): The UUID of the simulator to target (will use booted simulator if not provided)

**Example usage in Cursor:**

```
Type "Hello, Cursor!" into the text field
```

### ui_swipe

Swipe on the screen in the iOS Simulator.

**Parameters:**

- `x_start`: The starting x-coordinate
- `y_start`: The starting y-coordinate
- `x_end`: The ending x-coordinate
- `y_end`: The ending y-coordinate
- `delta` (optional): The size of each step in the swipe (default is 1)
- `udid` (optional): The UUID of the simulator to target (will use booted simulator if not provided)

**Example usage in Cursor:**

```
Swipe from x=100, y=300 to x=100, y=100
```

### ui_describe_point

Returns the accessibility element at given coordinates on the iOS Simulator's screen.

**Parameters:**

- `x`: The x-coordinate
- `y`: The y-coordinate
- `udid` (optional): The UUID of the simulator to target (will use booted simulator if not provided)

**Example usage in Cursor:**

```
What UI element is at position x=200, y=400?
```

## License

MIT
