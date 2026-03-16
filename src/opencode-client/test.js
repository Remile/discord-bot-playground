const { OpenCodeClient } = require('./index');

async function runTest() {
  console.log('=== OpenCode Client SDK Test ===\n');

  const events = [];
  
  const client = new OpenCodeClient({
    workingDir: '/home/better/dev/repo/discord-bot-playground',
    onEvent: (event) => {
      events.push(event);
      switch (event.type) {
        case 'thinking':
          process.stdout.write(`🤔 ${event.content.substring(0, 50)}...\n`);
          break;
        case 'message':
          process.stdout.write(`💬 ${event.content.substring(0, 100)}...\n`);
          break;
        case 'tool_call':
          console.log(`🔧 Tool: ${event.title} (${event.status})`);
          break;
        case 'tool_call_update':
          console.log(`🔧 Tool update: ${event.toolCallId} - ${event.status}`);
          break;
        case 'plan':
          console.log(`📋 Plan update`);
          break;
        default:
          console.log(`📌 ${event.type}`);
      }
    },
  });

  try {
    console.log('Connecting...');
    await client.connect();
    
    console.log('\n--- Sending Prompt ---');
    const result = await client.sendPrompt('List the files in this directory');
    
    console.log('\n--- Result ---');
    console.log('Stop reason:', result.stopReason);
    console.log('Total events:', events.length);
    
    const stats = {};
    events.forEach(e => { stats[e.type] = (stats[e.type] || 0) + 1; });
    console.log('Event stats:', stats);

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    client.disconnect();
  }
}

runTest();
