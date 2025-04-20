# Exploding Tic Tac Toe

Exploding Tic Tac Toe is a unique twist on the classic game, played on a 5x5 grid where players aim to get five of their markers in a row.
Play it online on githack [here](https://raw.githack.com/ShubhamSinghCodes/Exploding-TicTacToe/main/index.html)!

## How to Play

The game is played on a 5x5 grid. Players take turns performing one of three actions:

1.  **Place Marker:** Place your 'X' or 'O' in an empty cell.
2.  **Place Bomb:** Place a bomb in an empty cell.
3.  **Place Fuse:** Connect two cells with a directional fuse.

The goal is to get 5 of your markers in a horizontal, vertical, or diagonal row.

## Rules

* **Winning:** The first player to get 5 of their markers ('X' or 'O') in a continuous horizontal, vertical, or diagonal line wins.
* **Placing Markers:** You can only place your marker in a cell that does not already contain a marker.
* **Placing Bombs:** You can only place a bomb in a cell that does not already contain a bomb.
* **Placing Fuses:**
    * Fuses are directional, going from a "from" cell to a "to" cell.
    * Fuses can only be placed from a bomb containing cell or an end of a fuse chain to an orthogonally adjacent cell.
* **Explosions:** Explosions can occur when a player places their marker on a cell containing a bomb (not in middle of a fuse chain), or on a cell at the end of a fuse chain. These explosions occur with a 50% chance of exploding on placement.
* **Explosion Effects:** During an explosion, exploding cells containing a marker will **flip** to the other player's marker. In a fuse chain, only the cells containing a bomb will **flip**.
* **Game End:** The game ends when a player achieves 5 in a row or when the board is full (resulting in a draw if no player has won).

## Development

This game was built using HTML, CSS, and JavaScript.

* `index.html`: Provides the basic structure of the game interface.
* `style.css`: Styles the game board, elements, and adds visual flair including animations.
* `script.js`: Contains the core game logic, including board state management, player actions, explosion mechanics, win condition checking, and UI updates.

## Setup

To play the game locally:

1.  Save the three code blocks provided (`index.html`, `style.css`, `script.js`) into separate files with those exact names in the same directory.
2.  Open the `index.html` file in a web browser.

Enjoy Exploding Tic Tac Toe!
