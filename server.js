require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Chat Schema
const ChatSchema = new mongoose.Schema({
    chatId: String,
    messages: [{ sender: String, text: String, timestamp: Date }]
});
const Chat = mongoose.model('Chat', ChatSchema);

// Handle WebSocket connections
wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
        const { chatId, sender, text } = JSON.parse(data);
        const message = { sender, text, timestamp: new Date() };

        let chat = await Chat.findOne({ chatId });
        if (!chat) {
            chat = new Chat({ chatId, messages: [] });
        }
        chat.messages.push(message);
        await chat.save();

        // Broadcast message to all clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ chatId, message }));
            }
        });
    });
});

// API Endpoint to Get Messages
app.get('/chats/:chatId', async (req, res) => {
    const chat = await Chat.findOne({ chatId: req.params.chatId });
    res.json(chat ? chat.messages : []);
});

// Start Server
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
