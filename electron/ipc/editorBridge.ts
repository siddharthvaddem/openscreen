import { randomUUID } from "node:crypto";
import { BrowserWindow, ipcMain } from "electron";
import type {
	EditorCommandInput,
	EditorCommandName,
	EditorCommandResponseEnvelope,
	ProjectStateSnapshot,
} from "../../src/editor/commands/types";

interface PendingCommand {
	resolve: (value: unknown) => void;
	reject: (reason?: unknown) => void;
	timer: NodeJS.Timeout;
}

const pendingCommands = new Map<string, PendingCommand>();
let latestEditorState: ProjectStateSnapshot | null = null;

function isEditorWindow(window: BrowserWindow) {
	return window.webContents.getURL().includes("windowType=editor");
}

function getBestEditorWindow(getMainWindow: () => BrowserWindow | null) {
	const focusedWindow = BrowserWindow.getFocusedWindow();
	if (focusedWindow && !focusedWindow.isDestroyed() && isEditorWindow(focusedWindow)) {
		return focusedWindow;
	}

	const discoveredEditorWindow = BrowserWindow.getAllWindows().find(
		(window) => !window.isDestroyed() && isEditorWindow(window),
	);
	if (discoveredEditorWindow) {
		return discoveredEditorWindow;
	}

	const mainWindow = getMainWindow();
	if (mainWindow && !mainWindow.isDestroyed() && isEditorWindow(mainWindow)) {
		return mainWindow;
	}

	return null;
}

export function registerEditorCommandBridge(getMainWindow: () => BrowserWindow | null) {
	ipcMain.on("editor-command:response", (_event, response: EditorCommandResponseEnvelope) => {
		const pending = pendingCommands.get(response.requestId);
		if (!pending) {
			return;
		}
		clearTimeout(pending.timer);
		pendingCommands.delete(response.requestId);
		if (response.success) {
			pending.resolve(response.result);
			return;
		}
		pending.reject(new Error(response.error));
	});

	ipcMain.on("editor-state:publish", (_event, snapshot: ProjectStateSnapshot) => {
		latestEditorState = snapshot;
	});

	ipcMain.handle("get-mcp-connection-info", () => {
		return {
			enabled: false,
			url: "",
			token: "",
		};
	});

	return {
		async requestEditorCommand<TName extends EditorCommandName>(
			command: TName,
			payload: EditorCommandInput<TName>,
			timeoutMs: number = 20_000,
		) {
			const editorWindow = getBestEditorWindow(getMainWindow);
			if (!editorWindow) {
				throw new Error("Editor window is not available");
			}

			const requestId = randomUUID();
			const resultPromise = new Promise<unknown>((resolve, reject) => {
				const timer = setTimeout(() => {
					pendingCommands.delete(requestId);
					reject(new Error(`Editor command timed out: ${command}`));
				}, timeoutMs);
				pendingCommands.set(requestId, { resolve, reject, timer });
			});

			editorWindow.webContents.send("editor-command:request", {
				requestId,
				command,
				payload,
			});

			return resultPromise;
		},
		getLatestEditorState() {
			return latestEditorState;
		},
		setConnectionInfoGetter(getInfo: () => { enabled: boolean; url: string; token: string }) {
			ipcMain.removeHandler("get-mcp-connection-info");
			ipcMain.handle("get-mcp-connection-info", () => getInfo());
		},
	};
}
