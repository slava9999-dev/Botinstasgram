#!/usr/bin/env node

/**
 * Setup Telegram Bot Webhook
 * 
 * Этот скрипт настраивает webhook для Telegram бота.
 * Запустите: node scripts/setup-telegram-webhook.js
 */

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = 'https://botinstasgram.vercel.app/api/bot/webhook';

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN not set in environment variables');
  console.log('\n📝 To fix:');
  console.log('1. Get your bot token from @BotFather');
  console.log('2. Add to Vercel: vercel env add TELEGRAM_BOT_TOKEN');
  console.log('3. Or set locally: export TELEGRAM_BOT_TOKEN=your_token_here');
  process.exit(1);
}

console.log('🤖 Setting up Telegram Bot Webhook...\n');
console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);
console.log(`🔑 Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);

// Set webhook
const setWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
const data = JSON.stringify({
  url: WEBHOOK_URL,
  allowed_updates: ['message']
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(setWebhookUrl, options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(body);
      
      if (result.ok) {
        console.log('\n✅ Webhook set successfully!');
        console.log(`📝 Description: ${result.description}`);
        
        // Get webhook info
        getWebhookInfo();
      } else {
        console.error('\n❌ Failed to set webhook:');
        console.error(result);
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Error parsing response:', error);
      console.error('Response:', body);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request error:', error);
  process.exit(1);
});

req.write(data);
req.end();

// Get webhook info
function getWebhookInfo() {
  const infoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
  
  https.get(infoUrl, (res) => {
    let body = '';
    
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(body);
        
        if (result.ok) {
          console.log('\n📊 Webhook Info:');
          console.log(`   URL: ${result.result.url}`);
          console.log(`   Pending updates: ${result.result.pending_update_count}`);
          console.log(`   Max connections: ${result.result.max_connections || 40}`);
          
          if (result.result.last_error_message) {
            console.log(`   ⚠️  Last error: ${result.result.last_error_message}`);
            console.log(`   ⚠️  Error date: ${new Date(result.result.last_error_date * 1000).toLocaleString()}`);
          }
          
          console.log('\n🎉 Setup complete! Your bot is ready to use.');
          console.log('\n📱 Test it:');
          console.log('   1. Open Telegram');
          console.log('   2. Find your bot');
          console.log('   3. Send /start');
        }
      } catch (error) {
        console.error('Error parsing webhook info:', error);
      }
    });
  }).on('error', (error) => {
    console.error('Error getting webhook info:', error);
  });
}
