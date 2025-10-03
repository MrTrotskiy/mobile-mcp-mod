# Manual Tests

Quick test scripts for Week 1 features.

## Prerequisites

```bash
npm run build        # Compile TypeScript
```

Connect Android device `843b3cd3`

## Running Tests

```bash
# Test specific feature
node test/manual/test-logs.js
node test/manual/test-crashes.js
node test/manual/test-context.js

# Or run all unit tests
npm test
```

## Note

These are simple scripts for quick manual verification.
For comprehensive testing, use unit tests: `npm test`

