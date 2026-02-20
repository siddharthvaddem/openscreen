import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain, shell } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './handlers';

// Mock Electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  shell: {
    showItemInFolder: vi.fn(),
    openPath: vi.fn(),
  },
}));

// Mock path module's dirname
vi.mock('path', async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    dirname: vi.fn((p) => (actual as any).dirname(p)), // Keep original dirname but mock it for inspection
  };
});


describe('IPC Handlers', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
  });

  // Dummy functions required by registerIpcHandlers
  const mockCreateEditorWindow = vi.fn();
  const mockCreateSourceSelectorWindow = vi.fn(() => ({ close: vi.fn() } as any));
  const mockGetMainWindow = vi.fn(() => null);
  const mockGetSourceSelectorWindow = vi.fn(() => null);

  // Register handlers once for all tests in this suite
  registerIpcHandlers(
    mockCreateEditorWindow,
    mockCreateSourceSelectorWindow,
    mockGetMainWindow,
    mockGetSourceSelectorWindow
  );

  describe('reveal-in-folder', () => {
    it('should call shell.showItemInFolder with the correct path and return success', async () => {
      shell.showItemInFolder.mockReturnValue(true); // Simulate success
      const filePath = '/test/path/to/file.txt';

      // Find the 'reveal-in-folder' handler
      const handlerCall = ipcMain.handle.mock.calls.find(call => call[0] === 'reveal-in-folder');
      expect(handlerCall).toBeDefined();

      const handler = handlerCall[1];
      const result = await handler(null, filePath); // Call the handler

      expect(shell.showItemInFolder).toHaveBeenCalledWith(filePath);
      expect(result).toEqual({ success: true });
      expect(shell.openPath).not.toHaveBeenCalled(); // Fallback should not be called
    });

    it('should call shell.openPath for directory if showItemInFolder fails', async () => {
      shell.showItemInFolder.mockReturnValue(false); // Simulate failure
      shell.openPath.mockResolvedValue({ success: true }); // Simulate fallback success
      (path.dirname as any).mockReturnValue('/test/path/to'); // Mock dirname for predictable result

      const filePath = '/test/path/to/file.txt';

      const handlerCall = ipcMain.handle.mock.calls.find(call => call[0] === 'reveal-in-folder');
      const handler = handlerCall[1];
      const result = await handler(null, filePath);

      expect(shell.showItemInFolder).toHaveBeenCalledWith(filePath);
      expect(path.dirname).toHaveBeenCalledWith(filePath);
      expect(shell.openPath).toHaveBeenCalledWith('/test/path/to'); // Should open the directory
      expect(result).toEqual({ success: true, message: 'Could not reveal item, but opened directory.' });
    });

    it('should return failure if an error occurs during reveal', async () => {
      const errorMessage = 'Permission denied';
      shell.showItemInFolder.mockImplementation(() => {
        throw new Error(errorMessage); // Simulate an error
      });

      const filePath = '/test/path/to/file.txt';

      const handlerCall = ipcMain.handle.mock.calls.find(call => call[0] === 'reveal-in-folder');
      const handler = handlerCall[1];
      const result = await handler(null, filePath);

      expect(shell.showItemInFolder).toHaveBeenCalledWith(filePath);
      expect(result).toEqual({ success: false, error: errorMessage });
      expect(shell.openPath).not.toHaveBeenCalled(); // Fallback should not be called on exception
    });
  });
});