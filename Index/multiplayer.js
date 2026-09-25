(() => {
  const socket = io();
  const style = document.createElement('style');
  style.textContent = `.multiplayer-tag{display:inline-block;margin-left:6px;padding:4px 6px;color:#123b20;background:#b9e8b7;border:2px solid #4d9b62;font-size:.36rem;vertical-align:middle}.chat-menu-button{background:#b9e8b7!important;border-color:#4d9b62!important;color:#20542c!important;box-shadow:0 4px 0 #347746!important}.chat-widget{position:fixed;left:18px;bottom:18px;z-index:35;width:min(340px,calc(100vw - 36px));padding:14px;border:3px solid #83c98e;color:#21472a;background:#effff0;box-shadow:5px 5px 0 #5d9f69;transform:translateY(calc(100% + 30px));opacity:0;pointer-events:none;transition:transform .2s ease,opacity .2s ease}.chat-widget.open{transform:translateY(0);opacity:1;pointer-events:auto}.chat-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.chat-heading h2{margin:0;font-size:.65rem}.chat-widget input,.chat-widget button{min-height:36px;padding:7px;border:2px solid #83c98e;color:#21472a;background:#fff;font:.42rem 'Press Start 2P',monospace}.chat-widget button{background:#c9f5ca;box-shadow:2px 2px 0 #5d9f69;cursor:pointer}.chat-status{min-height:1.5em;margin:8px 0;color:#4e7655;font-size:.42rem;line-height:1.6}.chat-connect,.chat-compose{display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:8px}.chat-create{grid-column:1/-1;width:100%}.chat-messages{display:flex;flex-direction:column;gap:5px;height:130px;margin:8px 0;padding:8px;border:2px solid #b4e8ba;background:#fff;overflow-y:auto;list-style:none;font-size:.4rem;line-height:1.6}.chat-messages strong{color:#328044}.arena-cell.target-ready{color:#102d1b;background:#83f28f;border-color:#d8ffdb;box-shadow:0 0 14px #83f28f,inset 0 0 18px rgba(255,255,255,.75);animation:arena-target-pulse .8s ease-in-out infinite alternate}@keyframes arena-target-pulse{from{transform:scale(.97)}to{transform:scale(1.03)}}.space-invaders{position:relative!important;inset:auto!important;width:min(760px,calc(100vw - 32px))!important;max-width:760px!important;height:auto!important;max-height:none!important;margin:24px auto!important;padding:24px!important}.space-invaders .space-canvas{width:100%;height:auto;max-height:520px}.game-fullscreen-toggle,.game-fullscreen-exit,.fullscreen-toggle{display:none!important}@media(max-width:520px){.chat-widget{left:10px;bottom:10px;width:calc(100vw - 20px)}.space-invaders{width:calc(100vw - 20px)!important;padding:16px!important}}`;
  document.head.appendChild(style);
  const notificationStyle = document.createElement('style');
  notificationStyle.textContent = '.chat-menu-button{position:relative}.chat-unread{display:none;position:absolute;top:5px;right:7px;min-width:20px;padding:4px;border:2px solid #fff;border-radius:10px;color:#fff;background:#d92945;font-size:.38rem;line-height:1}.chat-menu-button.has-unread .chat-unread{display:block}.chat-notification{display:none;min-height:1.5em;margin:8px 0;color:#a9283d;font-size:.42rem;line-height:1.6}.chat-notification.visible{display:block}';
  document.head.appendChild(notificationStyle);
  const buttonStyle = document.createElement('style');
  buttonStyle.textContent = `#home-chat{display:flex!important;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:68px;padding:14px 18px!important;white-space:nowrap}#home-chat .multiplayer-tag{flex:0 0 auto;margin-left:auto!important}#catalog-multiplayer{display:block!important;width:100%!important;min-height:112px;padding:20px!important}#catalog-multiplayer strong{display:flex;align-items:center;justify-content:space-between;gap:12px;line-height:1.5}#catalog-multiplayer .multiplayer-tag{flex:0 0 auto;margin-left:auto!important;white-space:nowrap}.multiplayer-tag{line-height:1.3;white-space:nowrap}@media(max-width:520px){#home-chat{min-height:62px;padding:12px 14px!important}#catalog-multiplayer{min-height:96px}#catalog-multiplayer strong{align-items:flex-start;flex-direction:column;gap:6px}}`;
  document.head.appendChild(buttonStyle);
  const windowStyle = document.createElement('style');
  windowStyle.textContent = `.chat-widget{min-width:260px;min-height:170px;resize:both;overflow:hidden}.chat-widget.dragged{transform:none}.chat-widget.minimized{height:42px!important;min-height:42px!important;resize:none}.chat-widget.minimized>*:not(.chat-heading){display:none}.chat-widget.maximized{left:4vw!important;top:4vh!important;right:4vw!important;bottom:4vh!important;width:auto!important;height:auto!important;min-width:0;min-height:0}.chat-heading{cursor:move;user-select:none}.chat-window-actions{display:flex;gap:4px}.chat-window-actions button{min-width:30px!important;min-height:28px!important;padding:4px!important}.chat-resize-hint{position:absolute;right:3px;bottom:1px;color:#5d9f69;font-size:12px;pointer-events:none}`;
  document.head.appendChild(windowStyle);
  const modeStyle = document.createElement('style');
  modeStyle.textContent = `.mode-select-screen,.multiplayer-mod{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:var(--light);opacity:0;visibility:hidden;pointer-events:none}.mode-select-screen.visible,.multiplayer-mod.visible{opacity:1;visibility:visible;pointer-events:auto}.mode-select-card,.multiplayer-mod-card{width:min(520px,100%);padding:34px;border:3px solid var(--accent);background:var(--panel);box-shadow:8px 8px 0 var(--theme-dark);text-align:center}.mode-select-card h2,.multiplayer-mod-card h2{margin:0 0 14px;color:var(--accent);font-size:1.1rem}.mode-kicker{margin:0 0 14px;color:var(--gold);font-size:.46rem;letter-spacing:2px}.mode-select-card p:not(.mode-kicker),.multiplayer-mod-card p:not(.mode-kicker){color:var(--muted);font-size:.48rem;line-height:1.8}.mode-select-actions,.multiplayer-mod-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px}.mode-select-actions button,.multiplayer-mod-actions button,.multiplayer-mod-card>#mod-back{min-height:50px;padding:10px;border:2px solid var(--accent);color:#fff;background:var(--theme-mid);box-shadow:3px 3px 0 var(--theme-dark);font:.5rem 'Press Start 2P',monospace;cursor:pointer}.multiplayer-mod-card>#mod-back{width:100%;margin-top:18px;color:var(--ink);background:var(--theme-soft)}.space-online-panel{position:fixed;inset:0;z-index:105;display:grid;place-items:center;padding:24px;background:var(--light)}.space-online-card{width:min(560px,100%);padding:28px;border:3px solid var(--accent);background:var(--panel);box-shadow:8px 8px 0 var(--theme-dark);text-align:center}.space-online-card h2{color:var(--accent);font-size:.9rem}.space-online-card input,.space-online-card button{min-height:42px;padding:9px;border:2px solid var(--accent);font:.45rem 'Press Start 2P',monospace}.space-online-card input{width:100%;color:var(--ink);background:var(--theme-soft)}.space-online-card button{color:#fff;background:var(--theme-mid);box-shadow:3px 3px 0 var(--theme-dark);cursor:pointer}.space-online-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.space-online-status{min-height:32px;color:var(--muted);font-size:.45rem;line-height:1.7}.space-online-players{color:var(--gold);font-size:.45rem;line-height:1.8}`;
  document.head.appendChild(modeStyle);
  function ensureMultiplayerUI() {
    if (!document.querySelector('#mode-select-screen')) {
      const modeScreen = document.createElement('section');
      modeScreen.id = 'mode-select-screen';
      modeScreen.className = 'mode-select-screen';
      modeScreen.innerHTML = '<div class="mode-select-card"><p class="mode-kicker">H3LIX ONLINE</p><h2>Select a mode</h2><p id="mode-select-status">Checking server...</p><div class="mode-select-actions"><button id="mode-solo" type="button">Solo</button><button id="mode-multiplayer" type="button" hidden>Multiplayer</button></div></div>';
      document.body.appendChild(modeScreen);
    }
    if (!document.querySelector('#multiplayer-mod')) {
      const modScreen = document.createElement('section');
      modScreen.id = 'multiplayer-mod';
      modScreen.className = 'multiplayer-mod';
      modScreen.innerHTML = '<div class="multiplayer-mod-card"><p class="mode-kicker">ONLINE ARCADE</p><h2>Multiplayer Mod</h2><p>Choose a multiplayer game.</p><div class="multiplayer-mod-actions"><button id="mod-neon" type="button">Neon Arena <span class="multiplayer-tag">MULTIPLAYER</span></button><button id="mod-space" type="button">Space Invaders <span class="multiplayer-tag">MULTIPLAYER</span></button><button id="mod-platform" type="button">Platformer Online <span class="multiplayer-tag">MULTIPLAYER</span></button></div><button id="mod-back" type="button">Back</button></div>';
      document.body.appendChild(modScreen);
    }
    const catalog = document.querySelector('.catalog-list');
    if (!document.querySelector('#catalog-multiplayer')) {
      const button = document.createElement('button');
      button.className = 'catalog-card multiplayer-card';
      button.id = 'catalog-multiplayer';
      button.type = 'button';
      button.innerHTML = '<strong>Neon Arena <span class="multiplayer-tag">MULTIPLAYER</span></strong><span>Compite en una sala online de hasta cuatro jugadores.</span>';
      catalog?.appendChild(button);
    } else {
      const title = document.querySelector('#catalog-multiplayer strong');
      if (title && !title.querySelector('.multiplayer-tag')) title.insertAdjacentHTML('beforeend', ' <span class="multiplayer-tag">MULTIPLAYER</span>');
    }
    if (!document.querySelector('#home-chat')) {
      const button = document.createElement('button');
      button.id = 'home-chat';
      button.type = 'button';
      button.innerHTML = 'Chat <span class="multiplayer-tag">MULTIPLAYER</span><span class="chat-unread" aria-label="New messages">0</span>';
      button.className = 'chat-menu-button';
      document.querySelector('.home-menu')?.appendChild(button);
    }
    if (!document.querySelector('#home-multiplayer-mod')) {
      const button = document.createElement('button');
      button.id = 'home-multiplayer-mod';
      button.type = 'button';
      button.innerHTML = 'Multiplayer Mod <span class="multiplayer-tag">MULTIPLAYER</span>';
      button.className = 'multiplayer-mod-menu-button';
      button.hidden = true;
      document.querySelector('.home-menu')?.appendChild(button);
    }
    if (!document.querySelector('#chat-widget')) {
      const widget = document.createElement('section');
      widget.className = 'chat-widget';
      widget.id = 'chat-widget';
      widget.setAttribute('aria-label', 'Chat');
      widget.innerHTML = '<div class="chat-heading"><h2>Chat <span class="multiplayer-tag">MULTIPLAYER</span></h2><div class="chat-window-actions"><button id="chat-minimize" type="button" aria-label="Minimize chat">_</button><button id="chat-maximize" type="button" aria-label="Maximize chat">□</button><button class="chat-close" id="chat-close" type="button" aria-label="Close chat">x</button></div></div><p class="chat-status" id="chat-status">Create a chat code to begin.</p><p class="chat-notification" id="chat-notification" role="status" aria-live="polite"></p><div class="chat-connect"><input id="chat-name" maxlength="16" placeholder="Your name"><input id="chat-code" maxlength="6" placeholder="Code"><button id="chat-create" type="button">Create code</button><button id="chat-join" type="button">Join</button></div><ul class="chat-messages" id="chat-messages"></ul><div class="chat-compose"><input id="chat-input" maxlength="240" placeholder="Write a message"><button id="chat-send" type="button">Send</button></div><span class="chat-resize-hint" aria-hidden="true">↘</span>';
      document.querySelector('main')?.appendChild(widget);
    }
  }
  ensureMultiplayerUI();
  const modeScreen = document.querySelector('#mode-select-screen');
  const modeStatus = document.querySelector('#mode-select-status');
  const modScreen = document.querySelector('#multiplayer-mod');
  const homeScreen = document.querySelector('#home-screen');
  homeScreen.classList.remove('visible');
  document.querySelector('#mode-solo').addEventListener('click', () => { modeScreen.classList.remove('visible'); homeScreen.classList.add('visible'); });
  document.querySelector('#mode-multiplayer').addEventListener('click', () => { modeScreen.classList.remove('visible'); homeScreen.classList.add('visible'); document.querySelector('#home-multiplayer-mod').hidden = false; });
  document.querySelector('#home-multiplayer-mod').addEventListener('click', () => { modScreen.classList.add('visible'); homeScreen.classList.remove('visible'); });
  document.querySelector('#mod-back').addEventListener('click', () => { modScreen.classList.remove('visible'); homeScreen.classList.add('visible'); });
  document.querySelector('#mod-neon').addEventListener('click', () => { modScreen.classList.remove('visible'); document.querySelector('#catalog-multiplayer').click(); });
  document.querySelector('#mod-space').addEventListener('click', () => openSpaceMultiplayer());
  document.querySelector('#mod-platform').addEventListener('click', () => openPlatformMultiplayer());
  const setOnlineVisibility = visible => { document.querySelector('#home-multiplayer-mod').hidden = !visible; document.querySelector('#home-chat').hidden = !visible; document.querySelector('#catalog-multiplayer').hidden = !visible; };
  const showOnlineMode = () => { modeStatus.textContent = 'Server detected. Choose your mode.'; document.querySelector('#mode-multiplayer').hidden = false; setOnlineVisibility(true); modeScreen.classList.add('visible'); };
  const showSoloMode = () => { modeStatus.textContent = 'Solo mode available.'; document.querySelector('#mode-multiplayer').hidden = true; setOnlineVisibility(false); modeScreen.classList.add('visible'); };
  socket.on('connect', showOnlineMode);
  socket.on('connect_error', showSoloMode);
  setTimeout(() => { if (socket.connected) showOnlineMode(); else showSoloMode(); }, 4200);
  function openSpaceMultiplayer() {
    modScreen.classList.remove('visible');
    let panel = document.querySelector('#space-online-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'space-online-panel';
      panel.className = 'space-online-panel';
      panel.innerHTML = '<div class="space-online-card"><h2>Space Invaders <span class="multiplayer-tag">MULTIPLAYER</span></h2><p class="space-online-status" id="space-online-status">Create a room or join with a code.</p><input id="space-online-name" maxlength="16" placeholder="Your name"><input id="space-online-code" maxlength="4" placeholder="Room code"><div class="space-online-actions"><button id="space-online-create" type="button">Create room</button><button id="space-online-join" type="button">Join room</button></div><p class="space-online-players" id="space-online-players"></p><div class="space-online-actions"><button id="space-online-start" type="button">Start mission</button><button id="space-online-back" type="button">Back</button></div></div>';
      document.body.appendChild(panel);
      document.querySelector('#space-online-create').addEventListener('click', () => socket.emit('space:create', { name: document.querySelector('#space-online-name').value }));
      document.querySelector('#space-online-join').addEventListener('click', () => socket.emit('space:join', { roomId: document.querySelector('#space-online-code').value, name: document.querySelector('#space-online-name').value }));
      document.querySelector('#space-online-start').addEventListener('click', () => { window.spaceMultiplayerActive = true; panel.classList.remove('visible'); socket.emit('space:start'); document.querySelector('#catalog-space').click(); });
      document.querySelector('#space-online-back').addEventListener('click', () => { window.spaceMultiplayerActive = false; socket.emit('space:leave'); panel.remove(); modScreen.classList.add('visible'); });
    }
    panel.classList.add('visible');
  }
  let platformAnimation = 0;
  let platformLocal = { x: 80, y: 250, vy: 0, left: false, right: false, grounded: true };
  window.platformRemotePlayers = [];
  window.platformMultiplayerActive = false;
  function openPlatformMultiplayer() {
    modScreen.classList.remove('visible');
    let panel = document.querySelector('#platform-online-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'platform-online-panel';
      panel.className = 'space-online-panel';
      panel.style.zIndex = '110';
      panel.innerHTML = '<div class="space-online-card platform-card"><h2>Platformer Online <span class="multiplayer-tag">MULTIPLAYER</span></h2><p id="platform-online-status">Create a room or join with a code.</p><input id="platform-online-name" maxlength="16" placeholder="Your name"><input id="platform-online-code" maxlength="4" placeholder="Room code"><div class="space-online-actions"><button id="platform-online-create" type="button">Create room</button><button id="platform-online-join" type="button">Join room</button></div><p id="platform-online-players"></p><div class="platform-hud"><span>Nivel: <strong id="platform-level">1-1</strong></span><span>Monedas: <strong id="platform-coins">0</strong></span><span>Power-up: <strong id="platform-power">ninguno</strong></span></div><canvas id="platform-canvas" width="960" height="480" style="display:none;width:100%;max-width:720px;border:2px solid var(--accent);touch-action:none"></canvas><div id="platform-touch-controls" style="display:none;gap:10px;justify-content:center;margin:10px 0"><button id="platform-touch-left" type="button" style="min-width:64px;min-height:48px">◀</button><button id="platform-touch-jump" type="button" style="min-width:64px;min-height:48px">▲</button><button id="platform-touch-right" type="button" style="min-width:64px;min-height:48px">▶</button></div><div class="space-online-actions"><button id="platform-online-start" type="button">Start platformer</button><button id="platform-online-next" type="button">Next level</button><button id="platform-online-back" type="button">Back</button></div><p>Arrows or A/D to move. Space or W to jump.</p></div>';
      document.body.appendChild(panel);
      document.querySelector('#platform-online-create').addEventListener('click', () => socket.emit('platform:create', { name: document.querySelector('#platform-online-name').value }));
      document.querySelector('#platform-online-join').addEventListener('click', () => socket.emit('platform:join', { roomId: document.querySelector('#platform-online-code').value, name: document.querySelector('#platform-online-name').value }));
      document.querySelector('#platform-online-start').addEventListener('click', () => { window.platformMultiplayerActive = true; socket.emit('platform:start'); startPlatformGame(); });
      document.querySelector('#platform-online-next').addEventListener('click', () => socket.emit('platform:next-level'));
      document.querySelector('#platform-online-back').addEventListener('click', () => { window.platformMultiplayerActive = false; cancelAnimationFrame(platformAnimation); socket.emit('platform:leave'); panel.remove(); modScreen.classList.add('visible'); });
      window.addEventListener('keydown', event => { if (!window.platformMultiplayerActive) return; if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') platformLocal.left = true; if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') platformLocal.right = true; if ((event.key === ' ' || event.key.toLowerCase() === 'w' || event.key === 'ArrowUp') && platformLocal.grounded) { platformLocal.vy = -10; platformLocal.grounded = false; } });
      window.addEventListener('keyup', event => { if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') platformLocal.left = false; if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') platformLocal.right = false; });
      const touchButton = (id, direction) => { const button = document.querySelector(id); button.addEventListener('pointerdown', event => { event.preventDefault(); if (direction === 'jump') { if (platformLocal.grounded) { platformLocal.vy = -12; platformLocal.grounded = false; } } else platformLocal[direction] = true; }); button.addEventListener('pointerup', () => { if (direction !== 'jump') platformLocal[direction] = false; }); button.addEventListener('pointercancel', () => { if (direction !== 'jump') platformLocal[direction] = false; }); };
      touchButton('#platform-touch-left', 'left'); touchButton('#platform-touch-right', 'right'); touchButton('#platform-touch-jump', 'jump');
    }
    panel.classList.add('visible');
  }
  function startPlatformGame() {
    const canvas = document.querySelector('#platform-canvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    const touchControls = document.querySelector('#platform-touch-controls');
    if (touchControls) touchControls.style.display = 'flex';
    cancelAnimationFrame(platformAnimation);
    const context = canvas.getContext('2d');
    const levelWidth = 1800;
    const platforms = [{ x: 0, y: 420, width: 1800, height: 60 }, { x: 180, y: 340, width: 180, height: 24 }, { x: 470, y: 285, width: 180, height: 24 }, { x: 790, y: 355, width: 220, height: 24 }, { x: 1130, y: 285, width: 190, height: 24 }, { x: 1430, y: 340, width: 180, height: 24 }];
    const goalX = 1680;
    const drawCharacter = (x, y, color, name, frame) => { context.fillStyle = color; context.fillRect(x - 18, y - 42, 36, 42); context.fillStyle = '#ffd8a8'; context.fillRect(x - 13, y - 62, 26, 22); context.fillStyle = '#231f20'; context.fillRect(x - 15, y - 66, 30, 7); context.fillRect(x - 8, y - 51, 5, 5); context.fillRect(x + 4, y - 51, 5, 5); context.fillStyle = '#151a2b'; context.fillRect(x - 15, y - 4, 11, 8); context.fillRect(x + 4, y - 4, 11, 8); context.fillStyle = '#fff'; context.font = '16px monospace'; context.textAlign = 'center'; context.fillText(name.slice(0, 12), x, y - 76); if (frame % 2) { context.fillStyle = '#151a2b'; context.fillRect(x - 22, y - 26, 8, 5); } };
    const draw = () => {
      if (!window.platformMultiplayerActive) return;
      const platformItems = window.platformItems || [];
      const platformLevel = window.platformLevel || '1-1';
      if (platformLocal.left) platformLocal.x -= 5;
      if (platformLocal.right) platformLocal.x += 5;
      platformLocal.x = Math.max(20, Math.min(levelWidth - 20, platformLocal.x));
      platformItems.forEach(item => {
        if (!item.collected && Math.abs(platformLocal.x - item.x) < 28 && Math.abs(platformLocal.y - item.y) < 48) {
          socket.emit('platform:collect', { kind: item.kind, id: item.id });
        }
      });
      const previousY = platformLocal.y;
      platformLocal.vy += .6;
      platformLocal.y += platformLocal.vy;
      platformLocal.grounded = false;
      platforms.forEach(platform => { const crossed = previousY <= platform.y && platformLocal.y >= platform.y && platformLocal.x > platform.x - 20 && platformLocal.x < platform.x + platform.width + 20; if (crossed && platformLocal.vy >= 0) { platformLocal.y = platform.y; platformLocal.vy = 0; platformLocal.grounded = true; } });
      platformLocal.y = Math.min(platformLocal.y, 420);
      const camera = Math.max(0, Math.min(levelWidth - canvas.width, platformLocal.x - canvas.width * .35));
      if (!platformLocal.lastSent || performance.now() - platformLocal.lastSent > 40) { platformLocal.lastSent = performance.now(); socket.emit('platform:move', { x: platformLocal.x, y: platformLocal.y, vy: platformLocal.vy }); }
      context.fillStyle = '#172044'; context.fillRect(0, 0, canvas.width, canvas.height); context.save(); context.translate(-camera, 0);
      context.fillStyle = '#26345f'; for (let x = 0; x < levelWidth; x += 160) { context.beginPath(); context.moveTo(x, 280); context.lineTo(x + 110, 160); context.lineTo(x + 230, 280); context.fill(); } context.fillStyle = '#ffd166'; for (let x = 80; x < levelWidth; x += 170) context.fillRect(x, 70 + (x % 3) * 45, 5, 5);
      platforms.forEach(platform => { context.fillStyle = '#8b5a3c'; context.fillRect(platform.x, platform.y, platform.width, platform.height); context.fillStyle = '#63c174'; context.fillRect(platform.x, platform.y, platform.width, 8); });
      platformItems.filter(item => !item.collected).forEach(item => { context.fillStyle = item.kind === 'coin' ? '#ffd34f' : '#ef6f6c'; context.beginPath(); context.arc(item.x, item.y - 12, 12, 0, Math.PI * 2); context.fill(); context.fillStyle = '#fff7c9'; context.font = '12px monospace'; context.textAlign = 'center'; context.fillText(item.kind === 'coin' ? '$' : '★', item.x, item.y - 8); });
      context.fillStyle = '#f2f2f2'; context.fillRect(goalX, 155, 6, 265); context.fillStyle = '#ef476f'; context.beginPath(); context.moveTo(goalX + 6, 160); context.lineTo(goalX + 90, 185); context.lineTo(goalX + 6, 210); context.fill(); context.fillStyle = '#fff'; context.font = '20px monospace'; context.fillText('META', goalX - 12, 140);
      const frame = Math.floor(performance.now() / 150); drawCharacter(platformLocal.x, platformLocal.y, '#78e08f', 'YOU', frame);
      window.platformRemotePlayers.forEach((player, index) => { if (player.id !== socket.id) drawCharacter(Number(player.x), Number(player.y), ['#5bbcff', '#ff6565', '#ffd34f'][index % 3], String(player.name), frame); }); context.restore();
      if (platformLocal.x >= goalX) { context.fillStyle = '#fff'; context.font = '22px monospace'; context.textAlign = 'center'; context.fillText(`¡${platformLevel} COMPLETADO!`, canvas.width / 2, 70); }
      platformAnimation = requestAnimationFrame(draw);
    };
    draw();
  }
  socket.on('platform:state', state => {
    window.platformRemotePlayers = state.players || [];
    window.platformItems = state.items || [];
    window.platformLevel = state.level || '1-1';
    const panel = document.querySelector('#platform-online-panel');
    if (panel) {
      document.querySelector('#platform-online-code').value = state.roomId;
      const localPlayer = state.players.find(player => player.id === socket.id);
      document.querySelector('#platform-online-status').textContent = state.running ? `${state.level} active.` : `Room code: ${state.roomId}`;
      document.querySelector('#platform-online-players').textContent = state.players.map(player => player.name).join('  /  ');
      document.querySelector('#platform-level').textContent = state.level || '1-1';
      document.querySelector('#platform-coins').textContent = String(localPlayer?.coins || 0);
      document.querySelector('#platform-power').textContent = localPlayer?.powerUp || 'ninguno';
    }
    const localPlayer = state.players.find(player => player.id === socket.id);
    if (localPlayer && Math.abs(localPlayer.x - platformLocal.x) > 40) { platformLocal.x = localPlayer.x; platformLocal.y = localPlayer.y; platformLocal.vy = localPlayer.vy; }
    if (state.running && !window.platformMultiplayerActive) { window.platformMultiplayerActive = true; startPlatformGame(); }
  });
  socket.on('platform:error', message => { const statusNode = document.querySelector('#platform-online-status'); if (statusNode) statusNode.textContent = message; });
  socket.on('space:state', state => {
    const panel = document.querySelector('#space-online-panel');
    window.spaceRemotePlayers = state.players;
    window.spaceLocalPlayerId = socket.id;
    if (panel) {
      document.querySelector('#space-online-code').value = state.roomId;
      document.querySelector('#space-online-status').textContent = state.running ? `Mission active. Shared score: ${state.score}` : `Room code: ${state.roomId}`;
      document.querySelector('#space-online-players').textContent = state.players.map(player => player.name).join('  /  ');
    }
    window.dispatchEvent(new CustomEvent('space-score-synced', { detail: { score: state.score } }));
    window.dispatchEvent(new CustomEvent('space-players-updated'));
    if (panel && state.running && !window.spaceMultiplayerActive) {
      window.spaceMultiplayerActive = true;
      panel.classList.remove('visible');
      document.querySelector('#catalog-space').click();
    }
  });
  socket.on('space:error', message => { const statusNode = document.querySelector('#space-online-status'); if (statusNode) statusNode.textContent = message; });
  socket.on('space:remote-fire', event => {
    if (window.spaceMultiplayerActive && event.playerId !== socket.id) window.dispatchEvent(new CustomEvent('space-remote-fire', { detail: event }));
  });
  window.addEventListener('space-score-updated', event => {
    if (window.spaceMultiplayerActive) socket.emit('space:score', event.detail.score);
  });
  window.addEventListener('space-remote-fire', event => {
    window.dispatchEvent(new CustomEvent('space-remote-bullet', { detail: event.detail }));
  });
  const screen = document.querySelector('#multiplayer-screen');
  const lobby = document.querySelector('#multiplayer-lobby');
  const roomPanel = document.querySelector('#multiplayer-room');
  const nameInput = document.querySelector('#multiplayer-name');
  const roomInput = document.querySelector('#multiplayer-room-code');
  const status = document.querySelector('#multiplayer-status');
  const roomCode = document.querySelector('#room-code');
  const players = document.querySelector('#room-players');
  const grid = document.querySelector('#arena-grid');
  const startButton = document.querySelector('#multiplayer-start');
  let roomId = '';
  const chat = {
    socket,
    id: '',
    name: '',
    messages: document.querySelector('#chat-messages'),
    status: document.querySelector('#chat-status')
  };
  window.multiplayerSocket = socket;

  function showStatus(message) {
    status.textContent = message;
  }

  function setScreen(open) {
    screen.classList.toggle('visible', open);
    if (!open && roomId) {
      socket.emit('room:leave');
      resetLobby('Create a room or join one.');
    }
  }

  function renderRoom(room) {
    roomId = room.id;
    roomCode.textContent = room.id;
    lobby.hidden = true;
    roomPanel.classList.add('active');
    players.replaceChildren(...room.players.map(player => {
      const card = document.createElement('div');
      card.className = 'room-player';
      card.textContent = player.name;
      const score = document.createElement('strong');
      score.textContent = player.score;
      card.append(score);
      return card;
    }));
    grid.replaceChildren(...Array.from({ length: 9 }, (_, index) => {
      const button = document.createElement('button');
      button.className = index === room.target && room.running ? 'arena-cell target-ready' : 'arena-cell';
      button.type = 'button';
      button.textContent = index === room.target && room.running ? '◆' : '·';
      button.disabled = !room.running;
      button.addEventListener('click', () => socket.emit('target:hit', index));
      return button;
    }));
    startButton.disabled = room.running;
    showStatus(room.running ? 'Hit the highlighted target.' : 'Round complete. Ready for the next one.');
  }

  function resetLobby(message) {
    roomId = '';
    lobby.hidden = false;
    roomPanel.classList.remove('active');
    showStatus(message);
  }

  document.querySelector('#catalog-multiplayer').addEventListener('click', () => {
    document.querySelector('#games-catalog').classList.remove('visible');
    document.querySelector('#multiplayer-screen').classList.add('visible');
    nameInput.focus();
  });
  document.querySelector('#multiplayer-back').addEventListener('click', () => setScreen(false));
  document.querySelector('#multiplayer-create').addEventListener('click', () => {
    socket.emit('room:create', { name: nameInput.value });
  });
  document.querySelector('#multiplayer-join').addEventListener('click', () => {
    socket.emit('room:join', { roomId: roomInput.value, name: nameInput.value });
  });
  startButton.addEventListener('click', () => socket.emit('round:start'));
  document.querySelector('#multiplayer-leave').addEventListener('click', () => {
    socket.emit('room:leave');
    resetLobby('Create a room or join one.');
  });
  roomInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') document.querySelector('#multiplayer-join').click();
  });

  socket.on('room:joined', ({ roomId: joinedRoom }) => {
    roomId = joinedRoom;
    showStatus(`Room ${joinedRoom} joined.`);
  });
  socket.on('room:state', renderRoom);
  socket.on('round:winner', ({ name, score }) => showStatus(`${name} won the round. Score: ${score}.`));
  socket.on('room:error', message => showStatus(message));
  socket.on('records:state', records => {
    window.serverGlobalRecords = records;
    window.dispatchEvent(new CustomEvent('global-records-updated'));
  });
  window.addEventListener('global-records-updated', () => {
    const list = document.querySelector('#global-records .global-record-list');
    if (!list || !Array.isArray(window.serverGlobalRecords)) return;
    list.replaceChildren(...window.serverGlobalRecords.map((entry, index) => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const score = document.createElement('strong');
      name.textContent = `${index + 1}. ${entry.name}`;
      score.textContent = String(entry.score);
      item.append(name, score);
      return item;
    }));
  });
  socket.on('disconnect', () => {
    if (screen.classList.contains('visible')) showStatus('Connection lost. Start the server and reload.');
  });

  function addChatMessage(entry) {
    const item = document.createElement('li');
    item.innerHTML = `<strong></strong><span></span>`;
    item.querySelector('strong').textContent = `${entry.name}:`;
    item.querySelector('span').textContent = entry.message;
    chat.messages.appendChild(item);
    chat.messages.scrollTop = chat.messages.scrollHeight;
  }

  let unreadMessages = 0;
  const homeChat = document.querySelector('#home-chat');
  const chatNotification = document.querySelector('#chat-notification');
  function clearChatNotifications() {
    unreadMessages = 0;
    homeChat.classList.remove('has-unread');
    homeChat.querySelector('.chat-unread').textContent = '0';
    chatNotification.classList.remove('visible');
  }
  function notifyNewChatMessage(entry) {
    const widget = document.querySelector('#chat-widget');
    if (widget.classList.contains('open') && !widget.classList.contains('minimized')) return;
    unreadMessages += 1;
    homeChat.classList.add('has-unread');
    homeChat.querySelector('.chat-unread').textContent = unreadMessages > 9 ? '9+' : String(unreadMessages);
    chatNotification.textContent = `${entry.name} envió un mensaje nuevo.`;
    chatNotification.classList.add('visible');
  }
  homeChat.addEventListener('click', () => { const widget = document.querySelector('#chat-widget'); widget.classList.add('open'); widget.classList.remove('minimized'); clearChatNotifications(); });
  document.querySelector('#chat-close').addEventListener('click', () => document.querySelector('#chat-widget').classList.remove('open'));
  document.querySelector('#chat-minimize').addEventListener('click', event => { event.stopPropagation(); document.querySelector('#chat-widget').classList.toggle('minimized'); });
  document.querySelector('#chat-maximize').addEventListener('click', event => { event.stopPropagation(); const widget = document.querySelector('#chat-widget'); widget.classList.toggle('maximized'); widget.classList.add('dragged'); });
  document.querySelector('#chat-create').addEventListener('click', () => socket.emit('chat:create', { name: document.querySelector('#chat-name').value }));
  document.querySelector('#chat-join').addEventListener('click', () => socket.emit('chat:join', { chatId: document.querySelector('#chat-code').value, name: document.querySelector('#chat-name').value }));
  document.querySelector('#chat-send').addEventListener('click', () => {
    const input = document.querySelector('#chat-input');
    socket.emit('chat:message', input.value);
    input.value = '';
  });
  document.querySelector('#chat-input').addEventListener('keydown', event => { if (event.key === 'Enter') document.querySelector('#chat-send').click(); });
  socket.on('chat:joined', ({ chatId }) => { chat.id = chatId; chat.status.textContent = `Code: ${chatId}`; document.querySelector('#chat-code').value = chatId; });
  socket.on('chat:message', entry => { addChatMessage(entry); notifyNewChatMessage(entry); });
  socket.on('chat:error', message => { chat.status.textContent = message; });
  const chatWidget = document.querySelector('#chat-widget');
  const chatHeading = document.querySelector('.chat-heading');
  let dragState = null;
  chatHeading.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    const bounds = chatWidget.getBoundingClientRect();
    chatWidget.classList.add('dragged');
    dragState = { offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top };
    chatHeading.setPointerCapture(event.pointerId);
  });
  chatHeading.addEventListener('pointermove', event => {
    if (!dragState) return;
    const left = Math.max(0, Math.min(window.innerWidth - chatWidget.offsetWidth, event.clientX - dragState.offsetX));
    const top = Math.max(0, Math.min(window.innerHeight - 42, event.clientY - dragState.offsetY));
    chatWidget.style.left = `${left}px`;
    chatWidget.style.top = `${top}px`;
    chatWidget.style.right = 'auto';
    chatWidget.style.bottom = 'auto';
  });
  chatHeading.addEventListener('pointerup', () => { dragState = null; });
  chatHeading.addEventListener('pointercancel', () => { dragState = null; });
  socket.emit('records:request');
  window.addEventListener('global-record:save', event => {
    socket.emit('record:update', { name: event.detail.name, score: event.detail.score });
  });
})();
