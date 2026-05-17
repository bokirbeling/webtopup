# Adnanpay TestSprite MCP Server

TestSprite MCP server for automated testing and validation of Adnanpay PPOB application.

## Features

- **User Flow Validation**: Automated testing of complete user workflows
  - Guest checkout
  - Guest order tracking
  - Reseller registration
  - Reseller transactions
  - Reseller payout
  - Admin management

- **Accessibility Audit**: Automated accessibility testing using axe-core
- **Performance Audit**: Page load time and performance metrics

## Installation

```bash
cd mcp/adnanpay-testsprite
npm install
```

## Usage

### As MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "adnanpay-testsprite": {
      "command": "node",
      "args": ["D:\\coding\\1.PPOB PAYMENT\\mcp\\adnanpay-testsprite\\index.js"]
    }
  }
}
```

### Tools Available

#### 1. validate_user_flow

Validate complete user flow with automated testing.

**Parameters**:
- `flow_type`: Type of flow (guest_checkout, guest_tracking, reseller_registration, etc.)
- `base_url`: Base URL of the application
- `test_data`: Optional test data (customer_id, invoice_code, credentials, etc.)

**Example**:
```json
{
  "flow_type": "guest_checkout",
  "base_url": "https://adnanpay.com/demo/",
  "test_data": {
    "customer_id": "081234567890"
  }
}
```

#### 2. accessibility_audit

Run accessibility audit using axe-core.

**Parameters**:
- `url`: URL to audit

**Example**:
```json
{
  "url": "https://adnanpay.com/demo/"
}
```

#### 3. performance_audit

Run performance audit and collect metrics.

**Parameters**:
- `url`: URL to audit

**Example**:
```json
{
  "url": "https://adnanpay.com/demo/"
}
```

## Output Format

All tools return JSON with findings categorized by severity:
- `critical`: Blocking issues that prevent functionality
- `high`: Important issues that significantly impact UX
- `medium`: Issues that should be fixed but don't block usage
- `low`: Minor issues or suggestions

## Development

```bash
# Install dependencies
npm install

# Run server
npm start
```

## License

MIT
