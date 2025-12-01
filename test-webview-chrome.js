/**
 * Chrome DevTools MCP test script for webview HTML content
 * 
 * This script tests the webview HTML by loading it in Chrome and verifying:
 * - Stoplight Elements scripts are loaded
 * - Stoplight Elements CSS is loaded
 * - elements-api component is present in DOM
 * - API documentation renders correctly
 * - Header navigation controls are present
 * - Layout switching works
 * - Try It toggle works
 * - Schemas toggle works
 * - Content updates when file changes
 * 
 * Requirements tested: 1.4, 1.5, 2.1, 2.2, 6.1, 6.2
 */

const path = require('path');
const fs = require('fs');

// This script is meant to be run manually with Chrome DevTools MCP
// It provides instructions for testing the webview

console.log('='.repeat(80));
console.log('Chrome DevTools MCP Test Instructions for Webview HTML');
console.log('='.repeat(80));
console.log('');
console.log('Test file location:', path.join(__dirname, 'test-webview.html'));
console.log('');
console.log('To test the webview HTML content:');
console.log('');
console.log('1. Open the test-webview.html file in Chrome');
console.log('   file://' + path.join(__dirname, 'test-webview.html'));
console.log('');
console.log('2. Use Chrome DevTools MCP to verify:');
console.log('');
console.log('   Test 1: Verify Stoplight Elements scripts are loaded');
console.log('   - Take a snapshot and check for <script> tag with web-components.min.js');
console.log('');
console.log('   Test 2: Verify Stoplight Elements CSS is loaded');
console.log('   - Take a snapshot and check for <link> tag with styles.min.css');
console.log('');
console.log('   Test 3: Verify elements-api component is present in DOM');
console.log('   - Take a snapshot and check for <elements-api> element with id="elements"');
console.log('');
console.log('   Test 4: Verify API documentation renders correctly');
console.log('   - Take a snapshot and check that API paths (/users, /posts) are visible');
console.log('   - Check that schemas (User) are visible');
console.log('');
console.log('   Test 5: Verify header navigation controls are present');
console.log('   - Take a snapshot and check for:');
console.log('     * Layout selector (id="layout-select")');
console.log('     * Hide Try It checkbox (id="hide-tryit")');
console.log('     * Hide Schemas checkbox (id="hide-schemas")');
console.log('');
console.log('   Test 6: Verify layout switching works');
console.log('   - Click on layout selector and change to "Stacked"');
console.log('   - Verify elements-api has layout="stacked" attribute');
console.log('');
console.log('   Test 7: Verify Try It toggle works');
console.log('   - Click Hide Try It checkbox');
console.log('   - Verify elements-api has hideTryIt="true" attribute');
console.log('');
console.log('   Test 8: Verify Schemas toggle works');
console.log('   - Click Hide Schemas checkbox');
console.log('   - Verify elements-api has hideSchemas="true" attribute');
console.log('');
console.log('   Test 9: Verify content updates (simulated)');
console.log('   - Open browser console');
console.log('   - Run: document.getElementById("elements").setAttribute("apiDescriptionDocument", "openapi: 3.0.0\\ninfo:\\n  title: Updated API\\n  version: 2.0.0\\npaths:\\n  /test:\\n    get:\\n      summary: Test")');
console.log('   - Verify the API documentation updates to show "Updated API"');
console.log('');
console.log('='.repeat(80));
console.log('');

// Check if the test file exists
const testFilePath = path.join(__dirname, 'test-webview.html');
if (fs.existsSync(testFilePath)) {
  console.log('✓ Test file exists:', testFilePath);
} else {
  console.log('✗ Test file not found:', testFilePath);
  process.exit(1);
}

console.log('');
console.log('Ready to test!');
console.log('');
