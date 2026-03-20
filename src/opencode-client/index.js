const { spawn, execSync } = require('child_process');
const { Writable, Readable } = require('stream');

async function loadSDK() {
  const acp = await import('@agentclientprotocol/sdk');
  return {
    PROTOCOL_VERSION: acp.PROTOCOL_VERSION,
    ClientSideConnection: acp.ClientSideConnection,
    ndJsonStream: acp.ndJsonStream,
  };
}

class OpenCodeClient {
  constructor(options = {}) {
    this.workingDir = options.workingDir || process.cwd();
    this.onEvent = options.onEvent || (() => {});
    this.connection = null;
    this.process = null;
    this.sessionId = null;
  }

  async connect() {
    const { PROTOCOL_VERSION, ClientSideConnection, ndJsonStream } = await loadSDK();
    
    // Find opencode from PATH in current terminal environment
    let opencodePath;
    try {
      opencodePath = execSync('which opencode', { encoding: 'utf8', env: process.env }).trim();
    } catch (e) {
      opencodePath = 'opencode'; // fallback
    }
    
    this.process = spawn(opencodePath, ['acp'], {
      cwd: this.workingDir,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    console.log(`[OpenCode] PID: ${this.process.pid}`);

    const input = Writable.toWeb(this.process.stdin);
    const output = Readable.toWeb(this.process.stdout);
    const stream = ndJsonStream(input, output);

    this.eventHandler = new EventHandler(this.onEvent);
    this.connection = new ClientSideConnection(() => this.eventHandler, stream);

    this.process.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Error')) console.error('[OpenCode stderr]', msg.substring(0, 200));
    });

    this.process.on('error', (err) => {
      console.error('[OpenCode process error]', err.message);
    });

    const initResult = await this.connection.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
      },
    });

    console.log(`[OpenCode] Connected (protocol v${initResult.protocolVersion})`);

    const sessionResult = await this.connection.newSession({
      cwd: this.workingDir,
      mcpServers: [],
    });

    this.sessionId = sessionResult.sessionId;
    console.log(`[OpenCode] Session: ${this.sessionId}`);

    return this;
  }

  async sendPrompt(prompt) {
    if (!this.connection || !this.sessionId) {
      throw new Error('Not connected');
    }

    const result = await this.connection.prompt({
      sessionId: this.sessionId,
      prompt: [{ type: 'text', text: prompt }],
    });

    return result;
  }
  setOnEvent(onEvent) {
    this.onEvent = onEvent;
    this.eventHandler.onEvent = onEvent;
  }

  disconnect() {
    if (this.process) {
      this.process.kill();
    }
  }
}

class EventHandler {
  constructor(onEvent) {
    this.onEvent = onEvent;
  }

  async sessionUpdate(params) {
    const update = params.update;
    
    switch (update.sessionUpdate) {
      case 'agent_thought_chunk':
        this.onEvent({ type: 'thinking', content: update.content?.text || '' });
        break;
      case 'agent_message_chunk':
        if (update.content?.type === 'text') {
          this.onEvent({ type: 'message', content: update.content.text });
        }
        break;
      case 'tool_call':
        this.onEvent({ type: 'tool_call', title: update.title, status: update.status });
        break;
      case 'tool_call_update':
        this.onEvent({ type: 'tool_call_update', toolCallId: update.toolCallId, status: update.status });
        break;
      case 'plan':
        this.onEvent({ type: 'plan', content: update.content });
        break;
      default:
        break;
    }
  }

  async requestPermission(params) {
    return { outcome: { outcome: 'granted' } };
  }
}

module.exports = { OpenCodeClient };
