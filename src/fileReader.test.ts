import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileReader, FileReadErrorType } from './fileReader';

suite('FileReader Test Suite', () => {
  let fileReader: FileReader;

  setup(() => {
    fileReader = new FileReader();
  });

  suite('detectFileType', () => {
    test('should detect YAML files with .yaml extension', () => {
      const uri = vscode.Uri.file('/path/to/file.yaml');
      const result = fileReader.detectFileType(uri);
      assert.strictEqual(result, 'yaml');
    });

    test('should detect YAML files with .yml extension', () => {
      const uri = vscode.Uri.file('/path/to/file.yml');
      const result = fileReader.detectFileType(uri);
      assert.strictEqual(result, 'yaml');
    });

    test('should detect JSON files', () => {
      const uri = vscode.Uri.file('/path/to/file.json');
      const result = fileReader.detectFileType(uri);
      assert.strictEqual(result, 'json');
    });

    test('should return unknown for unsupported extensions', () => {
      const uri = vscode.Uri.file('/path/to/file.txt');
      const result = fileReader.detectFileType(uri);
      assert.strictEqual(result, 'unknown');
    });

    test('should be case-insensitive', () => {
      const uri1 = vscode.Uri.file('/path/to/file.YAML');
      const uri2 = vscode.Uri.file('/path/to/file.JSON');
      assert.strictEqual(fileReader.detectFileType(uri1), 'yaml');
      assert.strictEqual(fileReader.detectFileType(uri2), 'json');
    });
  });

  suite('readFromDocument', () => {
    test('should successfully read content from a document', async () => {
      // Create a test document
      const content = 'openapi: 3.0.0\ninfo:\n  title: Test API';
      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'yaml'
      });

      const result = fileReader.readFromDocument(doc);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.content, content);
      assert.strictEqual(result.error, undefined);
    });

    test('should handle empty documents', async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: '',
        language: 'yaml'
      });

      const result = fileReader.readFromDocument(doc);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.content, '');
    });
  });

  suite('FileReadError', () => {
    test('should provide user-friendly message for NotFound error', () => {
      const uri = vscode.Uri.file('/path/to/missing.yaml');
      const result = {
        success: false,
        error: {
          type: FileReadErrorType.NotFound,
          uri,
          getUserMessage: () => `File not found: ${uri.fsPath}`
        }
      };

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.getUserMessage().includes('File not found'));
      assert.ok(result.error?.getUserMessage().includes('missing.yaml'));
    });

    test('should provide user-friendly message for PermissionDenied error', () => {
      const uri = vscode.Uri.file('/path/to/restricted.yaml');
      const result = {
        success: false,
        error: {
          type: FileReadErrorType.PermissionDenied,
          uri,
          getUserMessage: () => `Permission denied: Cannot read file ${uri.fsPath}`
        }
      };

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.getUserMessage().includes('Permission denied'));
      assert.ok(result.error?.getUserMessage().includes('restricted.yaml'));
    });

    test('should provide user-friendly message for TooLarge error', () => {
      const uri = vscode.Uri.file('/path/to/huge.yaml');
      const result = {
        success: false,
        error: {
          type: FileReadErrorType.TooLarge,
          uri,
          getUserMessage: () => `File too large: ${uri.fsPath} exceeds the maximum size limit`
        }
      };

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.getUserMessage().includes('File too large'));
      assert.ok(result.error?.getUserMessage().includes('huge.yaml'));
    });
  });
});

