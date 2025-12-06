# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polybius CipherLab is a web-based educational tool for visualizing and practicing the Polybius cipher, an ancient Greek encryption method that converts letters to number pairs using a checkerboard system.

## Development Commands

This is a static web application with no build process required:

- **Run locally**: Open `index.html` directly in a browser or use a local web server
  - Example: `python -m http.server 8000` or `npx serve`
- **Deploy to GitHub Pages**: Push to main branch (already configured with `.nojekyll`)

## Architecture

### Core Functionality (script.js)
- **State Management**: Single global `state` object manages cipher mode, keyword, matrix, and character mappings (`mapCharToPair`, `mapPairToChar`)
- **Cipher Modes**:
  - 5×5 mode: Merges I and J for classical implementation (uses 25 letters)
  - 6×6 mode: Includes A-Z and 0-9 for extended character support (36 characters)
- **Key Functions**:
  - `generateMatrix()`: Creates Polybius square with optional keyword, builds bidirectional lookup maps
  - `encrypt()`: Converts plaintext to number pairs with options for space preservation, concatenation, and symbol handling
  - `decrypt()`: Converts number pairs back to plaintext via `normalizePairs()` helper
  - `renderMatrix()`: Displays interactive grid with keyword character highlighting
  - `renderAllMatrices()`: Updates matrix displays across all tabs simultaneously

### User Interface
- **Tab-based Layout**: Four main sections (Encrypt, Decrypt, Matrix, History/Study)
- **Interactive Matrix**: Clickable cells with row/column highlighting
- **Mapping Visualization**: Animated display of character-to-number conversions via `renderMapping()`
- **Sync Feature**: One-click transfer of encrypt output to decrypt input with settings
- **Theme Toggle**: Dark/light mode with localStorage persistence
- **Japanese UI**: Interface uses Japanese labels with English alternatives

### Key Implementation Details
- Word boundaries preserved using '/' separator when "preserve spaces" option is enabled
- Supports both spaced ("23 15 31") and continuous ("231531") number pair input
- Matrix generation supports keyword-based alphabets with duplicate removal
- Character normalization handles I/J merging in 5×5 mode automatically
- Input sanitization via `sanitizeInput()` limits input to 10000 characters and removes control characters