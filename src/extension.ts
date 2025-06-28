import * as vscode from "vscode";
import * as jsonc from "jsonc-parser";
import * as fs from "fs";

/* Constants */
const MAX_LINES = 15000; // 15,000 lines
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const DEBOUNCE_TIME = 300; // milliseconds

let decorationType: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
  const activeEditor = vscode.window.activeTextEditor;

  if (activeEditor && activeEditor.document.languageId === "json") {
    updateDecorations(activeEditor);
  }

  let timeout: NodeJS.Timeout | null = null;
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    const editor = vscode.window.activeTextEditor;

    if (!editor || event.document !== editor.document) {
      return;
    }

    timeout = setTimeout(() => {
      if (editor.document.languageId === "json") {
        updateDecorations(editor);
      }
    }, DEBOUNCE_TIME);
  });

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    if (!editor || editor.document.languageId !== "json") {
      return;
    }

    timeout = setTimeout(() => {
      updateDecorations(editor);
    }, DEBOUNCE_TIME);
  });

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("jsonKeyCount.enabled")) {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "json") {
        updateDecorations(editor);
      }
    }
  });

  const toggleUserSettingCommand = vscode.commands.registerCommand(
    "jsonKeyCount.toggleUser",
    async () => {
      return toggleSettings("user");
    }
  );

  const toggleWorkspaceSettingCommand = vscode.commands.registerCommand(
    "jsonKeyCount.toggleWorkspace",
    async () => {
      return toggleSettings("workspace");
    }
  );

  context.subscriptions.push(
    toggleUserSettingCommand,
    toggleWorkspaceSettingCommand
  );
}

export function deactivate() {
  const editor = vscode.window.activeTextEditor;
  if (editor && decorationType) {
    disposeDecorations(editor);
  }
}

const canUpdateDecorations = (document: vscode.TextDocument) => {
  if (document.lineCount > MAX_LINES) {
    return false;
  }

  if (document.isUntitled) {
    // File hasn't been saved yet
    return null;
  }

  const filePath = document.uri.fsPath;

  try {
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return false;
    }
  } catch (err) {
    return false;
  }

  return true;
};

const toggleSettings = async (scope: "user" | "workspace") => {
  const config = vscode.workspace.getConfiguration("jsonKeyCount");
  const inspect = config.inspect<boolean>("enabled");

  let currValue =
    scope === "user" ? inspect?.globalValue : inspect?.workspaceValue;

  const newValue = currValue === undefined ? true : !currValue;

  await config.update(
    "enabled",
    newValue,
    scope === "user"
      ? vscode.ConfigurationTarget.Global
      : vscode.ConfigurationTarget.Workspace
  );
};

export const updateDecorations = (
  editor: vscode.TextEditor
): vscode.DecorationOptions[] => {
  disposeDecorations(editor);

  if (!getEffectiveConfigStatus() || !canUpdateDecorations(editor.document)) {
    return [];
  }

  const text = editor.document.getText();
  const decorations: vscode.DecorationOptions[] = [];

  try {
    const errors: jsonc.ParseError[] = [];
    const root = jsonc.parseTree(text, errors);

    if (
      errors.length === 0 &&
      (root?.type === "object" || root?.type === "array")
    ) {
      traverse(root, editor.document, decorations);
    }

    decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: "0 0 0 1em",
        color: "gray",
      },
    });

    editor.setDecorations(decorationType, decorations);

    return decorations;
  } catch (e) {
    console.error("Invalid JSON:", e);
    vscode.window.showErrorMessage("Invalid JSON format in the document.");
    return [];
  }
};

export const getEffectiveConfigStatus = () => {
  const config = vscode.workspace.getConfiguration("jsonKeyCount");

  const inspect = config.inspect<boolean>("enabled");

  return (
    inspect?.workspaceValue ??
    inspect?.globalValue ??
    inspect?.defaultValue ??
    true
  );
};

export const traverse = (
  node: jsonc.Node,
  document: vscode.TextDocument,
  decorations: vscode.DecorationOptions[]
) => {
  if (node.type === "object" || node.type === "array") {
    const count = (node.children || []).length;

    const countText = node.type === "object" ? `{${count}}` : `[${count}]`;

    const line = document.positionAt(node.offset).line;

    const range = new vscode.Range(line, 0, line, node.offset + node.length);

    decorations.push({
      range,
      hoverMessage: new vscode.MarkdownString(
        `**${node.type}** with **${count}** child${count === 1 ? "" : "ren"}`
      ),
      renderOptions: {
        after: {
          contentText: countText,
        },
      },
    });
  }

  for (const child of node.children || []) {
    traverse(child, document, decorations);
  }
};

const disposeDecorations = (editor: vscode.TextEditor) => {
  if (decorationType) {
    editor.setDecorations(decorationType, []);
    decorationType.dispose();
  }
};
