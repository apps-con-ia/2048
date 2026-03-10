document.addEventListener('DOMContentLoaded', () => {
    const gridDisplay = document.querySelector('.grid-container');
    const scoreDisplay = document.querySelector('.score-container');
    const bestDisplay = document.querySelector('.best-container');
    const tileContainer = document.querySelector('.tile-container');
    const gameMessage = document.querySelector('.game-message');

    let grid = [];
    let tiles = [];
    let tileId = 0;
    let score = 0;
    let bestScore = localStorage.getItem('2048BestScore') || 0;
    let gameWon = false;
    let gameIsOver = false;
    let keepPlaying = false;

    const emojiMap = {
        2: '🍄', // Champiñón
        4: '🧅', // Cebolla
        8: '🧄', // Ajo
        16: '🥕', // Zanahoria
        32: '🥔', // Papa
        64: '🌽', // Maíz
        128: '🌶️', // Chile
        256: '🫑', // Pimiento
        512: '🥒', // Pepino
        1024: '🥦', // Brócoli
        2048: '🍅'  // Tomate (Win)
    };

    bestDisplay.innerHTML = bestScore;

    function init() {
        grid = [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null]
        ];
        tiles = [];
        tileContainer.innerHTML = '';
        score = 0;
        updateScore();
        gameWon = false;
        gameIsOver = false;
        keepPlaying = false;
        gameMessage.className = 'game-message';
        gameMessage.innerHTML = '';
        
        generate();
        generate();
        renderGrid();
    }

    function generate() {
        let emptyCells = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (!grid[i][j]) {
                    emptyCells.push({ x: i, y: j });
                }
            }
        }
        if (emptyCells.length === 0) return;
        
        let randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const newTile = {
            id: tileId++,
            val: Math.random() < 0.9 ? 2 : 4,
            r: randomCell.x,
            c: randomCell.y,
            isNew: true,
            isMerged: false
        };
        grid[randomCell.x][randomCell.y] = newTile;
        tiles.push(newTile);
    }

    function renderGrid() {
        tiles.forEach(tile => {
            let el = document.getElementById('tile-' + tile.id);
            if (!el) {
                el = document.createElement('div');
                el.id = 'tile-' + tile.id;
                el.classList.add('tile', `tile-${tile.val}`);
                if (tile.isNew) el.classList.add('tile-new');
                if (tile.isMerged) el.classList.add('tile-merged');
                
                const inner = document.createElement('div');
                inner.classList.add('tile-inner');
                inner.innerHTML = emojiMap[tile.val] || tile.val;
                el.appendChild(inner);
                tileContainer.appendChild(el);
            }
            
            // Update position considering calc uses the gap variable natively from CSS
            el.style.transform = `translate(calc(${tile.c} * (100% + var(--gap))), calc(${tile.r} * (100% + var(--gap))))`;
        });

        // Cleanup tiles that are no longer in grid (merged and removed)
        setTimeout(() => {
            let activeIds = new Set();
            for (let r=0; r<4; r++) {
                for (let c=0; c<4; c++) {
                    if (grid[r][c]) {
                        activeIds.add(grid[r][c].id);
                    }
                }
            }
            
            tiles.forEach(tile => {
                if (!activeIds.has(tile.id)) {
                    let el = document.getElementById('tile-' + tile.id);
                    if (el) el.remove();
                }
            });
            
            tiles = tiles.filter(t => activeIds.has(t.id));
        }, 120); // allow slightly longer than animation to complete
    }

    // Directions: 0: Up, 1: Right, 2: Down, 3: Left
    function getVector(direction) {
        const map = {
            0: { x: -1, y: 0 }, // Up
            1: { x: 0, y: 1 },  // Right
            2: { x: 1, y: 0 },  // Down
            3: { x: 0, y: -1 }  // Left
        };
        return map[direction];
    }

    function buildTraversals(vector) {
        let traversals = { x: [], y: [] };
        for (let pos = 0; pos < 4; pos++) {
            traversals.x.push(pos);
            traversals.y.push(pos);
        }
        // Always traverse from the farthest cell in the chosen direction
        if (vector.x === 1) traversals.x = traversals.x.reverse();
        if (vector.y === 1) traversals.y = traversals.y.reverse();
        return traversals;
    }

    function findFarthestPosition(cell, vector) {
        let previous;
        let p = { x: cell.x, y: cell.y };
        do {
            previous = p;
            p = { x: previous.x + vector.x, y: previous.y + vector.y };
        } while (withinBounds(p) && !grid[p.x][p.y]);

        return {
            farthest: previous,
            next: p 
        };
    }

    function withinBounds(position) {
        return position.x >= 0 && position.x < 4 && position.y >= 0 && position.y < 4;
    }

    function move(direction) {
        if (gameIsOver) return;
        
        let vector = getVector(direction);
        let traversals = buildTraversals(vector);
        let moved = false;
        
        // Reset flags
        tiles.forEach(t => {
            t.isNew = false;
            t.isMerged = false;
        });

        traversals.x.forEach(x => {
            traversals.y.forEach(y => {
                let cell = {x, y};
                let tile = grid[x][y];

                if (tile) {
                    let positions = findFarthestPosition(cell, vector);
                    let next = null;
                    if (withinBounds(positions.next)) {
                       next = grid[positions.next.x][positions.next.y];
                    }

                    if (next && next.val === tile.val && !next.isMerged) {
                        let mergedTile = {
                            id: tileId++,
                            val: tile.val * 2,
                            r: positions.next.x,
                            c: positions.next.y,
                            isNew: false,
                            isMerged: true
                        };

                        grid[x][y] = null;
                        grid[positions.next.x][positions.next.y] = mergedTile;
                        
                        // Update current tile position for animation sliding
                        tile.r = positions.next.x;
                        tile.c = positions.next.y;
                        
                        tiles.push(mergedTile);
                        
                        score += mergedTile.val;
                        moved = true;
                        
                        if (mergedTile.val === 2048) {
                            gameWon = true;
                        }
                    } else {
                        // Just move
                        if (positions.farthest.x !== x || positions.farthest.y !== y) {
                            grid[x][y] = null;
                            grid[positions.farthest.x][positions.farthest.y] = tile;
                            tile.r = positions.farthest.x;
                            tile.c = positions.farthest.y;
                            moved = true;
                        }
                    }
                }
            });
        });

        if (moved) {
            generate();
            updateScore();
            renderGrid();
            checkGameOver();
        }
    }

    function updateScore() {
        scoreDisplay.innerHTML = score;
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('2048BestScore', bestScore);
            bestDisplay.innerHTML = bestScore;
        }
    }

    function checkGameOver() {
        if (gameWon && !keepPlaying) {
            showGameMessage(true);
            gameIsOver = true;
            return;
        }
        
        let hasEmpty = false;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (!grid[i][j]) {
                    hasEmpty = true;
                    break;
                }
            }
        }
        if (hasEmpty) return;

        let hasMatches = false;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let tile = grid[i][j];
                let dirs = [{x:-1, y:0}, {x:1, y:0}, {x:0, y:-1}, {x:0, y:1}];
                for (let d of dirs) {
                    let r = i + d.x;
                    let c = j + d.y;
                    if (withinBounds({x:r, y:c})) {
                        if (grid[r][c].val === tile.val) hasMatches = true;
                    }
                }
            }
        }

        if (!hasMatches) {
            showGameMessage(false);
            gameIsOver = true;
        }
    }

    function showGameMessage(won) {
        if (won) {
            gameMessage.innerHTML = `
                <p>¡Has ganado!</p>
                <div class="lower">
                    <a class="keep-playing-button">Seguir jugando</a>
                    <a class="retry-button">Intentar de nuevo</a>
                </div>
            `;
            gameMessage.classList.add('game-won');
        } else {
            gameMessage.innerHTML = `
                <p>¡Juego terminado!</p>
                <div class="lower">
                    <a class="retry-button">Intentar de nuevo</a>
                </div>
            `;
            gameMessage.classList.add('game-over');
        }
        
        const retryBtns = document.querySelectorAll('.retry-button');
        retryBtns.forEach(btn => btn.addEventListener('click', init));
        
        const keepPlayingBtn = document.querySelector('.keep-playing-button');
        if (keepPlayingBtn) {
            keepPlayingBtn.addEventListener('click', () => {
                gameMessage.className = 'game-message'; // hide
                keepPlaying = true;
                gameIsOver = false;
            });
        }
    }

    // Input listening
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') {
            e.preventDefault();
            move(0);
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            e.preventDefault();
            move(1);
        } else if (e.key === 'ArrowDown' || e.key === 's') {
            e.preventDefault();
            move(2);
        } else if (e.key === 'ArrowLeft' || e.key === 'a') {
            e.preventDefault();
            move(3);
        }
    });

    // Touch support
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', (e) => {
        if (!touchStartX || !touchStartY || gameIsOver) return;

        let touchEndX = e.changedTouches[0].clientX;
        let touchEndY = e.changedTouches[0].clientY;

        let dx = touchEndX - touchStartX;
        let dy = touchEndY - touchStartY;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (Math.abs(dx) > 30) {
                if (dx > 0) move(1);
                else move(3);
            }
        } else {
            // Vertical swipe
             if (Math.abs(dy) > 30) {
                 if (dy > 0) move(2);
                 else move(0);
             }
        }

        touchStartX = 0;
        touchStartY = 0;
    });

    document.querySelector('.restart-button').addEventListener('click', init);

    // PWA Install Logic
    let deferredPrompt;
    const installButton = document.getElementById('install-button');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Previene la aparición automática del mini-infobar en móviles
        e.preventDefault();
        // Guarda el evento para poder dispararlo luego
        deferredPrompt = e;
        // Muestra el botón de instalar en la interfaz
        if (installButton) installButton.style.display = 'inline-block';
    });

    if (installButton) {
        installButton.addEventListener('click', async () => {
            // Oculta el botón
            installButton.style.display = 'none';
            // Muestra el prompt de instalación nativo
            if (deferredPrompt) {
                deferredPrompt.prompt();
                // Espera la respuesta del usuario
                const { outcome } = await deferredPrompt.userChoice;
                // Resetea la variable, ya que prompt() solo se puede usar una vez
                deferredPrompt = null;
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        // Limpiamos la variable cuando la app se instaló exitosamente
        deferredPrompt = null;
        if (installButton) installButton.style.display = 'none';
    });

    init();
});
