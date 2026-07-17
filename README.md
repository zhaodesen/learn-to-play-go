# Learn to Play Go

A browser-based learning game that teaches Go from the first liberty to a complete 9×9 game through short, interactive challenges.

[English](./README.md) | [简体中文](./README.zh-CN.md)

## Why This Project

Traditional Go material can feel abstract to complete beginners. This project turns the learning path into small levels with immediate visual feedback, plain-language terminology, and verified solutions. The goal is simple: finishing the course should be enough to understand the rules and play an introductory game.

## Features

- Seven progressive chapters covering liberties, captures, tactics, life and death, territory, and scoring
- Interactive SVG boards for 9×9, 13×13, and 19×19 positions
- Context-aware move previews for captures, illegal moves, and atari risk
- Plain-language glossary embedded in lesson text
- Multi-step solution trees for tactical problems
- Area scoring with territory visualization
- Local progress, star ratings, sound settings, and free-play mode
- Lightweight rule-based opponent with no network access or machine-learning model

## Tech Stack

React 19 · TypeScript · Vite · SVG · Vitest · Web Audio · localStorage

## Getting Started

```bash
npm install
npm run dev
```

## Development

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm test` | Run engine and level-validation tests |
| `npm run lint` | Run ESLint |
| `npm run build` | Type-check and create a production build |

## Architecture

```text
src/
├── engine/       # Immutable rules, life-and-death, scoring, and bot logic
├── levels/       # Level data, goal types, and solution validation
├── game/         # Per-level state machine
├── components/   # Board, level map, player, glossary, and free play
├── data/         # Go terminology
├── audio/        # Synthesized sound effects
└── storage/      # Progress and settings
```

## Design Principles

- Keep the learning flow frontend-only: no account, backend, or online dependency.
- Highlight useful information instead of illuminating every legal point.
- Keep the rules engine immutable so moves can be tested and replayed safely.
- Validate every new level with automated solution tests.
- Keep the opponent deterministic and rules-based; do not introduce neural models.

## Credits

The in-game recording of *Gymnopédie No. 1* is performed by Kevin MacLeod and licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
