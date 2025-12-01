import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileWatcher } from './fileWatcher';

suite('FileWatcher Test Suite', () => {
  let testWorkspaceUri: vscode.Uri;

  suiteSetup(async () => {
    // Get the workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder found for testing');
    }
    testWorkspaceUri = workspaceFolders[0].uri;
  });

  test('FileWatcher should be instantiable', () => {
    const watcher = new FileWatcher();
    assert.ok(watcher);
    watcher.dispose();
  });

  test('FileWatcher should accept custom debounce delay', () => {
    const watcher = new FileWatcher({ debounceDelay: 1000 });
    assert.ok(watcher);
    watcher.dispose();
  });

  test('FileWatcher watch should return a disposable', async () => {
    const watcher = new FileWatcher();
    
    // Create a test file
    const testFileUri = vscode.Uri.joinPath(testWorkspaceUri, 'test-samples', 'valid-openapi.yaml');
    
    const disposable = watcher.watch(
      testFileUri,
      () => {}, // onChange callback
      () => {}  // onDelete callback
    );
    
    assert.ok(disposable);
    assert.strictEqual(typeof disposable.dispose, 'function');
    
    disposable.dispose();
    watcher.dispose();
  });

  test('FileWatcher should trigger callback on file change', async function() {
    this.timeout(5000); // Increase timeout for file operations
    
    const watcher = new FileWatcher({ debounceDelay: 100 });
    
    // Create a temporary test file
    const testFileName = `test-file-${Date.now()}.yaml`;
    const testFileUri = vscode.Uri.joinPath(testWorkspaceUri, testFileName);
    
    try {
      // Create the file
      await vscode.workspace.fs.writeFile(testFileUri, Buffer.from('openapi: 3.0.0\n'));
      
      // Open the document
      const document = await vscode.workspace.openTextDocument(testFileUri);
      
      let changeCallbackCalled = false;
      let receivedContent = '';
      
      // Set up the watcher
      const disposable = watcher.watch(
        testFileUri,
        (content) => {
          changeCallbackCalled = true;
          receivedContent = content;
        }
      );
      
      // Make a change to the document
      const edit = new vscode.WorkspaceEdit();
      edit.insert(testFileUri, new vscode.Position(1, 0), 'info:\n  title: Test API\n');
      await vscode.workspace.applyEdit(edit);
      
      // Wait for debounce delay + buffer
      await new Promise(resolve => setTimeout(resolve, 300));
      
      assert.strictEqual(changeCallbackCalled, true, 'Change callback should be called');
      assert.ok(receivedContent.includes('Test API'), 'Received content should include the change');
      
      disposable.dispose();
    } finally {
      // Clean up: delete the test file
      try {
        await vscode.workspace.fs.delete(testFileUri);
      } catch (e) {
        // Ignore cleanup errors
      }
      watcher.dispose();
    }
  });

  test('FileWatcher should dispose cleanly', () => {
    const watcher = new FileWatcher();
    
    // Create a test file URI (doesn't need to exist for this test)
    const testFileUri = vscode.Uri.joinPath(testWorkspaceUri, 'test-samples', 'valid-openapi.yaml');
    
    const disposable = watcher.watch(
      testFileUri,
      () => {},
      () => {}
    );
    
    // Should not throw
    assert.doesNotThrow(() => {
      disposable.dispose();
      watcher.dispose();
    });
  });
});
