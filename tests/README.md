# Test Suite

Organized test files for Rune Tools Desktop functionality.

## Directory Structure

- **`memoless/`** - Tests for memoless transaction functionality
- **`transactions/`** - Transaction handling and validation tests  
- **`network/`** - Network switching and chain ID tests
- **`core/`** - Core functionality tests (balances, normalization, etc.)

## Running Tests

```bash
# Run memoless test suite
node tests/memoless/run-memoless-tests.js

# Run individual test files
node tests/core/verification-test.js
node tests/transactions/test-msgsend.js
```

## Test Categories

### Memoless Tests
- Amount validation and formatting
- USD conversion calculations  
- Dust threshold handling
- UX interaction flows
- Edge cases and error handling

### Transaction Tests
- MsgSend transaction creation
- MsgDeposit validation
- Transaction tracking and status
- Transaction normalization

### Network Tests
- Chain ID validation
- Network switching functionality
- Comprehensive network handling

### Core Tests
- Balance normalization
- Trade account integration
- Decimal conversion utilities
- System verification tests