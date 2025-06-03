const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Message = require('../models/Message');

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });
  const clients = new Map();

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    ws.on('message', async (message) => {
      try {
        const { type, data, token } = JSON.parse(message);

        if (type === 'authenticate') {
          // Verify JWT token
          const decoded = jwt.verify(token, env.JWT_SECRET);
          clients.set(decoded.id, ws);
          console.log(`User ${decoded.id} authenticated via WebSocket`);
        }

        if (type === 'message' && data && data.recipientId && data.content) {
          const senderId = jwt.verify(token, env.JWT_SECRET).id;
          
          // Save message to database
          const messageRecord = await Message.create({
            senderId,
            recipientId: data.recipientId,
            content: data.content
          });
          
          // Notify recipient if online
          if (clients.has(data.recipientId)) {
            clients.get(data.recipientId).send(JSON.stringify({
              type: 'message',
              data: {
                id: messageRecord.id,
                senderId,
                content: data.content,
                createdAt: messageRecord.created_at
              }
            }));
          }
          
          // Send confirmation to sender
          ws.send(JSON.stringify({
            type: 'message_sent',
            data: messageRecord
          }));
        }
      } catch (err) {
        console.error('WebSocket error:', err);
        ws.send(JSON.stringify({
          type: 'error',
          message: err.message
        }));
      }
    });

    ws.on('close', () => {
      // Remove client from map
      for (const [userId, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(userId);
          console.log(`User ${userId} disconnected from WebSocket`);
          break;
        }
      }
    });
  });

  return wss;
};

module.exports = setupWebSocket;