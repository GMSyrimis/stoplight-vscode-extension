import * as vscode from 'vscode';

/**
 * Callback function type for file change events
 */
export type FileChangeCallback = (content: string) => void;

/**
 * Callback function type for file deletion events
 */
export type FileDeletionCallback = () => void;

/**
 * Callback function type for file error events
 */
export type FileErrorCallback = (error: Error) => void;

/**
 * Options for configuring the file watcher
 */
export interface FileWatcherOptions {
  /** Debounce delay in milliseconds (default: 500ms) */
  debounceDelay?: number;
}

/**
 * Watches a file for changes and triggers callbacks
 * 
 * Responsibilities:
 * - Monitor file changes in the editor
 * - Debounce rapid changes to avoid excessive updates
 * - Trigger preview updates when file content changes
 * - Handle file deletion events
 */
export class FileWatcher {
  private disposables: vscode.Disposable[] = [];
  private debounceTimer: NodeJS.Timeout | undefined;
  private debounceDelay: number;

  constructor(options: FileWatcherOptions = {}) {
    this.debounceDelay = options.debounceDelay ?? 500;
  }

  /**
   * Starts watching a file for changes
   * 
   * @param uri - The URI of the file to watch
   * @param onChanged - Callback when file content changes
   * @param onDeleted - Callback when file is deleted (optional)
   * @param onError - Callback when an error occurs (optional)
   * @returns Disposable to stop watching
   */
  watch(
    uri: vscode.Uri,
    onChanged: FileChangeCallback,
    onDeleted?: FileDeletionCallback,
    onError?: FileErrorCallback
  ): vscode.Disposable {
    // Watch for text document changes
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      try {
        // Check if the changed document matches our watched URI
        if (event.document.uri.toString() === uri.toString()) {
          // Debounce the change event
          this.debounceChange(() => {
            try {
              onChanged(event.document.getText());
            } catch (error) {
              console.error('Error in file change callback:', error);
              if (onError) {
                onError(error instanceof Error ? error : new Error(String(error)));
              }
            }
          });
        }
      } catch (error) {
        console.error('Error processing document change:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });

    this.disposables.push(changeDisposable);

    // Watch for file system changes (deletion, rename)
    try {
      const fileWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
          vscode.Uri.joinPath(uri, '..'),
          uri.path.split('/').pop() || '*'
        )
      );

      // Handle file deletion
      const deleteDisposable = fileWatcher.onDidDelete((deletedUri) => {
        try {
          if (deletedUri.toString() === uri.toString()) {
            console.log(`File deleted: ${uri.toString()}`);
            if (onDeleted) {
              onDeleted();
            }
          }
        } catch (error) {
          console.error('Error in file deletion callback:', error);
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      });

      this.disposables.push(deleteDisposable);
      this.disposables.push(fileWatcher);
    } catch (error) {
      console.error('Error creating file system watcher:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Return a disposable that cleans up all watchers
    return new vscode.Disposable(() => {
      this.dispose();
    });
  }

  /**
   * Debounces a function call to avoid excessive updates
   * 
   * @param fn - The function to debounce
   */
  private debounceChange(fn: () => void): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      fn();
      this.debounceTimer = undefined;
    }, this.debounceDelay);
  }

  /**
   * Disposes of all watchers and cleans up resources
   */
  dispose(): void {
    // Clear any pending debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    // Dispose all disposables
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
