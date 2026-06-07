import WebSocket from 'ws';
import * as Y from 'yjs';

async function runTest() {
  console.log('🧪 Starting Collaboration Validation Test...');
  
  const serverUrl = 'http://localhost:8080';
  const wsUrl = 'ws://localhost:8080/room/hackathon-demo?file=main.js';
  
  // 1. Establish 3 WebSocket connections (A, B, C)
  console.log('🔗 Connecting Tab A, Tab B, and Tab C to WebSocket...');
  const clientA = new WebSocket(wsUrl);
  const clientB = new WebSocket(wsUrl);
  const clientC = new WebSocket(wsUrl);
  
  const docs = {
    A: new Y.Doc(),
    B: new Y.Doc(),
    C: new Y.Doc()
  };
  
  let welcomeCount = 0;
  let fileListCount = 0;
  let presenceCount = 0;
  let clientBReceivedUpdate = false;
  let clientCReceivedUpdate = false;
  let fileListReceived = { A: false, B: false, C: false };
  
  // Setup binary message handlers to apply Yjs updates
  clientA.on('message', (data, isBinary) => {
    if (isBinary) {
      const buf = new Uint8Array(data.buffer || data, data.byteOffset || 0, data.byteLength || data.length);
      Y.applyUpdate(docs.A, buf);
      console.log('📥 Client A applied binary update. Current length:', docs.A.getText('code-content').toString().length);
    } else {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'welcome') welcomeCount++;
        if (msg.type === 'fileList') {
          fileListReceived.A = true;
          console.log('📋 Client A received file list:', msg.files);
        }
      } catch (e) {
        console.error('Client A JSON parse error:', e);
      }
    }
  });

  clientB.on('message', (data, isBinary) => {
    if (isBinary) {
      const buf = new Uint8Array(data.buffer || data, data.byteOffset || 0, data.byteLength || data.length);
      Y.applyUpdate(docs.B, buf);
      const content = docs.B.getText('code-content').toString();
      if (content.includes('// Client A was here')) {
        clientBReceivedUpdate = true;
      }
    } else {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'welcome') welcomeCount++;
        if (msg.type === 'fileList') fileListReceived.B = true;
      } catch (e) {}
    }
  });

  clientC.on('message', (data, isBinary) => {
    if (isBinary) {
      const buf = new Uint8Array(data.buffer || data, data.byteOffset || 0, data.byteLength || data.length);
      Y.applyUpdate(docs.C, buf);
      const content = docs.C.getText('code-content').toString();
      if (content.includes('// Client A was here')) {
        clientCReceivedUpdate = true;
      }
    } else {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'welcome') welcomeCount++;
        if (msg.type === 'fileList') fileListReceived.C = true;
      } catch (e) {}
    }
  });

  // Open helper functions
  const openPromise = (ws, name, userName) => new Promise((resolve) => {
    ws.on('open', () => {
      console.log(`🟢 ${name} WebSocket Connected`);
      ws.send(JSON.stringify({
        type: 'join',
        user: { name: userName, color: '#ff6b6b' }
      }));
      resolve();
    });
  });

  await Promise.all([
    openPromise(clientA, 'Client A', 'Developer A'),
    openPromise(clientB, 'Client B', 'Developer B'),
    openPromise(clientC, 'Client C', 'Developer C')
  ]);

  // Wait for initial sync and welcomes
  await new Promise(r => setTimeout(r, 1500));
  
  console.log(`✨ Welcomes received: ${welcomeCount}/3`);
  
  // 2. Perform edit in Client A
  console.log('✍️ Client A editing document...');
  docs.A.transact(() => {
    const yText = docs.A.getText('code-content');
    yText.insert(yText.length, '\n// Client A was here\n');
  }, 'local');
  
  // Send the local update from Client A over the socket
  docs.A.on('update', (update) => {
    if (clientA.readyState === WebSocket.OPEN) {
      clientA.send(update);
    }
  });
  
  // Trigger local update manually to send it
  const localUpdate = Y.encodeStateAsUpdate(docs.A);
  clientA.send(localUpdate);

  // Wait for update propagation
  await new Promise(r => setTimeout(r, 1500));
  
  console.log(`🔄 Client B received A's edit: ${clientBReceivedUpdate}`);
  console.log(`🔄 Client C received A's edit: ${clientCReceivedUpdate}`);
  
  // 3. Create a new file via REST API
  console.log('➕ Creating new file "auth.js" via REST API...');
  try {
    const response = await fetch(`${serverUrl}/api/project/create-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'auth.js',
        content: '// Auth Helper\n',
        userName: 'Developer A'
      })
    });
    const resData = await response.json();
    console.log('✉️ REST Response:', resData);
  } catch (err) {
    console.error('❌ REST call failed:', err.message);
  }

  // Wait for file list propagation
  await new Promise(r => setTimeout(r, 1500));
  
  console.log(`📋 Client A received file list update: ${fileListReceived.A}`);
  console.log(`📋 Client B received file list update: ${fileListReceived.B}`);
  console.log(`📋 Client C received file list update: ${fileListReceived.C}`);
  
  // Close connections
  clientA.close();
  clientB.close();
  clientC.close();
  
  console.log('🏁 Validation Test Finished.');
}

runTest().catch(console.error);
