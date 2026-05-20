# TestSprite MCP Setup

## TL;DR
> **Summary**: Setup TestSprite MCP server for automated testing and validation of Adnanpay PPOB application.
> **Deliverables**: 
> - TestSprite MCP server implementation
> - Configuration files
> - Documentation
> - Integration with user simulation plan
> **Effort**: Quick
> **Parallel**: NO - Sequential setup
> **Critical Path**: Create package.json → Implement server → Test → Document

## Context
### Original Request
User requested: "mcp setup test sprite D:\coding\1.PPOB PAYMENT\mcp andanpay-testsprite"

### Current State
- Directory `D:\coding\1.PPOB PAYMENT\mcp\` exists
- Subdirectory `adnanpay-testsprite` needs to be created
- TestSprite MCP will be used in user simulation plan (T11, T13)

### Purpose
TestSprite MCP provides automated validation for:
- User flow testing (Guest, Reseller, Admin)
- Accessibility audits (axe-core)
- Performance audits (page load metrics)
- UX analysis and bug detection

## Work Objectives
### Core Objective
Create a functional TestSprite MCP server that can validate all Adnanpay user flows and provide categorized findings.

### Deliverables
1. `mcp/adnanpay-testsprite/package.json` - Dependencies and scripts
2. `mcp/adnanpay-testsprite/index.js` - MCP server implementation
3. `mcp/adnanpay-testsprite/README.md` - Documentation
4. `mcp/adnanpay-testsprite/.gitignore` - Git ignore file

### Definition of Done
- [ ] TestSprite MCP server created and functional
- [ ] All 3 tools implemented (validate_user_flow, accessibility_audit, performance_audit)
- [ ] Documentation complete
- [ ] Server tested with demo environment
- [ ] Integration ready for user simulation plan

### Must Have
- validate_user_flow tool with 6 flow types
- accessibility_audit tool with axe-core
- performance_audit tool with metrics
- Findings categorized by severity (critical, high, medium, low)
- JSON output format

### Must NOT Have
- Real payment processing
- Production data modification
- Destructive operations

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: Manual testing with demo environment
- QA policy: Test each tool with demo URLs
- Evidence: .sisyphus/evidence/testsprite-setup-*.txt

## Execution Strategy
### Tasks (Sequential)

**T1: Create directory and package.json**
- Create `mcp/adnanpay-testsprite/` directory
- Create `package.json` with dependencies
- Dependencies: @modelcontextprotocol/sdk, playwright

**T2: Implement MCP server**
- Create `index.js` with MCP server setup
- Implement 3 tools: validate_user_flow, accessibility_audit, performance_audit
- Implement flow validators: guest_checkout, guest_tracking, reseller_registration, etc.

**T3: Create documentation**
- Create `README.md` with usage instructions
- Document all tools and parameters
- Add examples

**T4: Install dependencies and test**
- Run `npm install`
- Test server with demo environment
- Verify all tools work

## TODOs

- [ ] 1. Create directory and package.json

  **What to do**:
  - Create directory `mcp/adnanpay-testsprite/`
  - Create `package.json` with:
    - name: "adnanpay-testsprite"
    - version: "1.0.0"
    - type: "module"
    - dependencies: @modelcontextprotocol/sdk@^0.5.0, playwright@^1.40.0
  - Create `.gitignore` with node_modules/
  
  **Must NOT do**:
  - Do not install dependencies yet (T4)
  - Do not create implementation files yet (T2)

  **Recommended Agent Profile**:
  - Category: `quick` - Simple file creation
  - Skills: [] - No special skills needed
  - Omitted: All - Basic file operations

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [T2] | Blocked By: []

  **References**:
  - MCP SDK: https://github.com/modelcontextprotocol/sdk
  - Playwright: https://playwright.dev/

  **Acceptance Criteria**:
  - [ ] Directory `mcp/adnanpay-testsprite/` created
  - [ ] `package.json` created with correct dependencies
  - [ ] `.gitignore` created

  **QA Scenarios**:
  ```
  Scenario: Verify directory created
    Tool: Bash
    Steps: Test-Path "mcp/adnanpay-testsprite"
    Expected: True
    Evidence: .sisyphus/evidence/testsprite-setup-directory.txt

  Scenario: Verify package.json valid
    Tool: Bash
    Steps: Get-Content mcp/adnanpay-testsprite/package.json | ConvertFrom-Json
    Expected: Valid JSON with dependencies
    Evidence: .sisyphus/evidence/testsprite-setup-package.txt
  ```

  **Commit**: NO

- [ ] 2. Implement MCP server

  **What to do**:
  - Create `index.js` with MCP server implementation
  - Import: Server, StdioServerTransport from @modelcontextprotocol/sdk
  - Import: chromium from playwright
  - Implement ListToolsRequestSchema handler with 3 tools
  - Implement CallToolRequestSchema handler
  - Implement validateUserFlow() with 6 flow types
  - Implement accessibilityAudit() with axe-core injection
  - Implement performanceAudit() with metrics collection
  
  **Must NOT do**:
  - Do not use real payment processing
  - Do not modify production data
  - Do not skip error handling

  **Recommended Agent Profile**:
  - Category: `quick` - Single file implementation
  - Skills: [] - No special skills needed
  - Omitted: All - Standard Node.js code

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [T3,T4] | Blocked By: [T1]

  **References**:
  - MCP SDK docs: https://modelcontextprotocol.io/docs
  - Playwright API: https://playwright.dev/docs/api/class-page
  - axe-core: https://github.com/dequelabs/axe-core

  **Acceptance Criteria**:
  - [ ] `index.js` created with MCP server
  - [ ] All 3 tools implemented
  - [ ] All 6 flow validators implemented
  - [ ] Error handling included
  - [ ] JSON output format correct

  **QA Scenarios**:
  ```
  Scenario: Verify index.js exists
    Tool: Bash
    Steps: Test-Path mcp/adnanpay-testsprite/index.js
    Expected: True
    Evidence: .sisyphus/evidence/testsprite-setup-index.txt

  Scenario: Verify syntax valid
    Tool: Bash
    Steps: node --check mcp/adnanpay-testsprite/index.js
    Expected: No syntax errors
    Evidence: .sisyphus/evidence/testsprite-setup-syntax.txt
  ```

  **Commit**: NO

- [ ] 3. Create documentation

  **What to do**:
  - Create `README.md` with:
    - Overview of TestSprite MCP
    - Features list
    - Installation instructions
    - Usage examples for each tool
    - Output format documentation
    - Integration with user simulation plan
  
  **Must NOT do**:
  - Do not skip examples
  - Do not make false claims
  - Do not omit important details

  **Recommended Agent Profile**:
  - Category: `quick` - Documentation writing
  - Skills: [] - No special skills needed
  - Omitted: All - Basic markdown

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [T4] | Blocked By: [T2]

  **References**:
  - Implementation: `mcp/adnanpay-testsprite/index.js`
  - User simulation plan: `.sisyphus/plans/user-simulation-comprehensive.md`

  **Acceptance Criteria**:
  - [ ] `README.md` created
  - [ ] All sections complete
  - [ ] Examples provided for each tool
  - [ ] Integration instructions included

  **QA Scenarios**:
  ```
  Scenario: Verify README exists
    Tool: Bash
    Steps: Test-Path mcp/adnanpay-testsprite/README.md
    Expected: True
    Evidence: .sisyphus/evidence/testsprite-setup-readme.txt

  Scenario: Verify README completeness
    Tool: Bash
    Steps: Get-Content mcp/adnanpay-testsprite/README.md | Select-String "Features|Installation|Usage|Tools"
    Expected: All sections found
    Evidence: .sisyphus/evidence/testsprite-setup-readme-sections.txt
  ```

  **Commit**: NO

- [ ] 4. Install dependencies and test

  **What to do**:
  - Run `npm install` in `mcp/adnanpay-testsprite/`
  - Test server startup: `node index.js` (should run without errors)
  - Test validate_user_flow with demo URL
  - Test accessibility_audit with demo URL
  - Test performance_audit with demo URL
  - Document test results
  
  **Must NOT do**:
  - Do not skip testing
  - Do not ignore errors
  - Do not proceed if tests fail

  **Recommended Agent Profile**:
  - Category: `quick` - Install and test
  - Skills: [] - No special skills needed
  - Omitted: All - Standard npm operations

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [] | Blocked By: [T2,T3]

  **References**:
  - Package: `mcp/adnanpay-testsprite/package.json`
  - Server: `mcp/adnanpay-testsprite/index.js`
  - Demo: https://adnanpay.com/demo/

  **Acceptance Criteria**:
  - [ ] Dependencies installed successfully
  - [ ] Server starts without errors
  - [ ] All 3 tools tested and working
  - [ ] Test results documented

  **QA Scenarios**:
  ```
  Scenario: Verify dependencies installed
    Tool: Bash
    Steps: Test-Path mcp/adnanpay-testsprite/node_modules
    Expected: Directory exists
    Evidence: .sisyphus/evidence/testsprite-setup-deps.txt

  Scenario: Verify server starts
    Tool: Bash
    Steps: timeout 5 node mcp/adnanpay-testsprite/index.js
    Expected: Server runs without immediate errors
    Evidence: .sisyphus/evidence/testsprite-setup-server.txt
  ```

  **Commit**: YES | Message: `feat: add TestSprite MCP server for automated testing` | Files: [mcp/adnanpay-testsprite/*]

## Final Verification Wave
> Not required for setup task - verification happens in user simulation plan

## Commit Strategy
- Commit after T4 with all TestSprite MCP files

## Success Criteria
- All 4 tasks completed
- TestSprite MCP server functional
- Documentation complete
- Tests passed
- Ready for integration with user simulation plan
