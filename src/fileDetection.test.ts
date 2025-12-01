import * as assert from 'assert';
import { hasOpenApiExtension, hasOpenApiMarker } from './fileDetection';
import * as vscode from 'vscode';

suite('File Detection Tests', () => {
  suite('hasOpenApiExtension', () => {
    test('should return true for .yaml extension', () => {
      const uri = vscode.Uri.file('/path/to/api.yaml');
      assert.strictEqual(hasOpenApiExtension(uri), true);
    });

    test('should return true for .yml extension', () => {
      const uri = vscode.Uri.file('/path/to/api.yml');
      assert.strictEqual(hasOpenApiExtension(uri), true);
    });

    test('should return true for .json extension', () => {
      const uri = vscode.Uri.file('/path/to/api.json');
      assert.strictEqual(hasOpenApiExtension(uri), true);
    });

    test('should return false for .txt extension', () => {
      const uri = vscode.Uri.file('/path/to/file.txt');
      assert.strictEqual(hasOpenApiExtension(uri), false);
    });

    test('should return false for .md extension', () => {
      const uri = vscode.Uri.file('/path/to/README.md');
      assert.strictEqual(hasOpenApiExtension(uri), false);
    });

    test('should be case-insensitive', () => {
      const uri = vscode.Uri.file('/path/to/API.YAML');
      assert.strictEqual(hasOpenApiExtension(uri), true);
    });
  });

  suite('hasOpenApiMarker', () => {
    test('should detect openapi: with double quotes', () => {
      const content = 'openapi: "3.0.0"\ninfo:\n  title: Test API';
      assert.strictEqual(hasOpenApiMarker(content), true);
    });

    test('should detect openapi: with single quotes', () => {
      const content = "openapi: '3.1.0'\ninfo:\n  title: Test API";
      assert.strictEqual(hasOpenApiMarker(content), true);
    });

    test('should detect openapi: without quotes', () => {
      const content = 'openapi: 3.0.0\ninfo:\n  title: Test API';
      assert.strictEqual(hasOpenApiMarker(content), true);
    });

    test('should detect swagger: with double quotes', () => {
      const content = 'swagger: "2.0"\ninfo:\n  title: Test API';
      assert.strictEqual(hasOpenApiMarker(content), true);
    });

    test('should detect swagger: with single quotes', () => {
      const content = "swagger: '2.0'\ninfo:\n  title: Test API";
      assert.strictEqual(hasOpenApiMarker(content), true);
    });

    test('should detect swagger: without quotes', () => {
      const content = 'swagger: 2.0\ninfo:\n  title: Test API';
      assert.strictEqual(hasOpenApiMarker(content), true);
    });

    test('should detect marker with leading whitespace', () => {
      const content = '  openapi: 3.0.0\ninfo:\n  title: Test API';
      assert.strictEqual(hasOpenApiMarker(content), true);
    });

    test('should detect marker with tabs', () => {
      const content = '\topenapi: 3.0.0\ninfo:\n  title: Test API';
      assert.strictEqual(hasOpenApiMarker(content), true);
    });

    test('should be case-insensitive', () => {
      const content = 'OpenAPI: 3.0.0\ninfo:\n  title: Test API';
      assert.strictEqual(hasOpenApiMarker(content), true);
    });

    test('should return false for content without markers', () => {
      const content = 'title: Some Document\ndescription: Not an OpenAPI spec';
      assert.strictEqual(hasOpenApiMarker(content), false);
    });

    test('should return false for empty content', () => {
      const content = '';
      assert.strictEqual(hasOpenApiMarker(content), false);
    });

    test('should detect marker not at the start of file', () => {
      const content = '# Comment\n\nopenapi: 3.0.0\ninfo:\n  title: Test API';
      assert.strictEqual(hasOpenApiMarker(content), true);
    });

    test('should handle JSON format', () => {
      const content = '{\n  "openapi": "3.0.0",\n  "info": {\n    "title": "Test API"\n  }\n}';
      assert.strictEqual(hasOpenApiMarker(content), true);
    });
  });
});
