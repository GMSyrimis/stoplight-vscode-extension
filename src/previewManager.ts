import * as vscode from 'vscode';
import { getHtmlContent, getDefaultOptions, StoplightOptions } from './webviewContent';
import { FileReader } from './fileReader';
import { FileWatcher } from './fileWatcher';
import { HttpServer } from './httpServer';

/**
 * Message types for communication between extension and webview
 */

// Extension → Webview messages
interface UpdateMessage {
  type: 'update';
  content: string;
  timestamp: number;
}

interface OptionsMessage {
  type: 'options';
  options: StoplightOptions;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

// Webview → Extension messages
interface ReadyMessage {
  type: 'ready';
}

interface OptionChangedMessage {
  type: 'optionChanged';
  option: 'layout' | 'hideTryIt' | 'hideSchemas';
  value: string | boolean;
}

interface WebviewErrorMessage {
  type: 'error';
  message: string;
}

type WebviewToExtensionMessage = ReadyMessage | OptionChangedMessage | WebviewErrorMessage;

/**
 * Represents a preview panel with its associated resources
 */
interface PreviewPanel {
  /** The webview panel instance */
  panel: vscode.WebviewPanel;
  /** The document being previewed */
  document: vscode.TextDocument;
  /** Disposables for cleanup */
  disposables: vscode.Disposable[];
  /** Current Stoplight options */
  options: StoplightOptions;
  /** File watcher for live updates */
  fileWatcher: FileWatcher;
  /** The column where the preview was last shown */
  lastViewColumn: vscode.ViewColumn;
}

/**
 * Manages the lifecycle of OpenAPI preview webview panels
 * 
 * Responsibilities:
 * - Create and show preview panels
 * - Track active preview panels
 * - Handle panel visibility and focus
 * - Coordinate cleanup and disposal
 */
export class PreviewManager {
  /** Map of document URIs to their preview panels */
  private previews: Map<string, PreviewPanel> = new Map();
  
  /** Map of document URIs to their last known column positions */
  private lastColumnPositions: Map<string, vscode.ViewColumn> = new Map();
  
  /** Extension context for accessing resources */
  private context: vscode.ExtensionContext;

  /** File reader for reading OpenAPI documents */
  private fileReader: FileReader;

  /** HTTP server for serving OpenAPI content */
  private httpServer: HttpServer;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.fileReader = new FileReader();
    this.httpServer = new HttpServer();
    
    // Start the HTTP server
    this.httpServer.start().catch(error => {
      console.error('Failed to start HTTP server:', error);
      vscode.window.showErrorMessage('Failed to start OpenAPI preview server');
    });
  }

  /**
   * Creates a new preview or shows an existing one for the given document
   * 
   * @param document - The OpenAPI document to preview
   * @param viewColumn - The column to display the preview in (optional)
   * @returns Promise that resolves when the preview is created/shown
   */
  async createOrShowPreview(
    document: vscode.TextDocument,
    viewColumn?: vscode.ViewColumn
  ): Promise<void> {
    try {
      const documentUri = document.uri.toString();

      // Check if a preview already exists for this document
      const existingPreview = this.previews.get(documentUri);
      
      if (existingPreview) {
        // Preview exists - reveal it
        // If viewColumn is specified, use it; otherwise use the last known column
        const columnToUse = viewColumn || existingPreview.lastViewColumn;
        try {
          existingPreview.panel.reveal(columnToUse);
        } catch (error) {
          console.error('Error revealing preview panel:', error);
          // If reveal fails, try to recreate the preview
          this.disposePreview(documentUri);
          const columnToUse = viewColumn || this.lastColumnPositions.get(documentUri) || this.getPreviewColumn();
          await this.createPreview(document, columnToUse);
        }
        return;
      }

      // Create a new preview panel
      // If no viewColumn specified, check if we have a saved position for this document
      const columnToUse = viewColumn || this.lastColumnPositions.get(documentUri) || this.getPreviewColumn();
      await this.createPreview(document, columnToUse);
    } catch (error) {
      console.error('Error in createOrShowPreview:', error);
      throw error; // Re-throw to be handled by command handlers
    }
  }

  /**
   * Creates a new preview panel for the given document
   * 
   * @param document - The OpenAPI document to preview
   * @param viewColumn - The column to display the preview in
   */
  private async createPreview(
    document: vscode.TextDocument,
    viewColumn: vscode.ViewColumn
  ): Promise<void> {
    const documentUri = document.uri.toString();

    try {
      // Create the webview panel
      const panel = vscode.window.createWebviewPanel(
        'openapiPreview', // View type identifier
        `Preview: ${this.getDocumentTitle(document)}`, // Panel title
        viewColumn, // Editor column
        {
          enableScripts: true, // Allow JavaScript in the webview
          retainContextWhenHidden: true, // Keep webview state when hidden
          localResourceRoots: [
            // Allow loading resources from the extension directory
            vscode.Uri.joinPath(this.context.extensionUri, 'dist')
          ]
        }
      );

    // Set the webview icon (commented out - icon file doesn't exist yet)
    // panel.iconPath = vscode.Uri.joinPath(
    //   this.context.extensionUri,
    //   'dist',
    //   'icon.svg'
    // );

    // Create disposables array for cleanup
    const disposables: vscode.Disposable[] = [];

    // Handle panel disposal
    panel.onDidDispose(
      () => {
        this.disposePreview(documentUri);
      },
      null,
      disposables
    );

    // Handle view state changes (e.g., panel becomes visible/hidden, column changes)
    panel.onDidChangeViewState(
      (e) => {
        // Track column position changes for restoration
        if (e.webviewPanel.viewColumn !== undefined) {
          const preview = this.previews.get(documentUri);
          if (preview) {
            preview.lastViewColumn = e.webviewPanel.viewColumn;
            // Save the column position for future reopening
            this.lastColumnPositions.set(documentUri, e.webviewPanel.viewColumn);
          }
        }
        console.log(`Preview panel view state changed: visible=${e.webviewPanel.visible}, column=${e.webviewPanel.viewColumn}`);
      },
      null,
      disposables
    );

    // Create file watcher for live updates
    const fileWatcher = new FileWatcher({ debounceDelay: 500 });

    // Store the preview panel with its initial column position
    const previewPanel: PreviewPanel = {
      panel,
      document,
      disposables,
      options: {}, // Empty options - layout is fixed to sidebar
      fileWatcher,
      lastViewColumn: viewColumn
    };
    
    this.previews.set(documentUri, previewPanel);
    
    // Save the initial column position for future reopening
    this.lastColumnPositions.set(documentUri, viewColumn);

    // Set up file watcher for live updates
    const watcherDisposable = fileWatcher.watch(
      document.uri,
      // On file content change
      (content) => {
        console.log(`File changed: ${documentUri}`);
        // Update content in HTTP server
        this.httpServer.updateContent(documentUri, content);
        // Regenerate the entire HTML to force reload
        const contentUrl = this.httpServer.registerContent(documentUri, content);
        panel.webview.html = getHtmlContent(
          panel.webview,
          this.context.extensionUri,
          contentUrl
        );
        console.log('Preview HTML regenerated');
      },
      // On file deletion
      () => {
        console.log(`File deleted: ${documentUri}`);
        // Show error message in the preview
        const errorMsg: ErrorMessage = {
          type: 'error',
          message: 'The OpenAPI file has been deleted. The preview will no longer update.'
        };
        panel.webview.postMessage(errorMsg);
        
        // Optionally show a notification to the user
        vscode.window.showWarningMessage(
          `The OpenAPI file "${this.getDocumentTitle(document)}" has been deleted.`
        );
      },
      // On error
      (error) => {
        console.error(`Error watching file ${documentUri}:`, error);
        // Show error message in the preview
        const errorMsg: ErrorMessage = {
          type: 'error',
          message: `Error monitoring file changes: ${error.message}`
        };
        panel.webview.postMessage(errorMsg);
      }
    );

    disposables.push(watcherDisposable);

    // Set up message handling from webview
    panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        try {
          switch (message.type) {
            case 'ready':
              console.log('Webview is ready');
              // Optionally send initial state or perform initialization
              break;
            case 'optionChanged':
              // No longer used - layout is fixed to sidebar
              console.log('Option changed message received but ignored (layout is fixed)');
              break;
            case 'error':
              vscode.window.showErrorMessage(`Preview error: ${message.message}`);
              break;
            default:
              console.warn('Unknown message type from webview:', message);
          }
        } catch (error) {
          console.error('Error handling webview message:', error);
          vscode.window.showErrorMessage(
            `Error processing preview message: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
      null,
      disposables
    );

    // Read file content with error handling
    const readResult = this.fileReader.readFromDocument(document);
    
    if (!readResult.success || !readResult.content) {
      // Handle file reading error
      const errorMessage = readResult.error?.getUserMessage() || 'Failed to read file content';
      panel.webview.html = getHtmlContent(
        panel.webview,
        this.context.extensionUri,
        'about:blank', // Placeholder URL
        errorMessage // Pass error message
      );
      
      // Show error notification to user
      vscode.window.showErrorMessage(errorMessage);
      return;
    }

      // Register content with HTTP server and get URL
      const contentUrl = this.httpServer.registerContent(documentUri, readResult.content);
      
      // Generate HTML with content URL
      panel.webview.html = getHtmlContent(
        panel.webview,
        this.context.extensionUri,
        contentUrl
      );
    } catch (error) {
      console.error('Error creating preview:', error);
      vscode.window.showErrorMessage(
        `Failed to create preview: ${error instanceof Error ? error.message : String(error)}`
      );
      // Clean up if preview was partially created
      this.disposePreview(documentUri);
      throw error;
    }
  }

  /**
   * Updates the content of an existing preview
   * 
   * @param document - The document to update
   * @returns Promise that resolves when the update is complete
   */
  async updatePreview(document: vscode.TextDocument): Promise<void> {
    const documentUri = document.uri.toString();
    const preview = this.previews.get(documentUri);
    
    if (!preview) {
      console.warn(`No preview found for document: ${documentUri}`);
      return;
    }

    // Read file content with error handling
    const readResult = this.fileReader.readFromDocument(document);
    
    if (!readResult.success || !readResult.content) {
      // Send error message to webview
      const errorMessage = readResult.error?.getUserMessage() || 'Failed to read file content';
      const errorMsg: ErrorMessage = {
        type: 'error',
        message: errorMessage
      };
      preview.panel.webview.postMessage(errorMsg);
      return;
    }

    // Send updated content to webview
    const updateMsg: UpdateMessage = {
      type: 'update',
      content: readResult.content,
      timestamp: Date.now()
    };
    preview.panel.webview.postMessage(updateMsg);
  }

  /**
   * Updates the Stoplight options for an existing preview
   * 
   * @param document - The document whose preview should be updated
   * @param options - The new Stoplight options
   */
  updateOptions(document: vscode.TextDocument, options: Partial<StoplightOptions>): void {
    try {
      const documentUri = document.uri.toString();
      const preview = this.previews.get(documentUri);
      
      if (!preview) {
        console.warn(`No preview found for document: ${documentUri}`);
        return;
      }

      // Update stored options
      preview.options = {
        ...preview.options,
        ...options
      };

      // Send options update to webview
      const optionsMsg: OptionsMessage = {
        type: 'options',
        options: preview.options
      };
      preview.panel.webview.postMessage(optionsMsg);
    } catch (error) {
      console.error('Error updating preview options:', error);
      vscode.window.showErrorMessage(
        `Failed to update preview options: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disposes of a preview panel and cleans up resources
   * 
   * @param documentUri - The URI of the document whose preview should be disposed
   */
  private disposePreview(documentUri: string): void {
    try {
      const preview = this.previews.get(documentUri);
      
      if (!preview) {
        return;
      }

      // Save the last column position before disposal (for requirement 4.4)
      // This allows us to restore the preview in the same position when reopened
      if (preview.panel.viewColumn !== undefined) {
        this.lastColumnPositions.set(documentUri, preview.panel.viewColumn);
      }

      // Remove content from HTTP server
      this.httpServer.removeContent(documentUri);

      // Dispose of the file watcher
      try {
        preview.fileWatcher.dispose();
      } catch (error) {
        console.error('Error disposing file watcher:', error);
      }

      // Dispose of all disposables
      preview.disposables.forEach(d => {
        try {
          d.dispose();
        } catch (error) {
          console.error('Error disposing resource:', error);
        }
      });

      // Remove from the map (but keep lastColumnPositions)
      this.previews.delete(documentUri);

      console.log(`Disposed preview for: ${documentUri}, saved column position: ${preview.panel.viewColumn}`);
    } catch (error) {
      console.error('Error disposing preview:', error);
      // Still try to remove from map even if disposal fails
      this.previews.delete(documentUri);
    }
  }

  /**
   * Determines the appropriate view column for the preview
   * Based on the current editor layout and user configuration
   * 
   * Reads the configuration value:
   * - openapi-preview.previewColumn: Where to open the preview panel ('beside' or 'active')
   * 
   * Requirements:
   * - 4.1: Display in a separate editor column by default
   * - 4.2: Place in an adjacent column when multiple columns exist
   * - 4.5: Create a second column for single column layouts
   * 
   * @returns The view column to use for the preview
   */
  private getPreviewColumn(): vscode.ViewColumn {
    const activeEditor = vscode.window.activeTextEditor;
    
    if (!activeEditor) {
      // No active editor - default to column Two
      return vscode.ViewColumn.Two;
    }

    // Get user preference for preview column from configuration
    const config = vscode.workspace.getConfiguration('openapi-preview');
    const previewColumn = config.get<string>('previewColumn', 'beside');

    if (previewColumn === 'active') {
      // Replace the active editor (not recommended, but supported)
      return activeEditor.viewColumn || vscode.ViewColumn.One;
    }

    // Default behavior: open beside the active editor
    // ViewColumn.Beside automatically handles:
    // - Single column layout: creates a second column (requirement 4.5)
    // - Multi-column layout: places in adjacent column (requirement 4.2)
    // - Always separate from source (requirement 4.1)
    return vscode.ViewColumn.Beside;
  }

  /**
   * Gets a display title for the document
   * 
   * @param document - The document to get the title for
   * @returns A human-readable title
   */
  private getDocumentTitle(document: vscode.TextDocument): string {
    const fileName = document.uri.path.split('/').pop() || 'OpenAPI';
    return fileName;
  }

  /**
   * Disposes of all preview panels and cleans up resources
   * Called when the extension is deactivated
   */
  dispose(): void {
    try {
      // Dispose all previews
      for (const [uri, preview] of this.previews.entries()) {
        try {
          preview.panel.dispose();
        } catch (error) {
          console.error(`Error disposing panel for ${uri}:`, error);
        }
        this.disposePreview(uri);
      }
      
      this.previews.clear();
      
      // Stop HTTP server
      this.httpServer.dispose();
      
      console.log('PreviewManager disposed');
    } catch (error) {
      console.error('Error disposing PreviewManager:', error);
      // Ensure previews are cleared even if disposal fails
      this.previews.clear();
    }
  }
}
