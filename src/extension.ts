import * as vscode from "vscode";
import {Operation} from "./operation";

export function activate(context: vscode.ExtensionContext): void {
    const op = new Operation();
    const commandList: string[] = [
        "abortCommand",
        // Edit
        "C-k", "C-w", "M-w", "C-y", "C-x_C-o",
        "C-x_u", "C-/",

        // R-Mode
        "C-x_r",

        // S-expression movement
        "C-M-f",
        "C-M-b",
        "C-M-Space",

        // Case changes
        "uppercaseRegion",
        "lowercaseRegion",
        "uppercaseWord",
        "lowercaseWord",
        "capitaliseWord",

        "cuaCut",
        "cuaPaste",
        "cuaCopy",
        "toggleCuaMode",

        "enterMarkMode",
        "exitMarkMode",
    ];

    const cursorMoves: string[] = [
        "cursorUp", "cursorDown", "cursorLeft", "cursorRight",
        "cursorHome", "cursorEnd",
        "cursorWordLeft", "cursorWordRight",
        "cursorPageUp", "cursorPageDown", "cursorTop", "cursorBottom",
    ];

    commandList.forEach(commandName => {
        context.subscriptions.push(registerCommand(commandName, op));
    });

    cursorMoves.forEach(element => {
        context.subscriptions.push(vscode.commands.registerCommand(
            "emacs." + element, () => {
                vscode.commands.executeCommand(
                    op.editor.markMode() ?
                    element + "Select" :
                    element,
                );
            }),
        );
    });

    // 'type' is not an "emacs." command and should be registered separately
    context.subscriptions.push(vscode.commands.registerCommand("type", args => {
        if (!vscode.window.activeTextEditor) {
            return;
        }
        op.onType(args.text);
    }));
}

// export function deactivate(): void {
// }

function registerCommand(commandName: string, op: Operation): vscode.Disposable {
    return vscode.commands.registerCommand("emacs." + commandName, op.getCommand(commandName));
}
