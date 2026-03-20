# Discord Bot Playground - Agent Knowledge Base

**Generated:** 2026-03-20  
**Stack:** Node.js 18+, discord.js 14+, Express  
**Domain:** Discord bot with OpenCode ACP integration

---

## OVERVIEW

Discord bot bridging Discord interactions with OpenCode CLI via Agent Communication Protocol (ACP). Spawns OpenCode processes, manages sessions, and returns results in Discord threads.

---

## STRUCTURE

```
./
├── src/
│   ├── index.js              # Bot entry: loads commands/events, starts ACP server
│   ├── deploy-commands.js    # Slash command registration
│   ├── commands/utility/     # Slash commands
│   │   ├── opencode.js       # /opencode: folder selection → modal → OpenCode task
│   │   ├── ping.js, echo.js, help.js
│   ├── events/               # Discord.js event handlers
│   │   ├── interactionCreate.js  # Command + modal + select menu handler
│   │   └── ready.js
│   ├── acp/                  # Agent Communication Protocol
│   │   ├── client.js         # ACPClient: sends tasks to OpenCode
│   │   ├── server.js         # ACPServer: Express callback receiver
│   │   └── client-sdk.test.js # Tests
│   ├── opencode-client/      # OpenCode SDK wrapper
│   │   ├── index.js          # OpenCodeClient: spawns opencode process
│   │   └── test.js           # Manual test script
│   └── utils/
│       └── folderScanner.js  # WORKSPACE_DIR subfolder scanner
├── package.json
└── .env.example              # See CONFIG section
```

---

## WHERE TO LOOK

| Task | Location | Note |
|------|----------|------|
| Add new command | `src/commands/utility/*.js` | Export `{data, execute}` |
| Add event handler | `src/events/*.js` | Export `{name, execute, once?}` |
| OpenCode flow | `src/commands/utility/opencode.js` → `interactionCreate.js` | Folder select → Modal → ACPClient |
| ACP communication | `src/acp/client.js`, `src/acp/server.js` | Client sends, server receives callbacks |
| OpenCode process | `src/opencode-client/index.js` | Spawns `opencode acp`, uses @agentclientprotocol/sdk |

---

## CONVENTIONS

### Command Pattern
```javascript
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('cmd').setDescription('...'),
  async execute(interaction) { await interaction.reply('...'); }
};
```

### Event Pattern
```javascript
module.exports = {
  name: 'eventName',
  once: false,  // optional
  async execute(...args) { /* handler */ }
};
```

### Discord.js Conventions
- Use `interaction.deferReply()` for operations >3s (prevents timeout)
- Use `interaction.editReply()` after defer
- Thread creation: `interaction.channel.threads.create()`
- Ephemeral replies for errors/config only

---

## ANTI-PATTERNS

**NEVER:**
- Hardcode paths to `opencode` binary → Use `which opencode` (see `opencode-client/index.js:28`)
- Hardcode `workingDir` → Use `process.cwd()` or `WORKSPACE_DIR` env
- Use `interaction.reply()` after `deferReply()` → Use `editReply()` or `followUp()`
- Skip path validation → Always use `isPathWithinWorkspace()` before fs operations
- Sync `opencode` spawn without timeout → Always wrap with Promise + timeout

**ALWAYS:**
- Collect OpenCode `message` events with delay (see `acp/client.js:49`)
- Check `process.env.BOT_ACP_ENDPOINT` before starting ACP server
- Handle `interaction.replied || interaction.deferred` before replying

---

## UNIQUE STYLES

### OpenCode Process Spawning
Dynamic binary resolution (current terminal PATH):
```javascript
const opencodePath = execSync('which opencode', { encoding: 'utf8', env: process.env }).trim();
spawn(opencodePath, ['acp'], { cwd: workingDir, env: { ...process.env, FORCE_COLOR: '0' } });
```

### Message Collection Pattern
OpenCode sends async `message` events; collect with delay:
```javascript
const messages = [];
client = new OpenCodeClient({ onEvent: (e) => { if (e.type === 'message') messages.push(e.content); } });
await client.sendPrompt(prompt);
await new Promise(r => setTimeout(r, 500));  // Let events arrive
const output = messages.join('');
```

---

## COMMANDS

```bash
# Install dependencies
npm install

# Development (requires .env)
npm start                    # NODE_TLS_REJECT_UNAUTHORIZED=0 node src/index.js

# Register slash commands (run after adding/modifying commands)
npm run deploy

# Test OpenCode client manually
node src/opencode-client/test.js

# Run tests
node --test src/**/*.test.js
```

---

## CONFIG

Required `.env`:
```env
DISCORD_TOKEN=              # Bot token
CLIENT_ID=                  # Application ID
WORKSPACE_DIR=              # Root for /opencode folder scanning
```

Optional:
```env
GUILD_ID=                   # Dev server (instant command register)
BOT_ACP_PORT=8080           # ACP callback server port
BOT_ACP_ENDPOINT=           # Public URL for OpenCode callbacks
HTTPS_PROXY=                # If behind proxy
```

---

## NOTES

- **Proxy support**: Auto-detects `HTTPS_PROXY`/`HTTP_PROXY` env vars, configures undici + global-agent
- **Cooldown**: `/opencode` has 30s cooldown per user (`src/commands/utility/opencode.js:6`)
- **Folder limit**: Discord select menus max 25 options (`opencode.js:57`)
- **ACP Server**: Only starts if `BOT_ACP_ENDPOINT` set; otherwise OpenCode callbacks disabled
- **Error handling**: Always log with `[Component]` prefix for grep-ability
