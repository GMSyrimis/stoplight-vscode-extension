import * as vscode from 'vscode';

/**
 * Error types for file reading operations
 */
export enum FileReadErrorType {
  NotFound = 'NOT_FOUND',
  PermissionDenied = 'PERMISSION_DENIED',
  TooLarge = 'TOO_LARGE',
  Unknown = 'UNKNOWN'
}

/**
 * Custom error class for file reading errors
 */
export class FileReadError extends Error {
  constructor(
    public readonly type: FileReadErrorType,
    public readonly uri: vscode.Uri,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'FileReadError';
  }

  /**
   * Gets a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case FileReadErrorType.NotFound:
        return `File not found: ${this.uri.fsPath}`;
      case FileReadErrorType.PermissionDenied:
        return `Permission denied: Cannot read file ${this.uri.fsPath}`;
      case FileReadErrorType.TooLarge:
        return `File too large: ${this.uri.fsPath} exceeds the maximum size limit`;
      case FileReadErrorType.Unknown:
      default:
        return `Failed to read file: ${this.uri.fsPath}. ${this.originalError?.message || 'Unknown error'}`;
    }
  }
}

/**
 * Result of a file read operation
 */
export interface FileReadResult {
  success: boolean;
  content?: string;
  error?: FileReadError;
}

/**
 * File reader for OpenAPI documents
 * Handles reading file content with proper error handling
 */
export class FileReader {
  /**
   * Maximum file size in bytes (10 MB)
   * Large OpenAPI files can cause performance issues
   */
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  /**
   * Reads file content from a URI
   * 
   * @param uri - The URI of the file to read
   * @returns Promise<FileReadResult> - Result containing content or error
   */
  async readFile(uri: vscode.Uri): Promise<FileReadResult> {
    try {
      // Try to read the file using VSCode's file system API
      const fileData = await vscode.workspace.fs.readFile(uri);
      
      // Check file size
      if (fileData.byteLength > FileReader.MAX_FILE_SIZE) {
        const error = new FileReadError(
          FileReadErrorType.TooLarge,
          uri,
          `File size (${fileData.byteLength} bytes) exceeds maximum allowed size (${FileReader.MAX_FILE_SIZE} bytes)`
        );
        return { success: false, error };
      }

      // Convert bytes to string
      const content = Buffer.from(fileData).toString('utf8');
      
      return { success: true, content };
    } catch (error) {
      // Determine error type based on the error code
      const errorType = this.determineErrorType(error);
      const fileReadError = new FileReadError(
        errorType,
        uri,
        this.getErrorMessage(errorType, uri),
        error instanceof Error ? error : undefined
      );
      
      return { success: false, error: fileReadError };
    }
  }

  /**
   * Reads file content from a TextDocument
   * This is more efficient when the document is already open in the editor
   * 
   * @param document - The TextDocument to read from
   * @returns FileReadResult - Result containing content or error
   */
  readFromDocument(document: vscode.TextDocument): FileReadResult {
    try {
      const content = document.getText();
      return { success: true, content };
    } catch (error) {
      const fileReadError = new FileReadError(
        FileReadErrorType.Unknown,
        document.uri,
        'Failed to read document content',
        error instanceof Error ? error : undefined
      );
      return { success: false, error: fileReadError };
    }
  }

  /**
   * Detects the file format based on extension
   * 
   * @param uri - The URI of the file
   * @returns 'yaml' | 'json' | 'unknown'
   */
  detectFileType(uri: vscode.Uri): 'yaml' | 'json' | 'unknown' {
    const path = uri.fsPath.toLowerCase();
    
    if (path.endsWith('.yaml') || path.endsWith('.yml')) {
      return 'yaml';
    }
    
    if (path.endsWith('.json')) {
      return 'json';
    }
    
    return 'unknown';
  }

  /**
   * Determines the error type from a caught error
   * 
   * @param error - The caught error
   * @returns FileReadErrorType
   */
  private determineErrorType(error: unknown): FileReadErrorType {
    if (error && typeof error === 'object') {
      const err = error as { code?: string };
      
      // Check for file not found errors
      if (err.code === 'FileNotFound' || err.code === 'ENOENT') {
        return FileReadErrorType.NotFound;
      }
      
      // Check for permission errors
      if (err.code === 'NoPermissions' || err.code === 'EACCES' || err.code === 'EPERM') {
        return FileReadErrorType.PermissionDenied;
      }
    }
    
    return FileReadErrorType.Unknown;
  }

  /**
   * Gets an appropriate error message for the error type
   * 
   * @param errorType - The type of error
   * @param uri - The URI of the file
   * @returns Error message string
   */
  private getErrorMessage(errorType: FileReadErrorType, uri: vscode.Uri): string {
    switch (errorType) {
      case FileReadErrorType.NotFound:
        return `File not found: ${uri.fsPath}`;
      case FileReadErrorType.PermissionDenied:
        return `Permission denied: Cannot read file ${uri.fsPath}`;
      case FileReadErrorType.TooLarge:
        return `File too large: ${uri.fsPath}`;
      case FileReadErrorType.Unknown:
      default:
        return `Failed to read file: ${uri.fsPath}`;
    }
  }
}

