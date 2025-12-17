/**
 * Debug script to check client expiry time in 3X-UI panel
 * Run: node scripts/check-client-expiry.js
 */

const https = require('https');

const PANEL_URL = process.env.PANEL_URL || 'https://72.56.64.62:2053';
const PANEL_USER = process.env.PANEL_USER;
const PANEL_PASS = process.env.PANEL_PASS;
const INBOUND_ID = process.env.INBOUND_ID || '1';

if (!PANEL_USER || !PANEL_PASS) {
  console.error('❌ Error: PANEL_USER and PANEL_PASS must be set');
  process.exit(1);
}

console.log('🔍 Checking client expiry times...\n');

// Create HTTPS agent that ignores SSL errors
const agent = new https.Agent({
  rejectUnauthorized: false
});

// Step 1: Login
login()
  .then(cookie => {
    console.log('✅ Logged in successfully\n');
    return getInbound(cookie);
  })
  .then(inbound => {
    console.log(`📊 Inbound ID: ${inbound.id}`);
    console.log(`📊 Total clients: ${inbound.settings.clients?.length || 0}\n`);
    
    const clients = inbound.settings.clients || [];
    
    if (clients.length === 0) {
      console.log('⚠️  No clients found');
      return;
    }
    
    // Show last 5 clients
    const lastClients = clients.slice(-5);
    
    console.log('📋 Last 5 clients:\n');
    lastClients.forEach((client, index) => {
      const expiryDate = client.expiryTime 
        ? new Date(client.expiryTime).toLocaleString('ru-RU')
        : 'No expiry';
      
      const isExpired = client.expiryTime && client.expiryTime < Date.now();
      const status = isExpired ? '❌ EXPIRED' : '✅ Active';
      
      console.log(`${index + 1}. ${client.email}`);
      console.log(`   UUID: ${client.id}`);
      console.log(`   Expiry: ${expiryDate} ${status}`);
      console.log(`   Expiry timestamp: ${client.expiryTime}`);
      console.log(`   Current timestamp: ${Date.now()}`);
      console.log('');
    });
    
    // Check if expiry time format is wrong
    const firstClient = lastClients[0];
    if (firstClient && firstClient.expiryTime) {
      const expiry = firstClient.expiryTime;
      const now = Date.now();
      
      console.log('🔍 Expiry Time Analysis:');
      console.log(`   Stored value: ${expiry}`);
      console.log(`   Current time: ${now}`);
      console.log(`   Difference: ${expiry - now} ms`);
      
      if (expiry < now) {
        console.log('\n⚠️  PROBLEM: Expiry time is in the past!');
        console.log('   This means clients are created as already expired.');
        
        // Check if it's a seconds vs milliseconds issue
        const expiryAsSeconds = expiry * 1000;
        const dateFromSeconds = new Date(expiryAsSeconds);
        console.log(`\n   If expiry was in seconds: ${dateFromSeconds.toLocaleString('ru-RU')}`);
        
        if (expiryAsSeconds > now) {
          console.log('   ✅ This would be in the future - likely a seconds/milliseconds mismatch!');
        }
      }
    }
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  });

function login() {
  return new Promise((resolve, reject) => {
    const url = new URL('/login', PANEL_URL);
    const data = JSON.stringify({
      username: PANEL_USER,
      password: PANEL_PASS
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      agent
    };
    
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.success) {
            const cookie = res.headers['set-cookie']?.join(';');
            resolve(cookie);
          } else {
            reject(new Error('Login failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getInbound(cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/panel/api/inbounds/get/${INBOUND_ID}`, PANEL_URL);
    
    const options = {
      headers: {
        'Cookie': cookie
      },
      agent
    };
    
    https.get(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.success && result.obj) {
            const inbound = result.obj;
            inbound.settings = JSON.parse(inbound.settings);
            resolve(inbound);
          } else {
            reject(new Error('Failed to get inbound'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}
