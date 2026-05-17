# TestSprite MCP Integration Setup

## TL;DR

Integrate TestSprite MCP Server with OpenCode for automated testing capabilities.

## Context

TestSprite provides MCP server for automated testing with AI. User provided setup instructions requiring:
1. Create API key from TestSprite dashboard
2. Add MCP configuration to OpenCode
3. Test integration with "Hey, help me to test this project with TestSprite"

## Prerequisites

- TestSprite account with API key
- OpenCode installed
- Project ready for testing

## Configuration

### Step 1: Get TestSprite API Key

User needs to:
1. Go to TestSprite dashboard
2. Create API key
3. Copy the key

### Step 2: Add to OpenCode Config

Add to `C:\Users\Administrator\.config\opencode\opencode.json` in `mcp` section:

```json
"testsprite": {
  "type": "remote",
  "url": "https://mcp.testsprite.com/mcp",
  "headers": {
    "x-api-key": "{env:TESTSPRITE_API_KEY}"
  }
}
```

### Step 3: Set Environment Variable

Add to system environment variables:
```
TESTSPRITE_API_KEY=<your-api-key-here>
```

### Step 4: Restart OpenCode

Restart OpenCode to load new MCP configuration.

### Step 5: Test Integration

In OpenCode, type:
```
Hey, help me to test this project with TestSprite.
```

## Alternative: Local TestSprite MCP

If using our custom TestSprite MCP server at `mcp/adnanpay-testsprite/`:

```json
"adnanpay-testsprite": {
  "type": "local",
  "command": [
    "node",
    "D:\\coding\\1.PPOB PAYMENT\\mcp\\adnanpay-testsprite\\index.js"
  ]
}
```

## Notes

- Official TestSprite MCP requires API key and subscription
- Our custom TestSprite MCP (`mcp/adnanpay-testsprite/`) is free but limited to basic validation
- Official TestSprite has more features: AI-powered test generation, visual regression, performance monitoring
- Custom MCP is good for basic flow validation, accessibility, and performance checks

## Recommendation

**For now**: Use custom TestSprite MCP (already implemented)
**Later**: Upgrade to official TestSprite if advanced features needed

## Status

- [x] Custom TestSprite MCP implemented
- [ ] Official TestSprite API key obtained
- [ ] Official TestSprite MCP configured
- [ ] Integration tested

## Next Steps

1. User decides: Use custom MCP or get official TestSprite API key
2. If official: Add API key to environment variables
3. If official: Update opencode.json with TestSprite MCP config
4. Restart OpenCode
5. Test integration
