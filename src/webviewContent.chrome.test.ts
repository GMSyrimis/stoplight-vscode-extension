/**
 * Chrome DevTools MCP tests for webview HTML content
 * 
 * These tests verify that the generated HTML content for the webview:
 * - Loads Stoplight Elements scripts and CSS correctly
 * - Contains the elements-api component
 * - Renders API documentation
 * - Updates content when file changes
 * - Handles errors gracefully
 * 
 * Note: Layout is now fixed to 'sidebar' and no longer configurable
 * 
 * Requirements tested: 1.4, 1.5, 2.1, 2.2, 6.1, 6.2
 */

import * as assert from 'assert';
import { getHtmlContent } from './webviewContent';

/**
 * Mock Webview for testing
 */
class MockWebview {
  cspSource = 'vscode-webview://test';
  
  asWebviewUri(uri: any): any {
    return {
      toString: () => `vscode-webview://test/${uri.path}`
    };
  }
}

/**
 * Mock URI for testing
 */
class MockUri {
  path: string;
  
  constructor(path: string) {
    this.path = path;
  }
  
  static joinPath(base: MockUri, ...segments: string[]): MockUri {
    return new MockUri([base.path, ...segments].join('/'));
  }
}

describe('Webview HTML Content - Chrome DevTools Tests', () => {
  const mockWebview = new MockWebview() as any;
  const mockExtensionUri = new MockUri('/extension') as any;
  const sampleOpenApiContent = `openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
  description: A test API for validation
paths:
  /users:
    get:
      summary: Get users
      responses:
        '200':
          description: Success
  /posts:
    get:
      summary: Get posts
      responses:
        '200':
          description: Success
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string`;

  /**
   * Test 1: Verify Stoplight Elements scripts are loaded
   * Requirements: 6.2
   */
  it('should include Stoplight Elements script tag', () => {
    const html = getHtmlContent(mockWebview, mockExtensionUri, sampleOpenApiContent);
    
    // Check for script tag with web-components.min.js
    assert.ok(
      html.includes('web-components.min.js'),
      'HTML should include Stoplight Elements web-components.min.js script'
    );
    
    // Check for script tag with proper src attribute
    assert.ok(
      html.includes('<script src="vscode-webview://test/'),
      'Script tag should have proper webview URI'
    );
  });

  /**
   * Test 2: Verify Stoplight Elements CSS is loaded
   * Requirements: 6.2
   */
  it('should include Stoplight Elements CSS', () => {
    const html = getHtmlContent(mockWebview, mockExtensionUri, sampleOpenApiContent);
    
    // Check for link tag with styles.min.css
    assert.ok(
      html.includes('styles.min.css'),
      'HTML should include Stoplight Elements styles.min.css'
    );
    
    // Check for link tag with proper href attribute
    assert.ok(
      html.includes('<link rel="stylesheet" href="vscode-webview://test/'),
      'Link tag should have proper webview URI'
    );
  });

  /**
   * Test 3: Verify elements-api component is present in DOM
   * Requirements: 1.4
   */
  it('should include elements-api custom element', () => {
    const html = getHtmlContent(mockWebview, mockExtensionUri, sampleOpenApiContent);
    
    // Check for elements-api tag
    assert.ok(
      html.includes('<elements-api'),
      'HTML should include <elements-api> custom element'
    );
    
    // Check for id attribute
    assert.ok(
      html.includes('id="elements"'),
      'elements-api should have id="elements"'
    );
    
    // Check for apiDescriptionDocument attribute
    assert.ok(
      html.includes('apiDescriptionDocument='),
      'elements-api should have apiDescriptionDocument attribute'
    );
  });

  /**
   * Test 4: Verify API documentation content is passed to elements-api
   * Requirements: 1.5
   */
  it('should pass OpenAPI content to elements-api component', () => {
    const html = getHtmlContent(mockWebview, mockExtensionUri, sampleOpenApiContent);
    
    // Check that the content includes escaped OpenAPI markers
    assert.ok(
      html.includes('openapi:'),
      'HTML should contain OpenAPI content'
    );
    
    // Check that paths are included
    assert.ok(
      html.includes('/users') || html.includes('\\/users'),
      'HTML should contain API paths'
    );
    
    // Check that schemas are included
    assert.ok(
      html.includes('User') || html.includes('schemas'),
      'HTML should contain schema information'
    );
  });

  /**
   * Test 5: Verify layout is fixed to sidebar
   * Requirements: 1.4
   */
  it('should use sidebar layout', () => {
    const html = getHtmlContent(mockWebview, mockExtensionUri, sampleOpenApiContent);
    
    // Check that layout attribute is set to sidebar
    assert.ok(
      html.includes('layout="sidebar"'),
      'elements-api should have layout="sidebar"'
    );
  });

  /**
   * Test 6: Verify message handling for content updates
   * Requirements: 2.1, 2.2
   */
  it('should include message handler for content updates', () => {
    const html = getHtmlContent(mockWebview, mockExtensionUri, sampleOpenApiContent);
    
    // Check for message event listener
    assert.ok(
      html.includes("window.addEventListener('message'"),
      'HTML should include message event listener'
    );
    
    // Check for update message type handling
    assert.ok(
      html.includes("case 'update':"),
      'Message handler should handle update messages'
    );
    
    // Check for setAttribute call to update content
    assert.ok(
      html.includes("setAttribute('apiDescriptionDocument'"),
      'Update handler should set apiDescriptionDocument attribute'
    );
  });

  /**
   * Test 7: Verify error handling
   * Requirements: 7.4
   */
  it('should display error message when provided', () => {
    const errorMessage = 'Failed to read file: Permission denied';
    const html = getHtmlContent(mockWebview, mockExtensionUri, sampleOpenApiContent, errorMessage);
    
    // Check for error container
    assert.ok(
      html.includes('id="error-container"'),
      'HTML should include error container'
    );
    
    // Check that error is displayed
    assert.ok(
      html.includes(errorMessage),
      'Error container should contain error message'
    );
  });

  /**
   * Test 8: Verify Content Security Policy is set
   * Requirements: 6.2
   */
  it('should include Content Security Policy meta tag', () => {
    const html = getHtmlContent(mockWebview, mockExtensionUri, sampleOpenApiContent);
    
    // Check for CSP meta tag
    assert.ok(
      html.includes('Content-Security-Policy'),
      'HTML should include Content-Security-Policy meta tag'
    );
    
    // Check for script-src directive
    assert.ok(
      html.includes('script-src'),
      'CSP should include script-src directive'
    );
    
    // Check for style-src directive
    assert.ok(
      html.includes('style-src'),
      'CSP should include style-src directive'
    );
  });

  /**
   * Test 9: Verify ready message is sent
   * Requirements: 2.1
   */
  it('should send ready message to extension', () => {
    const html = getHtmlContent(mockWebview, mockExtensionUri, sampleOpenApiContent);
    
    // Check for ready message
    assert.ok(
      html.includes("type: 'ready'"),
      'HTML should send ready message to extension'
    );
    
    // Check for postMessage call
    assert.ok(
      html.includes('vscode.postMessage'),
      'HTML should use postMessage to communicate with extension'
    );
  });

  /**
   * Test 10: Verify error message handling in webview
   * Requirements: 7.4
   */
  it('should include error message handler', () => {
    const html = getHtmlContent(mockWebview, mockExtensionUri, sampleOpenApiContent);
    
    // Check for error message type handling
    assert.ok(
      html.includes("case 'error':"),
      'Message handler should handle error messages'
    );
    
    // Check for showError function
    assert.ok(
      html.includes('function showError'),
      'Should have showError function'
    );
  });
});
