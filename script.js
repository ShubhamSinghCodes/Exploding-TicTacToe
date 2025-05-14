document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameContainer = document.getElementById('game-container');
    const boardElement = document.getElementById('game-board');
    const fuseLayerElement = document.getElementById('fuse-layer');
    const statusMessageElement = document.getElementById('status-message');
    const winMessageElement = document.getElementById('win-message');
    const resetButton = document.getElementById('reset-button');
    const actionButtons = document.querySelectorAll('.action-button');

    // --- Constants & State ---
    const boardSize = 5;
    const explosionDuration = 600; // ms, sync with CSS .cell.exploding animation
    const sequentialExplosionDelay = 100; // ms delay between each cell exploding in a chain

    let cells = []; // 2D array for cell data: { marker, hasBomb, incomingFuses, outgoingFuses }
    let currentPlayer = 'X';
    let selectedAction = 'placeMarker';
    let fusePlacementStep = null; // null, 'selectFrom', 'selectTo'
    let fuseFromCoords = null; // { row, col }
    let gameOver = false;
    let fuseCounter = 0; // Global counter for unique fuse IDs

    // --- Style Access ---
    const playerXBgColor = getComputedStyle(document.documentElement).getPropertyValue('--light-orange-bg').trim();
    const playerOBgColor = getComputedStyle(document.documentElement).getPropertyValue('--light-grey-bg').trim();

    // --- Cell Data Structure ---
    function createCellData() {
        return {
            marker: null,       // 'X', 'O', or null
            hasBomb: false,     // boolean
            incomingFuses: [],  // Array of { fromRow, fromCol, id }
            outgoingFuses: [],  // Array of { toRow, toCol, id }
        };
    }

    // --- Initialization ---
    function initializeGame() {
        cells = Array(boardSize).fill(null).map(() =>
            Array(boardSize).fill(null).map(() => createCellData())
        );
        currentPlayer = 'X';
        selectedAction = 'placeMarker';
        fusePlacementStep = null;
        fuseFromCoords = null;
        gameOver = false;
        fuseCounter = 0;

        boardElement.innerHTML = ''; // Clear board elements
        fuseLayerElement.innerHTML = ''; // Clear fuse visuals
        winMessageElement.textContent = '';
        winMessageElement.classList.remove('show');
        updateStatus(); // Set turn message
        setActiveButton('placeMarker');
        updateBackgroundColor();
        createBoardElements(); // Create new DOM elements for cells
        updateHighlights();
    }

    function createBoardElements() {
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const cellElement = document.createElement('div');
                cellElement.classList.add('cell', 'placing-initial'); // Add initial class to suppress animation on load
                cellElement.dataset.row = r;
                cellElement.dataset.col = c;
                // Set initial data attributes based on state (which is empty initially)
                updateCellElementState(cellElement, cells[r][c]);
                cellElement.addEventListener('click', handleCellClick);
                boardElement.appendChild(cellElement);
                 // Remove the initial class after a short delay
                setTimeout(() => cellElement.classList.remove('placing-initial'), 10);
            }
        }
    }

    // --- Event Handlers ---
    function handleCellClick(event) {
        if (gameOver) return;
        const cellElement = event.target.closest('.cell');
        if (!cellElement) return;
        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);

        switch (selectedAction) {
            case 'placeMarker': handlePlaceMarker(row, col); break;
            case 'placeBomb': handlePlaceBomb(row, col); break;
            case 'placeFuse': handlePlaceFuse(row, col); break;
        }
        if (!gameOver) updateHighlights(); else clearHighlights();
    }

    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (gameOver) return;
            selectedAction = button.dataset.action;
            setActiveButton(selectedAction);
            if (selectedAction !== 'placeFuse') resetFusePlacementState();
            updateHighlights();
        });
    });

    resetButton.addEventListener('click', initializeGame);

    // --- Action Logic ---
    function handlePlaceMarker(row, col) {
        const cellData = cells[row][col];
        if (cellData.marker !== null) return; // Cell occupied

        const hasOutgoing = cellData.outgoingFuses.length > 0;
        const isExplodableBomb = cellData.hasBomb && !hasOutgoing;
        const isExplodableFuseEnd = cellData.incomingFuses.length > 0 && !hasOutgoing;

        if (isExplodableBomb || isExplodableFuseEnd) {
            if (Math.random() < 0.5) {
                cellData.marker = currentPlayer;
                updateCellElementState(getElement(row, col), cellData);
                triggerExplosion(row, col, !isExplodableFuseEnd);
                // Explosion handles turn continuation
            } else {
                cellData.marker = currentPlayer;
                updateCellElementState(getElement(row, col), cellData);
                if (!checkWin()) switchPlayer();
            }
        } else {
            cellData.marker = currentPlayer;
            updateCellElementState(getElement(row, col), cellData);
            if (!checkWin()) switchPlayer();
        }
    }

    function handlePlaceBomb(row, col) {
        const cellData = cells[row][col];
        if (cellData.hasBomb) return; // Bomb already exists
        cellData.hasBomb = true;
        updateCellElementState(getElement(row, col), cellData);
        switchPlayer();
    }

    function handlePlaceFuse(row, col) {
        const cellData = cells[row][col];

        if (fusePlacementStep !== 'selectTo') { // Selecting 'from'
            if (!cellData.hasBomb && (cellData.incomingFuses.length === 0 || cellData.outgoingFuses.length > 0)) return; // Invalid start
            fuseFromCoords = { row, col };
            fusePlacementStep = 'selectTo';
        } else { // Selecting 'to'
            const { row: fromRow, col: fromCol } = fuseFromCoords;
            if (row === fromRow && col === fromCol) return; // To self
            if (!isOrthogonallyAdjacent(row, col, fromRow, fromCol)) return; // Not adjacent
            // Check if fuse already exists (check outgoing of 'from' cell)
            if (cells[fromRow][fromCol].outgoingFuses.some(f => f.toRow === row && f.toCol === col)) return;

            // Add Fuse Data
            const newFuseId = `fuse-${fuseCounter++}`;
            cells[fromRow][fromCol].outgoingFuses.push({ toRow: row, toCol: col, id: newFuseId });
            cellData.incomingFuses.push({ fromRow: fromRow, fromCol: fromCol, id: newFuseId });

            drawFuseLine(fromRow, fromCol, row, col, newFuseId); // Draw visual fuse

            resetFusePlacementState();
            switchPlayer();
        }
        updateHighlights(); // Update highlights based on fuse step change
    }

     function resetFusePlacementState() {
         fusePlacementStep = null;
         fuseFromCoords = null;
    }

    // --- Game Mechanics ---
    function triggerExplosion(row, col, isDirectBombExplosion) {
        updateStatus("BOOM!"); // Show temporary message
        let coordsToAnimate = [];
        let fusesToRemove = [];

        if (isDirectBombExplosion) {
            coordsToAnimate.push({ row, col, level: 0});
            // Direct bomb explosion logic (flip marker, remove bomb) handled below after animation trigger
        } else {
            // Fuse chain explosion
            const chain = findFuseChain(row, col);
            coordsToAnimate = chain.cellsAffected.flat(); // Animate all cells in chain
            fusesToRemove = chain.fusesToRemove.flat(); // Mark fuses for removal
        }

        // --- Sequential Animation ---
        coordsToAnimate.forEach((coord, index) => {
            setTimeout(() => {
                const cellData = cells[coord.row][coord.col];
                const cellEl = getElement(coord.row, coord.col);
                if (cellData.hasBomb) {
                    cellData.hasBomb = false; // Bomb vanishes
                    if (cellData.marker) { // Flip existing marker if there is one
                        cellData.marker = cellData.marker === 'X' ? 'O' : 'X';
                    }
                    updateCellElementState(cellEl, cellData);
                }
                if (cellEl) {
                    cellEl.classList.add('exploding');
                    // Remove class after animation
                    setTimeout(() => cellEl.classList.remove('exploding'), explosionDuration);
                }
            }, coord.level * sequentialExplosionDelay); // Stagger the start
        });
        fusesToRemove.forEach(fuseval => {
            setTimeout(() => {
                removeFuse(fuseval.id);
            }, fuseval.level * sequentialExplosionDelay);
        });
        // Check win AFTER state changes, with buffer
        setTimeout(() => {
            if (!checkWin()) {
                // Next player's turn, reset status message if game not over
                if (!gameOver) {
                    switchPlayer();
                    updateStatus();
                }
            } else {
                clearHighlights(); // Game ended
            }
        }, (coordsToAnimate.length + 1) * sequentialExplosionDelay + 100);
    }

    // Find all connected fuses and cells
    function findFuseChain(startRow, startCol) {
        const queue = [{ row: startRow, col: startCol, level: 0 }];
        const visitedCellKeys = new Set([`${startRow},${startCol}`]);
        const cellsAffectedCoords = [[{ row: startRow, col: startCol }]]; // Start with the trigger cell
        const visitedFuseIds = new Set();
        const fusesToRemove = [[]];

        while (queue.length > 0) {
            const current = queue.shift();
            const cellData = cells[current.row][current.col];
            const celllevel = current.level;

            // Check incoming fuses to current cell; NOT OUTGOING
            cellData.incomingFuses.forEach(fuse => {
                if (!visitedFuseIds.has(fuse.id)) {
                    visitedFuseIds.add(fuse.id);
                    if (fusesToRemove.length - 1 < celllevel + 1) {
                        fusesToRemove.push([]);
                    }
                    fusesToRemove[celllevel + 1].push({id: fuse.id, level: celllevel + 1});
                    const neighborKey = `${fuse.fromRow},${fuse.fromCol}`;
                    if (!visitedCellKeys.has(neighborKey)) {
                        visitedCellKeys.add(neighborKey);
                        const neighborCoord = { row: fuse.fromRow, col: fuse.fromCol, level: celllevel + 1 };
                        if (cellsAffectedCoords.length - 1 < celllevel + 1) {
                            cellsAffectedCoords.push([]);
                        }
                        cellsAffectedCoords[celllevel + 1].push(neighborCoord);
                        queue.push(neighborCoord);
                    }
                }
            });
        }
        return { cellsAffected: cellsAffectedCoords, fusesToRemove: Array.from(fusesToRemove) };
    }

    // Removes fuse data from relevant cells and triggers visual removal
    function removeFuse(fuseId) {
        let found = false;
        for (let r = 0; r < boardSize && !found; r++) {
            for (let c = 0; c < boardSize && !found; c++) {
                const outIdx = cells[r][c].outgoingFuses.findIndex(f => f.id === fuseId);
                if (outIdx > -1) {
                    const fuseData = cells[r][c].outgoingFuses.splice(outIdx, 1)[0];
                    // Remove corresponding incoming fuse data
                    const inIdx = cells[fuseData.toRow][fuseData.toCol].incomingFuses.findIndex(f => f.id === fuseId);
                    if (inIdx > -1) cells[fuseData.toRow][fuseData.toCol].incomingFuses.splice(inIdx, 1);
                    found = true; // Exit loops once found
                }
            }
        }
        removeFuseVisual(fuseId); // Trigger visual animation/removal
    }

    // Check win condition for the current player
    function checkWin() {
        if (gameOver) return false;
        const p = currentPlayer; // Check for the player who just moved

        for (let r = 0; r < boardSize; r++) if (cells[r].every(cell => cell.marker === p)) return announceWinner(p, r, null);
        for (let c = 0; c < boardSize; c++) if (cells.every(row => row[c].marker === p)) return announceWinner(p, null, c);
        if (Array(boardSize).fill(null).every((_, i) => cells[i][i].marker === p)) return announceWinner(p, null, null, 'diag1');
        if (Array(boardSize).fill(null).every((_, i) => cells[i][boardSize - 1 - i].marker === p)) return announceWinner(p, null, null, 'diag2');

        // Check Draw (if board is full)
        if (cells.flat().every(cell => cell.marker !== null)) return announceDraw();
        return false;
    }

    function announceWinner(player, winRow, winCol, winDiag) {
        if (gameOver) return true;
        gameOver = true;
        winMessageElement.textContent = `Player ${player} Wins!`;
        winMessageElement.classList.add('show');
        updateStatus("Game Over!");
        highlightWinningLine(winRow, winCol, winDiag);
        return true;
    }

     function announceDraw() {
        if (gameOver) return true;
        gameOver = true;
        winMessageElement.textContent = `It's a Draw!`;
        winMessageElement.classList.add('show');
        updateStatus("Game Over!");
        return true;
    }

    function switchPlayer() {
        if (gameOver) return;
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateStatus();
        updateBackgroundColor();
        // updateHighlights(); // Called by the main click handler after switch
    }

    // --- Display & UI Updates ---

    // Updates a single cell's DOM element based on its data object
    function updateCellElementState(cellElement, cellData) {
        if (!cellElement) return;
        // Marker
        cellElement.textContent = cellData.marker || '';
        cellElement.dataset.marker = cellData.marker || '';
        // Bomb
        cellElement.dataset.bomb = cellData.hasBomb;
        // Highlight (handled separately by updateHighlights)
    }

    // Draws a single fuse line on the fuse layer
    function drawFuseLine(fromRow, fromCol, toRow, toCol, fuseId) {
        const boardRect = boardElement.getBoundingClientRect();
        const cellWidth = boardRect.width / boardSize;
        const cellHeight = boardRect.height / boardSize;
        const fuseThickness = 4;
        const indicatorOffsetX = cellWidth * 0.1;
        const indicatorOffsetY = cellHeight * 0.1;
        const fromX = (fromCol * cellWidth) + indicatorOffsetX;
        const fromY = (fromRow * cellHeight) + indicatorOffsetY;
        const toX = (toCol * cellWidth) + indicatorOffsetX;
        const toY = (toRow * cellHeight) + indicatorOffsetY;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        const line = document.createElement('div');
        line.classList.add('fuse-line');
        line.id = fuseId;
        line.style.width = `${length}px`;
        line.style.left = `${fromX}px`;
        line.style.top = `${fromY - fuseThickness / 2}px`;
        line.style.transform = `rotate(${angle}deg)`;
        fuseLayerElement.appendChild(line);
    }

    // Triggers animation and removes the fuse element
    function removeFuseVisual(fuseId) {
        const lineElement = document.getElementById(fuseId);
        if (lineElement) {
            lineElement.classList.add('exploding');
            lineElement.addEventListener('animationend', () => lineElement.remove(), { once: true });
        }
    }

    function setActiveButton(action) {
        actionButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.action === action));
    }

    // Clears all highlight data attributes
    function clearHighlights() {
        boardElement.querySelectorAll('.cell').forEach(cell => cell.dataset.highlight = '');
    }

    // Sets highlight data attributes based on current state
    function updateHighlights() {
        if (gameOver) return;
        clearHighlights();

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const cellData = cells[r][c];
                const cellElement = getElement(r, c);
                if (!cellElement) continue;

                let highlightType = '';
                if (selectedAction === 'placeMarker' && cellData.marker === null) {
                    highlightType = 'place';
                } else if (selectedAction === 'placeBomb' && !cellData.hasBomb) {
                    highlightType = 'bomb';
                } else if (selectedAction === 'placeFuse') {
                    if (fusePlacementStep !== 'selectTo') { // Highlighting 'from' candidates
                        if (cellData.hasBomb || (cellData.incomingFuses.length > 0 && cellData.outgoingFuses.length === 0)) {
                            highlightType = 'fuse-from';
                        }
                    } else { // Highlighting 'to' candidates
                         if (r === fuseFromCoords.row && c === fuseFromCoords.col) {
                             highlightType = 'fuse-selected-from'; // Special highlight for the origin
                         } else if (isOrthogonallyAdjacent(r, c, fuseFromCoords.row, fuseFromCoords.col)) {
                            // Check if fuse already exists from origin
                            const originCell = cells[fuseFromCoords.row][fuseFromCoords.col];
                            if (!originCell.outgoingFuses.some(f => f.toRow === r && f.toCol === c)) {
                                highlightType = 'fuse-to';
                            }
                        }
                    }
                }
                cellElement.dataset.highlight = highlightType;
            }
        }
    }

    // Updates the main status message
    function updateStatus(message = null) {
        if (gameOver && !message) return; // Don't overwrite win/draw message unless specified
        statusMessageElement.textContent = message || `Player ${currentPlayer}'s Turn`;
    }

    // Highlights the winning cells
    function highlightWinningLine(winRow, winCol, winDiag) {
         for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                let highlight = false;
                if (winRow !== null && r === winRow) highlight = true;
                else if (winCol !== null && c === winCol) highlight = true;
                else if (winDiag === 'diag1' && r === c) highlight = true;
                else if (winDiag === 'diag2' && r + c === boardSize - 1) highlight = true;
                if (highlight) getElement(r, c)?.classList.add('winning');
            }
         }
    }

    // Updates the background color based on the current player
    function updateBackgroundColor() {
        const color = currentPlayer === 'X' ? playerXBgColor : playerOBgColor;
        document.documentElement.style.setProperty('--current-bg-color', color);
    }

    // --- Helper Functions ---
    function getElement(row, col) {
        // This query might be slightly less efficient than direct indexing if we had elements in an array,
        // but it's robust and clear. Fine for this scale.
        return boardElement.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
    }

    function isOrthogonallyAdjacent(r1, c1, r2, c2) {
        const rowDiff = Math.abs(r1 - r2);
        const colDiff = Math.abs(c1 - c2);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    // --- Start Game ---
    initializeGame();
});
