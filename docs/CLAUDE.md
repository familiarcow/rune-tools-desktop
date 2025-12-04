# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- `npm run build` - Compile TypeScript to JavaScript in the dist/ directory
- `npm start` - Build and launch the Electron application
- `npm run dev` - Watch mode compilation for development
- TypeScript compilation target: ES2020, outputs to `dist/` directory

## UI Development Guidelines

**Important**: When working with DOM manipulation in TypeScript, always cast `querySelector()` results to specific HTML element types to avoid compilation errors. See [TypeScript DOM Patterns](./TypeScriptDOMPatterns.md) for detailed patterns and common solutions.

## Architecture Overview

This is an Electron desktop application for interacting with THORChain, structured as a main process communicating with a renderer process via IPC handlers.

### Core Service Layer Architecture

The application follows a service-oriented architecture with these key services:

- **ThorchainApiService** - Handles all THORNode API interactions including balances, pools, quotes, and network data
- **THORWalletService** - Manages wallet creation, seed phrase generation, and address derivation using CosmJS
- **TransactionService** - Handles transaction broadcasting, gas estimation, and supports both MsgSend and MsgDeposit transaction types
- **TransactionTrackingService** - Polls and tracks transaction status after broadcast
- **BalanceNormalizationService** - Normalizes and combines different balance types (wallet + trade account)
- **SwapConstructionService** - Constructs swap transactions from THORChain quotes
- **AssetChainService** - Analyzes asset identifiers and chain information

### IPC Communication Pattern

The main process (src/main.ts) exposes services via IPC handlers using the pattern:
```typescript
ipcMain.handle('handler-name', async (event, ...params) => {
  // Service call and error handling
});
```

### Key Configuration

- THORChain RPC: `https://rpc.ninerealms.com/`
- THORNode API: `https://thornode.ninerealms.com` (configurable in ThorchainApiService)
- Derivation path: `m/44'/931'/0'/0/0` (THORChain standard)
- Address prefix: `thor`

### Asset Handling

Assets use THORChain naming convention (e.g., 'THOR.RUNE', 'BTC.BTC', 'ETH.ETH'). The TransactionService handles denom conversion for different asset types.

### Transaction Types

- **MsgSend** - Standard cosmos bank transfers (requires toAddress)
- **MsgDeposit** - THORChain-specific deposits to protocol (requires memo)

Test files in root directory validate specific functionality including memo validation, transaction normalization, and tracking.

## Documentation Index

- [Architecture.md](./Architecture.md) - Overall application architecture and design principles
- [WalletBalances.md](./WalletBalances.md) - Wallet balance processing and display system
- [SendTransactionSystem.md](./SendTransactionSystem.md) - Send transaction popup interface and security
- [TypeScriptDOMPatterns.md](./TypeScriptDOMPatterns.md) - Common TypeScript + DOM patterns and solutions