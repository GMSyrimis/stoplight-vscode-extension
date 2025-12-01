/**
 * Simple test script to verify file detection logic
 * Run with: node test-detection.js
 */

const fs = require('fs');
const path = require('path');

// Import the regex pattern from fileDetection.ts
const OPENAPI_MARKER_REGEX = /["']?\s*(openapi|swagger)\s*["']?\s*:\s*['"]?[\d.]+['"]?/im;

function hasOpenApiMarker(content) {
  return OPENAPI_MARKER_REGEX.test(content);
}

function testFile(filePath, expectedResult) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = hasOpenApiMarker(content);
  const status = result === expectedResult ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${path.basename(filePath)} - Expected: ${expectedResult}, Got: ${result}`);
  return result === expectedResult;
}

console.log('Testing OpenAPI File Detection\n');

let passed = 0;
let failed = 0;

// Test valid OpenAPI files
if (testFile('./test-samples/valid-openapi.yaml', true)) passed++; else failed++;
if (testFile('./test-samples/valid-swagger.json', true)) passed++; else failed++;

// Test invalid files
if (testFile('./test-samples/invalid-no-marker.yaml', false)) passed++; else failed++;

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
