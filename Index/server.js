const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = 34346;
const MAX_PLAYERS = 4;
const SPACE_MIN_X = 18;
const SPACE_MAX_X = 462;
const PLATFORM_MAX_X = 1780;
const PLATFORM_MAX_Y = 420;
const rooms = new Map();
const chats = new Map();
const globalRecords = new Map();
const spaceRooms = new Map();
const platformRooms = new Map();
const PLATFORM_LEVELS = ['1-1', '1-2', '2-1', '2-2'];

const server = http.createServer((req, res) => {
    const requestedPath = req.url === '/multiplayer.js' ? 'multiplayer.js' : 'index.html';
    const filePath = path.join(__dirname, requestedPath);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
        } else {
            const contentType = requestedPath.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'text/html; charset=utf-8';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
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

    socket.on('record:update', ({ name, score } = {}) => {
        const cleanName = String(name || 'Player').trim().slice(0, 20) || 'Player';
        const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
        const previous = globalRecords.get(socket.id);
        if (!previous || cleanScore > previous.score) globalRecords.set(socket.id, { name: cleanName, score: cleanScore, updated: Date.now() });
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
        room.score = Math.max(room.score, Math.floor(Number(score) || 0));
        io.to(`space:${room.id}`).emit('space:state', { roomId: room.id, players: [...room.players.values()], score: room.score, running: room.running });
    });

    socket.on('space:move', x => {
        const room = spaceRooms.get(socket.data.spaceRoomId);
        const player = room?.players.get(socket.id);
        if (!player || player.respawning) return;
        const nextX = Number(x);
        if (!Number.isFinite(nextX)) return;
        player.x = Math.max(SPACE_MIN_X, Math.min(SPACE_MAX_X, nextX));
        console.log(`[SPACE:MOVE] Player ${player.name} moved to x=${player.x}, room=${room.id}`);
        emitSpaceState(room);
    });

    socket.on('space:fire', () => {
        const room = spaceRooms.get(socket.data.spaceRoomId);
        const player = room?.players.get(socket.id);
        if (!player || player.respawning) return;
        io.to(`space:${room.id}`).emit('space:remote-fire', { playerId: socket.id, x: player.x });
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
        platformRooms.set(roomId, { id: roomId, players: new Map(), running: false, levelIndex: 0, items: createPlatformItems(0) });
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
        if (!item || item.collected || (kind !== 'coin' && kind !== 'powerUp')) return;
        item.collected = true;
        if (kind === 'coin') player.coins += 1;
        if (kind === 'powerUp') player.powerUp = item.type;
        emitPlatformState(room);
    });

    socket.on('platform:next-level', () => {
        const room = platformRooms.get(socket.data.platformRoomId);
        if (!room || !room.players.has(socket.id) || room.levelIndex >= PLATFORM_LEVELS.length - 1) return;
        room.levelIndex += 1;
        room.items = createPlatformItems(room.levelIndex);
        for (const player of room.players.values()) {
            player.x = 80;
            player.y = 250;
            player.vy = 0;
            player.powerUp = null;
        }
        emitPlatformState(room);
    });

    socket.on('platform:move', ({ x, y, vy } = {}) => {
        const room = platformRooms.get(socket.data.platformRoomId);
        const player = room?.players.get(socket.id);
        if (!player || !room.running) return;
        const nextX = Number(x);
        const nextY = Number(y);
        const nextVy = Number(vy);
        if (!Number.isFinite(nextX) || !Number.isFinite(nextY) || !Number.isFinite(nextVy)) return;
        player.x = Math.max(20, Math.min(PLATFORM_MAX_X, nextX));
        player.y = Math.max(20, Math.min(PLATFORM_MAX_Y, nextY));
        player.vy = Math.max(-14, Math.min(14, nextVy));
        emitPlatformState(room);
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
    room.players.set(socket.id, { id: socket.id, name: cleanName, lives: 5, respawning: false, x: 240 });
    socket.data.spaceRoomId = roomId;
    socket.join(`space:${roomId}`);
    emitSpaceState(room);
}

function emitSpaceState(room) {
    const playersData = [...room.players.values()];
    console.log(`[EMIT STATE] Room ${room.id}: ${playersData.length} players, running=${room.running}, players=[${playersData.map(p => `${p.name}:${p.x}`).join(',')}]`);
    io.to(`space:${room.id}`).emit('space:state', { roomId: room.id, players: playersData, score: room.score, running: room.running });
}

function joinPlatformRoom(socket, roomId, name) {
    leavePlatformRoom(socket);
    const room = platformRooms.get(roomId);
    const cleanName = String(name || 'Player').trim().slice(0, 16) || 'Player';
    room.players.set(socket.id, { id: socket.id, name: cleanName, x: 80 + room.players.size * 90, y: 250, vy: 0, coins: 0, powerUp: null });
    socket.data.platformRoomId = roomId;
    socket.join(`platform:${roomId}`);
    emitPlatformState(room);
}

function emitPlatformState(room) {
    io.to(`platform:${room.id}`).emit('platform:state', { roomId: room.id, players: [...room.players.values()], running: room.running, level: PLATFORM_LEVELS[room.levelIndex], levelIndex: room.levelIndex, items: room.items });
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
