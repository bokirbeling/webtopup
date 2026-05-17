# TestSprite MCP Integration - Official Setup

## Status: READY TO EXECUTE

## API Key Found
- Location: `D:\coding\1.PPOB PAYMENT\mcp andanpay-testsprite.json`
- API Key: `sk-user--CEqu4aErnVAh8Y_LYhzLmEx9jz4T0VvrO_8QSNr5r-cFPiji6ZHc7f8Mr80Xl2IbGiShkY5zqFfXZMv8IOJzYRUOBmRJsOuskeTR3iWoXnPjNPOkeeukzYs6MLl5oiIUUg`

## Task: Add TestSprite to OpenCode Config

**File**: `C:\Users\Administrator\.config\opencode\opencode.json`

**Add to `mcp` section** (after line 70, before closing brace):

```json
    "testsprite": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@testsprite/testsprite-mcp@latest"
      ],
      "env": {
        "API_KEY": "sk-user--CEqu4aErnVAh8Y_LYhzLmEx9jz4T0VvrO_8QSNr5r-cFPiji6ZHc7f8Mr80Xl2IbGiShkY5zqFfXZMv8IOJzYRUOBmRJsOuskeTR3iWoXnPjNPOkeeukzYs6MLl5oiIUUg"
      }
    }
```

## After Adding Config

1. Restart OpenCode
2. Test integration: "Hey, help me to test this project with TestSprite"
3. Run comprehensive testing on https://adnanpay.com/demo/

## Expected TestSprite Tools

Official TestSprite MCP should provide:
- AI-powered test generation
- Visual regression testing
- Performance monitoring
- Accessibility audits
- User flow validation

## Deliverables

- [ ] TestSprite MCP added to opencode.json
- [ ] OpenCode restarted
- [ ] Integration tested
- [ ] Comprehensive testing executed
- [ ] Test report created

## Notes

- Official TestSprite has more features than our custom MCP
- API key is user-specific, do not commit to git
- Custom MCP at `mcp/adnanpay-testsprite/` remains as fallback
