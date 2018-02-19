import * as vscode from "vscode";
import {Operation} from "./operation";

let inMarkMode: boolean = false;
export function activate(context: vscode.ExtensionContext): void {
    const op = new Operation();
    const commandList: string[] = [
        "C-g",
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

        "cuaCut",
        "cuaPaste",
        "cuaCopy",
        "toggleCuaMode",
    ];

    const cursorMoves: string[] = [
        "cursorUp", "cursorDown", "cursorLeft", "cursorRight",
        "cursorHome", "cursorEnd",
        "cursorWordLeft", "cursorWordRight",
        "cursorPageUp", "cursorTop", "cursorBottom",
    ];

    commandList.forEach(commandName => {
        context.subscriptions.push(registerCommand(commandName, op));
    });

    cursorMoves.forEach(element => {
        context.subscriptions.push(vscode.commands.registerCommand(
            "emacs." + element, () => {
                vscode.commands.executeCommand(
                    inMarkMode ?
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

    initMarkMode(context);
}

// export function deactivate(): void {
// }

function initMarkMode(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.commands.registerCommand(
        "emacs.enterMarkMode", () => {
            initSelection();
            inMarkMode = true;
            vscode.window.setStatusBarMessage("Mark Set", 1000);
        }),
    );

    context.subscriptions.push(vscode.commands.registerCommand(
        "emacs.exitMarkMode", () => {
            vscode.commands.executeCommand("cancelSelection");
            if (inMarkMode) {
                inMarkMode = false;
                vscode.window.setStatusBarMessage("Mark deactivated", 1000);
            }
        }),
    );
}

function registerCommand(commandName: string, op: Operation): vscode.Disposable {
    return vscode.commands.registerCommand("emacs." + commandName, op.getCommand(commandName));
}

function initSelection(): void {
    const currentPosition: vscode.Position = vscode.window.activeTextEditor.selection.active;
    vscode.window.activeTextEditor.selection = new vscode.Selection(currentPosition, currentPosition);
}
