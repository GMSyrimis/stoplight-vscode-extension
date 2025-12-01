import * as vscode from 'vscode';
import { isOpenApiDocument, isOpenApiTextDocument } from './fileDetection';
import { PreviewManager } from './previewManager';

/**
 * Context key that tracks whether the active editor contains an OpenAPI document
 */
const OPENAPI_CONTEXT_KEY = 'openapi-preview.isOpenApiFile';

/**
 * Global preview manager instance
 */
let previewManager: PreviewManager | undefined;

/**
 * Updates the context key based on the active editor
 */
async function updateOpenApiContext() {
  const editor = vscode.window.activeTextEditor;
  
  if (!editor) {
    await vscode.commands.executeCommand('setContext', OPENAPI_CONTEXT_KEY, false);
    return;
  }

  const isOpenApi = isOpenApiTextDocument(editor.document);
  await vscode.commands.executeCommand('setContext', OPENAPI_CONTEXT_KEY, isOpenApi);
}

/**
 * Extension activation entry point
 * Called when the extension is activated (on command or when YAML/JSON files are opened)
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('OpenAPI Preview extension is now active');

  // Initialize the preview manager
  previewManager = new PreviewManager(context);

  // Initialize context key for the current active editor
  updateOpenApiContext();

  // Update context when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateOpenApiContext();
    })
  );

  // Update context when document content changes (to detect when markers are added/removed)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        updateOpenApiContext();
      }
    })
  );

  // Register "Open OpenAPI Preview" command
  // Opens preview in a new column (implementation will be added in subsequent tasks)
  const openPreview = vscode.commands.registerCommand(
    'openapi-preview.openPreview',
    async (uri?: vscode.Uri) => {
      try {
        // Get the target document
        const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
        
        if (!targetUri) {
          vscode.window.showErrorMessage('No OpenAPI file is currently active');
          return;
        }

        // Task 3: File detection logic
        const isOpenApi = await isOpenApiDocument(targetUri);
        if (!isOpenApi) {
          vscode.window.showWarningMessage(
            'The selected file does not appear to be a valid OpenAPI specification file. ' +
            'OpenAPI files must have .yaml, .yml, or .json extension and contain "openapi:" or "swagger:" version declaration.'
          );
          return;
        }

        // Open the document and create/show preview
        const document = await vscode.workspace.openTextDocument(targetUri);
        await previewManager?.createOrShowPreview(document);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to open OpenAPI preview: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  // Register "Open OpenAPI Preview to Side" command
  // Opens preview in a column beside the active editor
  const openPreviewToSide = vscode.commands.registerCommand(
    'openapi-preview.openPreviewToSide',
    async (uri?: vscode.Uri) => {
      try {
        // Get the target document
        const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
        
        if (!targetUri) {
          vscode.window.showErrorMessage('No OpenAPI file is currently active');
          return;
        }

        // Task 3: File detection logic
        const isOpenApi = await isOpenApiDocument(targetUri);
        if (!isOpenApi) {
          vscode.window.showWarningMessage(
            'The selected file does not appear to be a valid OpenAPI specification file. ' +
            'OpenAPI files must have .yaml, .yml, or .json extension and contain "openapi:" or "swagger:" version declaration.'
          );
          return;
        }

        // Open the document and create/show preview beside the active editor
        const document = await vscode.workspace.openTextDocument(targetUri);
        await previewManager?.createOrShowPreview(document, vscode.ViewColumn.Beside);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to open OpenAPI preview to side: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  // Add commands to subscriptions for proper cleanup
  context.subscriptions.push(openPreview, openPreviewToSide);
}

/**
 * Extension deactivation entry point
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log('OpenAPI Preview extension is now deactivated');
  
  // Dispose of PreviewManager and cleanup resources
  if (previewManager) {
    previewManager.dispose();
    previewManager = undefined;
  }
}
