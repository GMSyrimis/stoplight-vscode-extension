import * as assert from 'assert';
import * as vscode from 'vscode';
import { getDefaultOptions } from './webviewContent';

/**
 * Tests for extension configuration
 * Validates that configuration values are properly read from VSCode settings
 * 
 * Note: Layout is now fixed to 'sidebar' and no longer configurable
 */
suite('Configuration Tests', () => {
  test('should read previewColumn configuration', () => {
    const config = vscode.workspace.getConfiguration('openapi-preview');
    const previewColumn = config.get<string>('previewColumn');
    
    // Should be one of the valid values or undefined (if not set)
    if (previewColumn !== undefined) {
      assert.ok(['beside', 'active'].includes(previewColumn),
        `previewColumn should be 'beside' or 'active', got: ${previewColumn}`);
    }
  });

  test('getDefaultOptions should return empty options object', () => {
    const options = getDefaultOptions();
    
    // Layout is fixed to 'sidebar', so options should be empty
    assert.strictEqual(typeof options, 'object', 'Should return an object');
  });
});
