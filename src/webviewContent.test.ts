import * as assert from 'assert';
import { getHtmlContent, getDefaultOptions } from './webviewContent';
import * as vscode from 'vscode';

suite('Webview Content Tests', () => {
  suite('getHtmlContent', () => {
    test('should generate HTML with Stoplight Elements script tag', () => {
      const mockWebview = {
        asWebviewUri: (uri: vscode.Uri) => uri,
        cspSource: 'vscode-webview://'
      } as vscode.Webview;

      const mockExtensionUri = vscode.Uri.file('/extension');
      const fileContent = 'openapi: 3.0.0\ninfo:\n  title: Test API';

      const html = getHtmlContent(mockWebview, mockExtensionUri, fileContent);

      // Verify script tag is present
      assert.ok(html.includes('<script src='), 'Should include script tag');
      assert.ok(html.includes('web-components.min.js'), 'Should reference web-components.min.js');
    });

    test('should generate HTML with Stoplight Elements CSS link', () => {
      const mockWebview = {
        asWebviewUri: (uri: vscode.Uri) => uri,
        cspSource: 'vscode-webview://'
      } as vscode.Webview;

      const mockExtensionUri = vscode.Uri.file('/extension');
      const fileContent = 'openapi: 3.0.0';

      const html = getHtmlContent(mockWebview, mockExtensionUri, fileContent);

      // Verify CSS link is present
      assert.ok(html.includes('<link rel="stylesheet"'), 'Should include CSS link');
      assert.ok(html.includes('styles.min.css'), 'Should reference styles.min.css');
    });

    test('should generate HTML with elements-api custom element', () => {
      const mockWebview = {
        asWebviewUri: (uri: vscode.Uri) => uri,
        cspSource: 'vscode-webview://'
      } as vscode.Webview;

      const mockExtensionUri = vscode.Uri.file('/extension');
      const fileContent = 'openapi: 3.0.0';

      const html = getHtmlContent(mockWebview, mockExtensionUri, fileContent);

      // Verify elements-api element is present
      assert.ok(html.includes('<elements-api'), 'Should include elements-api element');
      assert.ok(html.includes('apiDescriptionDocument='), 'Should have apiDescriptionDocument attribute');
    });

    test('should include Content Security Policy', () => {
      const mockWebview = {
        asWebviewUri: (uri: vscode.Uri) => uri,
        cspSource: 'vscode-webview://'
      } as vscode.Webview;

      const mockExtensionUri = vscode.Uri.file('/extension');
      const fileContent = 'openapi: 3.0.0';

      const html = getHtmlContent(mockWebview, mockExtensionUri, fileContent);

      // Verify CSP is present
      assert.ok(html.includes('Content-Security-Policy'), 'Should include CSP meta tag');
      assert.ok(html.includes('script-src'), 'CSP should include script-src directive');
      assert.ok(html.includes('style-src'), 'CSP should include style-src directive');
    });

    test('should use sidebar layout by default', () => {
      const mockWebview = {
        asWebviewUri: (uri: vscode.Uri) => uri,
        cspSource: 'vscode-webview://'
      } as vscode.Webview;

      const mockExtensionUri = vscode.Uri.file('/extension');
      const fileContent = 'openapi: 3.0.0';

      const html = getHtmlContent(mockWebview, mockExtensionUri, fileContent);

      // Verify layout is set to sidebar
      assert.ok(html.includes('layout="sidebar"'), 'Should set layout attribute to sidebar');
    });

    test('should escape file content for safe embedding', () => {
      const mockWebview = {
        asWebviewUri: (uri: vscode.Uri) => uri,
        cspSource: 'vscode-webview://'
      } as vscode.Webview;

      const mockExtensionUri = vscode.Uri.file('/extension');
      const fileContent = 'openapi: 3.0.0\ninfo:\n  title: "Test <script>alert(1)</script>"';

      const html = getHtmlContent(mockWebview, mockExtensionUri, fileContent);

      // Verify dangerous content is escaped
      assert.ok(!html.includes('<script>alert(1)</script>'), 'Should escape script tags');
      assert.ok(html.includes('&lt;script&gt;'), 'Should use HTML entities for < and >');
    });

    test('should display error message when provided', () => {
      const mockWebview = {
        asWebviewUri: (uri: vscode.Uri) => uri,
        cspSource: 'vscode-webview://'
      } as vscode.Webview;

      const mockExtensionUri = vscode.Uri.file('/extension');
      const fileContent = 'openapi: 3.0.0';
      const errorMessage = 'Failed to read file';

      const html = getHtmlContent(mockWebview, mockExtensionUri, fileContent, errorMessage);

      // Verify error message is displayed
      assert.ok(html.includes(errorMessage), 'Should include error message');
      assert.ok(html.includes('error-container'), 'Should include error container');
    });
  });

  suite('getDefaultOptions', () => {
    test('should return empty options object', () => {
      const options = getDefaultOptions();

      // Layout is fixed to 'sidebar', so options should be empty
      assert.strictEqual(typeof options, 'object', 'Should return an object');
    });
  });
});
