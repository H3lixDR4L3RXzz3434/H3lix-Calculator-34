const { Pool } = require('pg');
const webPush = require('web-push');

// Database persistence is optional for local and solo deployments.
const pool = process.env.DATABASE_URL ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
}) : null;

// Initialize database table if it doesn't exist
async function initDB() {
    if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        level INT DEFAULT 1,
        coins INT DEFAULT 0,
        score INT DEFAULT 0,
        data JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                device_id VARCHAR(64) PRIMARY KEY,
                subscription JSONB NOT NULL,
                last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                reminders_sent INT NOT NULL DEFAULT 0,
                last_reminded_at TIMESTAMPTZ
            );
    `);
    console.log('✅ Database connected and initialized in Supabase.');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  }
}

initDB();

// Save or update player progress
async function savePlayerProgress(playerId, username, level, coins, score, extraData = {}) {
    if (!pool) return false;
  const query = `
    INSERT INTO players (id, username, level, coins, score, data, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (id) 
    DO UPDATE SET 
      username = EXCLUDED.username,
      level = EXCLUDED.level,
      coins = EXCLUDED.coins,
      score = EXCLUDED.score,
      data = EXCLUDED.data,
      updated_at = NOW();
  `;
  try {
    await pool.query(query, [playerId, username, level, coins, score, JSON.stringify(extraData)]);
    console.log(`💾 Progress saved for: ${username}`);
    return true;
  } catch (err) {
    console.error(`❌ Error saving progress for ${playerId}:`, err);
    return false;
  }
}

// Load player progress
async function getPlayerProgress(playerId) {
    if (!pool) return null;
  try {
    const res = await pool.query('SELECT * FROM players WHERE id = $1', [playerId]);
    if (res.rows.length > 0) {
      return res.rows[0];
    }
    return null;
  } catch (err) {
    console.error(`❌ Error loading progress for ${playerId}:`, err);
    return null;
  }
}

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const crypto = require('crypto');

const PORT = 34346;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const pushSubscriptions = new Map();
const pushEnabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (pushEnabled) webPush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 16384) { reject(new Error('Request body too large')); req.destroy(); }
        });
        req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

async function savePushSubscription(deviceId, subscription) {
    if (pool) {
        await pool.query(`INSERT INTO push_subscriptions (device_id, subscription, last_active_at, reminders_sent, last_reminded_at)
            VALUES ($1, $2, NOW(), 0, NULL)
            ON CONFLICT (device_id) DO UPDATE SET subscription = EXCLUDED.subscription, last_active_at = NOW(), reminders_sent = 0, last_reminded_at = NULL`, [deviceId, JSON.stringify(subscription)]);
    } else {
        pushSubscriptions.set(deviceId, { subscription, lastActiveAt: Date.now(), remindersSent: 0, lastRemindedAt: null });
    }
}

async function updatePushActivity(deviceId) {
    if (pool) await pool.query('UPDATE push_subscriptions SET last_active_at = NOW(), reminders_sent = 0, last_reminded_at = NULL WHERE device_id = $1', [deviceId]);
    else {
        const device = pushSubscriptions.get(deviceId);
        if (device) Object.assign(device, { lastActiveAt: Date.now(), remindersSent: 0, lastRemindedAt: null });
    }
}

async function deletePushSubscription(deviceId) {
    if (pool) await pool.query('DELETE FROM push_subscriptions WHERE device_id = $1', [deviceId]);
    else pushSubscriptions.delete(deviceId);
}

async function getInactivePushSubscriptions() {
    if (pool) {
        const result = await pool.query('SELECT device_id, subscription, last_active_at, reminders_sent, last_reminded_at FROM push_subscriptions WHERE reminders_sent < 3 AND last_active_at < NOW() - INTERVAL \'24 hours\' AND (last_reminded_at IS NULL OR last_reminded_at < NOW() - INTERVAL \'24 hours\')');
        return result.rows.map(row => ({ deviceId: row.device_id, subscription: row.subscription, remindersSent: row.reminders_sent }));
    }
    const inactiveBefore = Date.now() - 24 * 60 * 60 * 1000;
    return [...pushSubscriptions.entries()]
        .filter(([, device]) => device.remindersSent < 3 && device.lastActiveAt < inactiveBefore && (!device.lastRemindedAt || device.lastRemindedAt < inactiveBefore))
        .map(([deviceId, device]) => ({ deviceId, subscription: device.subscription, remindersSent: device.remindersSent }));
}

async function markPushReminderSent(deviceId) {
    if (pool) await pool.query('UPDATE push_subscriptions SET reminders_sent = reminders_sent + 1, last_reminded_at = NOW() WHERE device_id = $1', [deviceId]);
    else {
        const device = pushSubscriptions.get(deviceId);
        if (device) { device.remindersSent += 1; device.lastRemindedAt = Date.now(); }
    }
}

async function sendPlayReminders() {
    if (!pushEnabled) return;
    const messages = [
        ['¡Te esperamos! 🎮', 'Tenemos una partida lista y cuentas que resolver 🧮✨'],
        ['¡Hora de jugar! 🚀', 'Tus minijuegos te esperan. ¿Te echas una ronda? 🎯'],
        ['La calculadora te extraña 🧮', 'Vuelve por unos retos rápidos y una buena racha 🔥'],
        ['¿Una partida? 👾', 'Entra, juega un rato y supera tu próximo récord 🏆'],
        ['¡Tu próxima misión te espera! 🌟', 'Unos cálculos, unos minijuegos y a divertirse 🎲'],
        ['Pausa para jugar 🎮', 'Hay nuevos números que conquistar y récords que romper 💥'],
        ['¡Vamos, tú puedes! 💡', 'Abre el juego y demuestra quién manda en los cálculos 🧠'],
        ['Un ratito de diversión ✨', 'Te esperamos para jugar, calcular y sumar puntos 🪙']
    ];
    for (const device of await getInactivePushSubscriptions()) {
        const [title, body] = messages[crypto.randomInt(messages.length)];
        try {
            await webPush.sendNotification(device.subscription, JSON.stringify({ title, body, url: '/' }), { TTL: 60 * 60 });
            await markPushReminderSent(device.deviceId);
        } catch (error) {
            if (error.statusCode === 404 || error.statusCode === 410) await deletePushSubscription(device.deviceId);
            else console.error('Push notification failed:', error.message);
        }
    }
}

async function handlePushRequest(req, res, pathname) {
    try {
        if (req.method === 'GET' && pathname === '/api/push/config') return sendJson(res, 200, { enabled: pushEnabled, publicKey: pushEnabled ? VAPID_PUBLIC_KEY : '' });
        if (!['POST', 'DELETE'].includes(req.method)) return sendJson(res, 405, { error: 'Method not allowed' });
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return sendJson(res, 403, { error: 'Invalid origin' });
        const body = await readJsonBody(req);
        if (!/^[\da-f-]{36}$/i.test(body.deviceId || '')) return sendJson(res, 400, { error: 'Invalid device id' });
        if (req.method === 'POST' && !pushEnabled) return sendJson(res, 503, { error: 'Push notifications are not configured' });
        if (pathname === '/api/push/subscription' && req.method === 'POST') {
            const endpoint = new URL(body.subscription?.endpoint || '');
            if (endpoint.protocol !== 'https:' || !body.subscription?.keys?.p256dh || !body.subscription?.keys?.auth) return sendJson(res, 400, { error: 'Invalid push subscription' });
            await savePushSubscription(body.deviceId, body.subscription);
            return sendJson(res, 201, { saved: true });
        }
        if (pathname === '/api/push/subscription' && req.method === 'DELETE') {
            await deletePushSubscription(body.deviceId);
            return sendJson(res, 200, { removed: true });
        }
        if (pathname === '/api/push/activity' && req.method === 'POST') {
            await updatePushActivity(body.deviceId);
            return sendJson(res, 200, { updated: true });
        }
        return sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
        console.error('Push request failed:', error.message);
        return sendJson(res, 400, { error: 'Invalid push request' });
    }
}

setInterval(() => { sendPlayReminders().catch(error => console.error('Push reminder job failed:', error.message)); }, 15 * 60 * 1000);
const MAX_PLAYERS = 4;
const SPACE_MIN_X = 18;
const SPACE_MAX_X = 462;
const SPACE_SPAWNS = [100, 380, 220, 60];
const PLATFORM_MAX_X = 1780;
const PLATFORM_MAX_Y = 420;
const rooms = new Map();
const chats = new Map();
const globalRecords = new Map();
const spaceRooms = new Map();
const platformRooms = new Map();
const PLATFORM_LEVELS = ['1-1', '1-2', '2-1', '2-2'];

setInterval(() => {
    for (const room of spaceRooms.values()) {
        if (room.running) emitSpaceState(room);
    }
}, 100);

const server = http.createServer((req, res) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bad request');
        return;
    }
    if (pathname.startsWith('/api/push/')) { handlePushRequest(req, res, pathname); return; }
    const staticFiles = new Map([
        ['/', 'index.html'],
        ['/index.html', 'index.html'],
        ['/multiplayer.js', 'multiplayer.js'],
        ['/service-worker.js', 'service-worker.js'],
        ['/manifest.webmanifest', 'manifest.webmanifest'],
        ['/Imagen 26 (1).ico', 'Imagen 26 (1).ico'],
        ['/26k Icon 256x256.ico', '26k Icon 256x256.ico'],
        ['/26k%20Icon%20256x256.ico', '26k Icon 256x256.ico'],
        ['/convertico-captura de pantalla-32x32 (1).ico', 'convertico-captura de pantalla-32x32 (1).ico'],
        ['/05 Ruins.mp3', '05 Ruins.mp3'],
        ['/uwa-temperate.mp3', 'uwa-temperate.mp3'],
        ['/06 Uwa!! So Temperate♫.mp3', '06 Uwa!! So Temperate♫.mp3'],
        ['/Wiosna97 - cursed_church_ambience.mp3', 'Wiosna97 - cursed_church_ambience.mp3'],
        ['/Fnaf_1_Chica_Jumpscare.mp4', 'Fnaf_1_Chica_Jumpscare.mp4']
    ]);
    const requestedPath = staticFiles.get(pathname);
    if (!requestedPath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
    }
    const filePath = path.join(__dirname, requestedPath);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
        } else {
            const contentType = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.webmanifest': 'application/manifest+json; charset=utf-8',
                '.ico': 'image/x-icon',
                '.mp3': 'audio/mpeg',
                '.mp4': 'video/mp4'
            }[path.extname(requestedPath).toLowerCase()] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

const io = new Server(server);

function createRoomId() {
    let roomId;
    do roomId = Math.random().toString(36).slice(2, 6).toUpperCase(); while (rooms.has(roomId));
    return roomId;
}

function createRoom() {
    const room = { id: createRoomId(), players: new Map(), target: null, round: 0, running: false, scores: {} };
    rooms.set(room.id, room);
    return room;
}

function publicRoom(room) {
    return { id: room.id, round: room.round, target: room.target, running: room.running, players: [...room.players.values()].map(player => ({ id: player.id, name: player.name, score: room.scores[player.id] || 0 })) };
}

function broadcastRoom(room) {
    io.to(room.id).emit('room:state', publicRoom(room));
}

function startRound(room) {
    room.round += 1;
    room.target = Math.floor(Math.random() * 9);
    room.running = true;
    broadcastRoom(room);
}

function createChatId() {
    let chatId;
    do chatId = Math.random().toString(36).slice(2, 8).toUpperCase(); while (chats.has(chatId));
    return chatId;
}

function leaveChat(socket) {
    const chatId = socket.data.chatId;
    if (!chatId) return;
    const chat = chats.get(chatId);
    if (chat) {
        chat.delete(socket.id);
        if (!chat.size) chats.delete(chatId);
    }
    socket.leave(`chat:${chatId}`);
    socket.data.chatId = null;
}

function createSpaceRoomId() {
    let roomId;
    do roomId = Math.random().toString(36).slice(2, 6).toUpperCase(); while (spaceRooms.has(roomId));
    return roomId;
}

function createPlatformRoomId() {
    let roomId;
    do roomId = Math.random().toString(36).slice(2, 6).toUpperCase(); while (platformRooms.has(roomId));
    return roomId;
}

function leaveSpaceRoom(socket) {
    const roomId = socket.data.spaceRoomId;
    if (!roomId) return;
    const room = spaceRooms.get(roomId);
    if (room) {
        room.players.delete(socket.id);
        if (!room.players.size) spaceRooms.delete(roomId);
        else io.to(`space:${roomId}`).emit('space:state', { roomId, players: [...room.players.values()], score: room.score, running: room.running });
    }
    socket.leave(`space:${roomId}`);
    socket.data.spaceRoomId = null;
}

function leavePlatformRoom(socket) {
    const roomId = socket.data.platformRoomId;
    if (!roomId) return;
    const room = platformRooms.get(roomId);
    if (room) {
        room.players.delete(socket.id);
        if (!room.players.size) platformRooms.delete(roomId);
        else emitPlatformState(room);
    }
    socket.leave(`platform:${roomId}`);
    socket.data.platformRoomId = null;
}

io.on('connection', (socket) => {
    socket.on('room:create', ({ name } = {}) => {
        if (socket.data.roomId) return;
        joinRoom(socket, createRoom(), name);
    });

    socket.on('room:join', ({ roomId, name } = {}) => {
        if (socket.data.roomId) return;
        const room = rooms.get(String(roomId || '').trim().toUpperCase());
        if (!room) return socket.emit('room:error', 'Room not found.');
        if (room.players.size >= MAX_PLAYERS) return socket.emit('room:error', 'Room is full.');
        joinRoom(socket, room, name);
    });

    socket.on('round:start', () => {
        const room = rooms.get(socket.data.roomId);
        if (room && room.players.size >= 1 && !room.running) startRound(room);
    });

    socket.on('room:leave', () => leaveRoom(socket));

    socket.on('chat:create', ({ name } = {}) => {
        leaveChat(socket);
        const chatId = createChatId();
        chats.set(chatId, new Map());
        joinChat(socket, chatId, name);
    });

    socket.on('chat:join', ({ chatId, name } = {}) => {
        const cleanId = String(chatId || '').trim().toUpperCase();
        if (!chats.has(cleanId)) return socket.emit('chat:error', 'Chat code not found.');
        joinChat(socket, cleanId, name);
    });

    socket.on('chat:message', message => {
        const chatId = socket.data.chatId;
        const chat = chats.get(chatId);
        if (!chat) return;
        const cleanMessage = String(message || '').trim().slice(0, 240);
        if (!cleanMessage) return;
        io.to(`chat:${chatId}`).emit('chat:message', { name: chat.get(socket.id) || 'Player', message: cleanMessage, sentAt: Date.now() });
    });

    socket.on('chat:leave', () => leaveChat(socket));

    socket.on('record:update', async ({ name, score } = {}) => {
        const cleanName = String(name || 'Player').trim().slice(0, 20) || 'Player';
        const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
        const previous = globalRecords.get(socket.id);
        if (!previous || cleanScore > previous.score) {
            globalRecords.set(socket.id, { name: cleanName, score: cleanScore, updated: Date.now() });
            await savePlayerProgress(socket.id, cleanName, 1, 0, cleanScore, { source: 'global-record' });
        }
        socket.emit('records:state', [...globalRecords.values()].sort((a, b) => b.score - a.score).slice(0, 10));
    });

    socket.on('records:request', () => socket.emit('records:state', [...globalRecords.values()].sort((a, b) => b.score - a.score).slice(0, 10)));

    socket.on('space:create', ({ name } = {}) => {
        leaveSpaceRoom(socket);
        const roomId = createSpaceRoomId();
        spaceRooms.set(roomId, { id: roomId, players: new Map(), score: 0, running: false });
        joinSpaceRoom(socket, roomId, name);
    });

    socket.on('space:join', ({ roomId, name } = {}) => {
        const cleanId = String(roomId || '').trim().toUpperCase();
        const room = spaceRooms.get(cleanId);
        if (!room) return socket.emit('space:error', 'Space room not found.');
        if (room.players.size >= MAX_PLAYERS) return socket.emit('space:error', 'Space room is full.');
        joinSpaceRoom(socket, cleanId, name);
    });

    socket.on('space:start', () => {
        const room = spaceRooms.get(socket.data.spaceRoomId);
        if (!room) return;
        room.running = true;
        io.to(`space:${room.id}`).emit('space:state', { roomId: room.id, players: [...room.players.values()], score: room.score, running: true });
    });

    socket.on('space:score', score => {
        const room = spaceRooms.get(socket.data.spaceRoomId);
        if (!room) return;
        const nextScore = Math.max(0, Math.floor(Number(score) || 0));
        if (nextScore <= room.score) return;
        room.score = nextScore;
        io.to(`space:${room.id}`).emit('space:state', { roomId: room.id, players: [...room.players.values()], score: room.score, running: room.running });
    });

    socket.on('space:move', x => {
        const room = spaceRooms.get(socket.data.spaceRoomId);
        const player = room?.players.get(socket.id);
        if (!player || player.respawning) return;
        const nextX = Number(x);
        if (!Number.isFinite(nextX)) return;
        player.x = Math.max(SPACE_MIN_X, Math.min(SPACE_MAX_X, nextX));
        emitSpaceState(room);
    });

    socket.on('space:fire', x => {
        const room = spaceRooms.get(socket.data.spaceRoomId);
        const player = room?.players.get(socket.id);
        if (!player || player.respawning) return;
        const shotX = Number(x);
        if (Number.isFinite(shotX)) player.x = Math.max(SPACE_MIN_X, Math.min(SPACE_MAX_X, shotX));
        io.to(`space:${room.id}`).emit('space:remote-fire', { playerId: socket.id, x: player.x });
        emitSpaceState(room);
    });

    socket.on('space:damage', () => {
        const room = spaceRooms.get(socket.data.spaceRoomId);
        const player = room?.players.get(socket.id);
        if (!player || player.respawning) return;
        player.lives -= 1;
        if (player.lives <= 0) {
            player.respawning = true;
            setTimeout(() => {
                const activeRoom = spaceRooms.get(socket.data.spaceRoomId);
                const activePlayer = activeRoom?.players.get(socket.id);
                if (!activePlayer) return;
                activePlayer.lives = 5;
                activePlayer.respawning = false;
                emitSpaceState(activeRoom);
            }, 2000);
        }
        emitSpaceState(room);
    });

    socket.on('space:leave', () => leaveSpaceRoom(socket));

    socket.on('platform:create', ({ name } = {}) => {
        leavePlatformRoom(socket);
        const roomId = createPlatformRoomId();
        platformRooms.set(roomId, { id: roomId, players: new Map(), running: false, levelIndex: 0, items: createPlatformItems(0), transitionPending: false, transitionTimeout: null });
        joinPlatformRoom(socket, roomId, name);
    });

    socket.on('platform:join', ({ roomId, name } = {}) => {
        const cleanId = String(roomId || '').trim().toUpperCase();
        const room = platformRooms.get(cleanId);
        if (!room) return socket.emit('platform:error', 'Platform room not found.');
        if (room.players.size >= MAX_PLAYERS) return socket.emit('platform:error', 'Platform room is full.');
        joinPlatformRoom(socket, cleanId, name);
    });

    socket.on('platform:start', () => {
        const room = platformRooms.get(socket.data.platformRoomId);
        if (!room) return;
        room.running = true;
        emitPlatformState(room);
    });

    socket.on('platform:collect', ({ kind, id } = {}) => {
        const room = platformRooms.get(socket.data.platformRoomId);
        const player = room?.players.get(socket.id);
        if (!room || !player || !room.running) return;
        const item = room.items.find(entry => entry.id === String(id));
        if (!item || item.collected || item.kind !== kind) return;
        if (Math.abs(player.x - item.x) > 60 || Math.abs(player.y - item.y) > 90) return;
        item.collected = true;
        if (kind === 'coin') player.coins += 1;
        if (kind === 'powerUp') player.powerUp = item.type;
        emitPlatformState(room);
    });

    socket.on('platform:move', ({ x, y, vy } = {}) => {
        const room = platformRooms.get(socket.data.platformRoomId);
        const player = room?.players.get(socket.id);
        if (!player || !room.running || room.transitionPending) return;
        const nextX = Number(x);
        const nextY = Number(y);
        const nextVy = Number(vy);
        if (!Number.isFinite(nextX) || !Number.isFinite(nextY) || !Number.isFinite(nextVy)) return;
        const now = Date.now();
        const elapsed = player.lastMoveAt ? Math.max(.04, Math.min(1, (now - player.lastMoveAt) / 1000)) : .2;
        const maxHorizontalDistance = 240 * elapsed + 30;
        const maxVerticalDistance = 600 * elapsed + 80;
        if (Math.abs(nextX - player.x) > maxHorizontalDistance || Math.abs(nextY - player.y) > maxVerticalDistance) return;
        player.x = Math.max(20, Math.min(PLATFORM_MAX_X, nextX));
        player.y = Math.max(20, Math.min(PLATFORM_MAX_Y, nextY));
        player.vy = Math.max(-14, Math.min(14, nextVy));
        player.lastMoveAt = now;
        if (player.x >= 1680 && room.levelIndex < PLATFORM_LEVELS.length - 1) {
            room.transitionPending = true;
            emitPlatformState(room);
            room.transitionTimeout = setTimeout(() => advancePlatformLevel(room), 4000);
        }
        socket.to(`platform:${room.id}`).emit('platform:players', [...room.players.values()]);
    });

    socket.on('platform:leave', () => leavePlatformRoom(socket));

    socket.on('target:hit', index => {
        const room = rooms.get(socket.data.roomId);
        if (!room || !room.running || Number(index) !== room.target) return;
        room.running = false;
        room.scores[socket.id] = (room.scores[socket.id] || 0) + 1;
        io.to(room.id).emit('round:winner', { name: room.players.get(socket.id)?.name || 'Player', score: room.scores[socket.id] });
        broadcastRoom(room);
        setTimeout(() => { if (rooms.has(room.id) && room.players.size) startRound(room); }, 1400);
    });

    socket.on('disconnect', () => {
        leaveRoom(socket);
        leaveChat(socket);
        leaveSpaceRoom(socket);
        leavePlatformRoom(socket);
    });
});

function joinSpaceRoom(socket, roomId, name) {
    leaveSpaceRoom(socket);
    const room = spaceRooms.get(roomId);
    const cleanName = String(name || 'Player').trim().slice(0, 16) || 'Player';
    const occupiedSpawns = new Set([...room.players.values()].map(player => player.x));
    const spawnX = SPACE_SPAWNS.find(x => !occupiedSpawns.has(x)) ?? SPACE_MIN_X;
    room.players.set(socket.id, { id: socket.id, name: cleanName, lives: 5, respawning: false, x: spawnX });
    socket.data.spaceRoomId = roomId;
    socket.join(`space:${roomId}`);
    emitSpaceState(room);
}

function emitSpaceState(room) {
    const playersData = [...room.players.values()];
    io.to(`space:${room.id}`).emit('space:state', { roomId: room.id, players: playersData, score: room.score, running: room.running });
}

function joinPlatformRoom(socket, roomId, name) {
    leavePlatformRoom(socket);
    const room = platformRooms.get(roomId);
    const cleanName = String(name || 'Player').trim().slice(0, 16) || 'Player';
    room.players.set(socket.id, { id: socket.id, name: cleanName, x: 80 + room.players.size * 90, y: 250, vy: 0, coins: 0, powerUp: null, lastMoveAt: 0 });
    socket.data.platformRoomId = roomId;
    socket.join(`platform:${roomId}`);
    emitPlatformState(room);
}

function emitPlatformState(room) {
    io.to(`platform:${room.id}`).emit('platform:state', { roomId: room.id, players: [...room.players.values()], running: room.running, level: PLATFORM_LEVELS[room.levelIndex], levelIndex: room.levelIndex, items: room.items, transitionPending: room.transitionPending });
}

function advancePlatformLevel(room) {
    if (platformRooms.get(room.id) !== room || !room.transitionPending || room.levelIndex >= PLATFORM_LEVELS.length - 1) return;
    room.levelIndex += 1;
    room.items = createPlatformItems(room.levelIndex);
    room.transitionPending = false;
    room.transitionTimeout = null;
    [...room.players.values()].forEach((player, index) => {
        player.x = 80 + index * 90;
        player.y = 250;
        player.vy = 0;
        player.powerUp = null;
        player.lastMoveAt = 0;
    });
    emitPlatformState(room);
}

function createPlatformItems(levelIndex) {
    const offset = levelIndex * 18;
    return [
        { id: `coin-${levelIndex}-1`, kind: 'coin', x: 250 + offset, y: 300, collected: false },
        { id: `coin-${levelIndex}-2`, kind: 'coin', x: 540 + offset, y: 245, collected: false },
        { id: `coin-${levelIndex}-3`, kind: 'coin', x: 900 + offset, y: 315, collected: false },
        { id: `power-${levelIndex}-1`, kind: 'powerUp', type: levelIndex % 2 ? 'super-star' : 'mushroom', x: 1210 + offset, y: 245, collected: false }
    ];
}

function joinChat(socket, chatId, name) {
    leaveChat(socket);
    const cleanName = String(name || 'Player').trim().slice(0, 16) || 'Player';
    chats.get(chatId).set(socket.id, cleanName);
    socket.data.chatId = chatId;
    socket.join(`chat:${chatId}`);
    socket.emit('chat:joined', { chatId });
}

function leaveRoom(socket) {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;
    room.players.delete(socket.id);
    delete room.scores[socket.id];
    socket.leave(room.id);
    socket.data.roomId = null;
    if (!room.players.size) rooms.delete(room.id);
    else if (!room.running) startRound(room);
    else broadcastRoom(room);
}

function joinRoom(socket, room, name) {
    const cleanName = String(name || 'Player').trim().slice(0, 16) || 'Player';
    room.players.set(socket.id, { id: socket.id, name: cleanName });
    room.scores[socket.id] = room.scores[socket.id] || 0;
    socket.data.roomId = room.id;
    socket.join(room.id);
    socket.emit('room:joined', { roomId: room.id, playerId: socket.id });
    broadcastRoom(room);
    if (!room.running) startRound(room);
}

server.listen(PORT, () => {
    console.log(`Servidor multijugador corriendo en: http://localhost:${PORT}`);
});
