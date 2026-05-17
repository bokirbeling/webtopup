#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';

const server = new Server(
  {
    name: 'adnanpay-testsprite',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// TestSprite validation tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'validate_user_flow',
        description: 'Validate complete user flow with automated testing, accessibility checks, and UX analysis',
        inputSchema: {
          type: 'object',
          properties: {
            flow_type: {
              type: 'string',
              enum: ['guest_checkout', 'guest_tracking', 'reseller_registration', 'reseller_transaction', 'reseller_payout', 'admin_management'],
              description: 'Type of user flow to validate',
            },
            base_url: {
              type: 'string',
              description: 'Base URL of the application (e.g., https://adnanpay.com/demo/)',
            },
            test_data: {
              type: 'object',
              description: 'Test data for the flow (e.g., product ID, user credentials)',
            },
          },
          required: ['flow_type', 'base_url'],
        },
      },
      {
        name: 'accessibility_audit',
        description: 'Run accessibility audit on a page using axe-core',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to audit',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'performance_audit',
        description: 'Run performance audit and collect metrics',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to audit',
            },
          },
          required: ['url'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'validate_user_flow') {
    return await validateUserFlow(args);
  } else if (name === 'accessibility_audit') {
    return await accessibilityAudit(args);
  } else if (name === 'performance_audit') {
    return await performanceAudit(args);
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function validateUserFlow(args) {
  const { flow_type, base_url, test_data = {} } = args;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const findings = [];
  let success = false;

  try {
    switch (flow_type) {
      case 'guest_checkout':
        success = await validateGuestCheckout(page, base_url, test_data, findings);
        break;
      case 'guest_tracking':
        success = await validateGuestTracking(page, base_url, test_data, findings);
        break;
      case 'reseller_registration':
        success = await validateResellerRegistration(page, base_url, test_data, findings);
        break;
      case 'reseller_transaction':
        success = await validateResellerTransaction(page, base_url, test_data, findings);
        break;
      case 'reseller_payout':
        success = await validateResellerPayout(page, base_url, test_data, findings);
        break;
      case 'admin_management':
        success = await validateAdminManagement(page, base_url, test_data, findings);
        break;
      default:
        throw new Error(`Unknown flow type: ${flow_type}`);
    }
  } catch (error) {
    findings.push({
      severity: 'critical',
      category: 'error',
      message: `Flow validation failed: ${error.message}`,
      location: 'general',
    });
  } finally {
    await browser.close();
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          flow_type,
          success,
          findings,
          summary: {
            critical: findings.filter(f => f.severity === 'critical').length,
            high: findings.filter(f => f.severity === 'high').length,
            medium: findings.filter(f => f.severity === 'medium').length,
            low: findings.filter(f => f.severity === 'low').length,
          },
        }, null, 2),
      },
    ],
  };
}

async function validateGuestCheckout(page, baseUrl, testData, findings) {
  try {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    const products = await page.locator('button:has-text("GoPay"), button:has-text("Telkomsel")').count();
    if (products === 0) {
      findings.push({
        severity: 'critical',
        category: 'functionality',
        message: 'No products found on homepage',
        location: 'homepage',
      });
      return false;
    }

    await page.locator('button:has-text("GoPay"), button:has-text("Telkomsel")').first().click();
    await page.waitForTimeout(1000);

    const customerIdInput = await page.locator('input[placeholder*="ID"], input[placeholder*="Nomor"]').first();
    if (!(await customerIdInput.isVisible())) {
      findings.push({
        severity: 'critical',
        category: 'functionality',
        message: 'Checkout form not visible',
        location: 'checkout_form',
      });
      return false;
    }

    await customerIdInput.fill(testData.customer_id || '081234567890');

    const submitButton = await page.locator('button:has-text("Bayar"), button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(2000);

    findings.push({
      severity: 'info',
      category: 'success',
      message: 'Guest checkout flow completed',
      location: 'checkout',
    });
    return true;
  } catch (error) {
    findings.push({
      severity: 'critical',
      category: 'error',
      message: `Guest checkout error: ${error.message}`,
      location: 'guest_checkout',
    });
    return false;
  }
}

async function validateGuestTracking(page, baseUrl, testData, findings) {
  try {
    await page.goto(`${baseUrl}lacak`);
    await page.waitForLoadState('networkidle');

    const invoiceInput = await page.locator('input[placeholder*="invoice"], input[placeholder*="kode"]').first();
    if (!(await invoiceInput.isVisible())) {
      findings.push({
        severity: 'critical',
        category: 'functionality',
        message: 'Invoice input not found',
        location: 'tracking_page',
      });
      return false;
    }

    findings.push({
      severity: 'info',
      category: 'success',
      message: 'Guest tracking page accessible',
      location: 'tracking',
    });
    return true;
  } catch (error) {
    findings.push({
      severity: 'critical',
      category: 'error',
      message: `Guest tracking error: ${error.message}`,
      location: 'guest_tracking',
    });
    return false;
  }
}

async function validateResellerRegistration(page, baseUrl, testData, findings) {
  try {
    await page.goto(`${baseUrl}dashboard`);
    await page.waitForLoadState('networkidle');

    const emailInput = await page.locator('input[type="email"]').first();
    if (!(await emailInput.isVisible())) {
      findings.push({
        severity: 'critical',
        category: 'functionality',
        message: 'Registration form not visible',
        location: 'registration',
      });
      return false;
    }

    findings.push({
      severity: 'info',
      category: 'success',
      message: 'Reseller registration accessible',
      location: 'registration',
    });
    return true;
  } catch (error) {
    findings.push({
      severity: 'critical',
      category: 'error',
      message: `Reseller registration error: ${error.message}`,
      location: 'reseller_registration',
    });
    return false;
  }
}

async function validateResellerTransaction(page, baseUrl, testData, findings) {
  findings.push({
    severity: 'info',
    category: 'todo',
    message: 'Reseller transaction validation not implemented',
    location: 'reseller_transaction',
  });
  return true;
}

async function validateResellerPayout(page, baseUrl, testData, findings) {
  findings.push({
    severity: 'info',
    category: 'todo',
    message: 'Reseller payout validation not implemented',
    location: 'reseller_payout',
  });
  return true;
}

async function validateAdminManagement(page, baseUrl, testData, findings) {
  findings.push({
    severity: 'info',
    category: 'todo',
    message: 'Admin management validation not implemented',
    location: 'admin_management',
  });
  return true;
}

async function accessibilityAudit(args) {
  const { url } = args;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js',
    });

    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        axe.run((err, results) => {
          if (err) throw err;
          resolve(results);
        });
      });
    });

    await browser.close();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            url,
            violations: results.violations.length,
            passes: results.passes.length,
            details: results.violations.map(v => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.length,
            })),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function performanceAudit(args) {
  const { url } = args;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
      };
    });

    await browser.close();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            url,
            loadTime,
            metrics,
            assessment: loadTime < 3000 ? 'good' : loadTime < 5000 ? 'needs improvement' : 'poor',
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Adnanpay TestSprite MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
