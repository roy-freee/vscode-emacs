import * as vscode from "vscode";
import { KillRing } from "./killring";
import {
    RectangleContent,
    RegisterContent,
    RegisterKind,
} from "./registers";
import * as sexp from "./sexp";

enum KeybindProgressMode {
    None,   // No current keybind is currently in progress
    RMode,  // Rectangle and/or Register keybinding  [started by 'C-x+r'] is currently in progress
    RModeS, // 'Save Region in register' keybinding [started by 'C-x+r+s'] is currently in progress
    RModeI, // 'Insert Register content into buffer' keybinding [started by 'C-x+r+i'] is currently in progress
    AMode,  // (FUTURE, TBD) Abbrev keybinding  [started by 'C-x+a'] is currently in progress
    MacroRecordingMode,  // (FUTURE, TBD) Emacs macro recording [started by 'Ctrl-x+('] is currently in progress
}

export class Editor {
    public static delete(range: vscode.Range = null): Thenable<boolean> {
        if (range === null) {
            const start = new vscode.Position(0, 0);
            const doc = vscode.window.activeTextEditor.document;
            const end = doc.lineAt(doc.lineCount - 1).range.end;

            range = new vscode.Range(start, end);
        }
        return vscode.window.activeTextEditor.edit((editBuilder) => {
            editBuilder.delete(range);
        });
    }

    private isCuaMode: boolean;
    private isMarkMode: boolean;
    private killRing: KillRing;
    private keybindProgressMode: KeybindProgressMode;
    private registersStorage: { [key: string]: RegisterContent; };
    private statusBarItem: vscode.StatusBarItem;
    private statusBarIcons: string[];

    constructor() {
        this.killRing = new KillRing();
        this.isCuaMode = false;
        this.isMarkMode = false;
        this.keybindProgressMode = KeybindProgressMode.None;
        this.registersStorage = {};

        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarIcons = [];
        this.statusBarItem.text = this.statusText();
        this.statusBarItem.show();
    }

    public markMode = () => this.isMarkMode;

    public setStatusBarMessage = (text: string, duration: number = 1000): vscode.Disposable => {
        return vscode.window.setStatusBarMessage(text, duration);
    }

    public setStatusBarPermanentMessage = (text: string): vscode.Disposable => {
        return vscode.window.setStatusBarMessage(text);
    }
    public toggleMarkMode = () => {
        if (this.isMarkMode) {
            vscode.commands.executeCommand("cancelSelection");
            this.isMarkMode = false;
            this.statusBarIcons = this.statusBarIcons.filter(i => i !== "markdown");
        } else {
            const currentPosition: vscode.Position = vscode.window.activeTextEditor.selection.active;
            vscode.window.activeTextEditor.selection = new vscode.Selection(currentPosition, currentPosition);
            this.isMarkMode = true;
            this.statusBarIcons.push("markdown");
        }

        this.statusBarItem.text = this.statusText();
    }

    public cuaCut = () => {
        if (this.isCuaMode) {
            if (this.isRegion()) {
                this.cut();
                this.setStatusBarMessage("Region cut", 2000);
            } else {
                this.setStatusBarMessage("Not in region", 2000);
            }
        }
    }

    public cuaCopy = () => {
        if (this.isCuaMode) {
            if (this.isRegion()) {
                this.copy();
                this.setStatusBarMessage("Region copied", 2000);
            } else {
                this.setStatusBarMessage("Not in region", 2000);
            }
        }
    }
    public cuaPaste = () => {
        if (this.isCuaMode) {
            if (this.isRegion()) {
                this.yank();
                this.setStatusBarMessage("Region pasted", 2000);
            } else {
                this.setStatusBarMessage("Not in region", 2000);
            }
        } else {
            vscode.commands.executeCommand("emacs.cursorPageDown");
        }
    }
    public toggleCuaMode = () => {
        this.isCuaMode = !this.isCuaMode;
        if (this.isCuaMode) {
            this.statusBarIcons = this.statusBarIcons.filter(i => i !== "clippy");
        } else {
            this.statusBarIcons.push("clippy");
        }

        this.statusBarItem.text = this.statusText();
    }

    public changeCase = (casing: "upper" | "lower" | "capitalise", type: "position" | "region") => {
        const region = vscode.window.activeTextEditor.selection;
        let currentSelection: {
            text: string,
            range: vscode.Range,
        };
        if (type === "position" && region.start.character === region.end.character) {
            const document = vscode.window.activeTextEditor.document;
            const range = document.getWordRangeAtPosition(region.start);

            currentSelection = {
                text: document.getText(range),
                range,
            };
        } else if (type === "region" && region.start.character !== region.end.character) {
            currentSelection = this.getSelectedText(region, vscode.window.activeTextEditor.document);
        } else {
            this.setStatusBarMessage("No region selected. Command aborted.");
            return;
        }

        const newText =
            casing === "upper" ? currentSelection.text.toUpperCase() :
            casing === "lower" ? currentSelection.text.toLowerCase() :
            currentSelection.text.charAt(0).toUpperCase() + currentSelection.text.slice(1);

        vscode.window.activeTextEditor.edit(builder => {
            builder.replace(currentSelection.range, newText);
        });
    }

    public getSelectedText(
        selection: vscode.Selection,
        document: vscode.TextDocument): { text: string, range: vscode.Range } | undefined {
        let range: vscode.Range;

        if (selection.start.line === selection.end.line && selection.start.character === selection.end.character) {
            return undefined;
        } else {
            range = new vscode.Range(selection.start, selection.end);
        }

        return {
            range,
            text: document.getText(range),
        };
    }

    public getSelectionRange(): vscode.Range {
        const selection = vscode.window.activeTextEditor.selection;
        const start = selection.start;
        const end = selection.end;

        return (start.character !== end.character || start.line !== end.line) ? new vscode.Range(start, end) : null;
    }

    public getSelection(): vscode.Selection {
        const ed = vscode.window.activeTextEditor;
        let selection = null;

        // check if there is no selection
        if (ed.selection.isEmpty) {
            selection = ed.selection;
        } else {
            selection = ed.selections[0];
        }

        return selection;
    }

    public setSelection(start: vscode.Position, end: vscode.Position): void {
        const editor = vscode.window.activeTextEditor;

        editor.selection = new vscode.Selection(start, end);
    }

    public goToNextSexp(activateMarkMode?: boolean): void {
        const ed = vscode.window.activeTextEditor;
        const startPos = this.getSelection();
        const nextPos = new vscode.Position(startPos.active.line, startPos.active.character + 1);
        const range = new vscode.Range(startPos.end, nextPos);

        const afterCursor = ed.document.getText(range);
        const whatAmI = sexp.sExpressionOrAtom(afterCursor);

        if (whatAmI === sexp.Expression.Atom) {
            vscode.commands.executeCommand("cursorWordRight").then(() => {
                if (activateMarkMode) {
                    const editor = vscode.window.activeTextEditor;
                    const pos = this.getSelection();
                    this.setSelection(startPos.start, pos.end);
                }
            });
        } else {
            vscode.commands.executeCommand("editor.action.jumpToBracket").then(() => {
                vscode.commands.executeCommand("cursorWordRight").then(() => {
                    if (activateMarkMode) {
                        const editor = vscode.window.activeTextEditor;
                        const pos = this.getSelection();
                        this.setSelection(startPos.start, pos.end);
                    }
                });
            });
        }

        // const newCursorPos = this.getSelection();

        // if (activateMarkMode) {
        //     this.setSelection(startPos.active, newCursorPos.active);
        // }
    }

    public goToPrevSexp(): void {
        const ed = vscode.window.activeTextEditor;
        const line = ed.document.getText();
        const cursorPos = ed.selection.active.character;
        const afterCursor = line.substr(cursorPos);
        const whatAmI = sexp.sExpressionOrAtom(afterCursor);

        const placeholder = sexp.turnToSexp(line);
        if (whatAmI === sexp.Expression.Atom) {
            vscode.commands.executeCommand("cursorWordLeft");
        } else {
            vscode.commands.executeCommand("cursorWordLeft");
        }
    }

    /*
     * Behave like Emacs kill command
     */
    public kill(): void {
        const promises = [
            vscode.commands.executeCommand("emacs.exitMarkMode"),
            vscode.commands.executeCommand("cursorEndSelect"),
        ];

        Promise.all(promises).then(() => {
            const selection = this.getSelection();
            const range = new vscode.Range(selection.start, selection.end);

            this.setSelection(range.start, range.start);
            if (range.isEmpty) {
                this.killEndOfLine();
            } else {
                this.killText(range);
            }
        });
    }

    public copy(range: vscode.Range = null): boolean {
        if (range === null) {
            range = this.getSelectionRange();
            if (range === null) {
                vscode.commands.executeCommand("emacs.exitMarkMode");
                return false;
            }
        }

        this.killRing.save(vscode.window.activeTextEditor.document.getText(range));
        vscode.commands.executeCommand("emacs.exitMarkMode");
        return this.killRing !== undefined;
    }

    public cut(): boolean {
        const range: vscode.Range = this.getSelectionRange();

        if (!this.copy(range)) {
            return false;
        }
        Editor.delete(range);
        return true;
    }

    public yank(): boolean {
        if (this.killRing.isEmpty()) {
            return false;
        }

        vscode.window.activeTextEditor.edit((editBuilder) => {
            editBuilder.insert(this.getSelection().active, this.killRing.top());
        });
        return true;
    }

    public undo(): void {
        vscode.commands.executeCommand("undo");
    }

    public deleteBlankLines(): void {
        const doc = vscode.window.activeTextEditor.document;
        const promises = [];
        let selection = this.getSelection();
        let anchor = selection.anchor;
        let range = doc.lineAt(selection.start.line).range;
        let nextLine: vscode.Position;

        if (range.isEmpty) {
            range = this.getFirstBlankLine(range);
            anchor = range.start;
            nextLine = range.start;
        } else {
            nextLine = range.start.translate(1, 0);
        }
        selection = new vscode.Selection(nextLine, nextLine);
        vscode.window.activeTextEditor.selection = selection;
        for (let line = selection.start.line;
             line < doc.lineCount - 1  && doc.lineAt(line).range.isEmpty;
             ++line) {
            promises.push(vscode.commands.executeCommand("deleteRight"));
        }
        Promise.all(promises).then(() => {
            vscode.window.activeTextEditor.selection = new vscode.Selection(anchor, anchor);
        });
    }

    public setRMode(): void {
        this.setStatusBarPermanentMessage("C-x r");
        this.keybindProgressMode = KeybindProgressMode.RMode;
        return;
    }

    public onType(text: string): void {
        let fHandled = false;
        switch (this.keybindProgressMode) {
            case KeybindProgressMode.RMode:
                switch (text) {
                    // Rectangles
                    case "r":
                        this.setStatusBarMessage("'C-x r r' (Copy rectangle to register) is not supported.");
                        this.keybindProgressMode = KeybindProgressMode.None;
                        fHandled = true;
                        break;

                    case "k":
                        this.setStatusBarMessage("'C-x r k' (Kill rectangle) is not supported.");
                        this.keybindProgressMode = KeybindProgressMode.None;
                        fHandled = true;
                        break;

                    case "y":
                        this.setStatusBarMessage("'C-x r y' (Yank rectangle) is not supported.");
                        this.keybindProgressMode = KeybindProgressMode.None;
                        fHandled = true;
                        break;

                    case "o":
                        this.setStatusBarMessage("'C-x r o' (Open rectangle) is not supported.");
                        this.keybindProgressMode = KeybindProgressMode.None;
                        fHandled = true;
                        break;

                    case "c":
                        this.setStatusBarMessage("'C-x r c' (Blank out rectangle) is not supported.");
                        this.keybindProgressMode = KeybindProgressMode.None;
                        fHandled = true;
                        break;

                    case "t":
                        this.setStatusBarMessage("'C-x r t' (prefix each line with a string) is not supported.");
                        this.keybindProgressMode = KeybindProgressMode.None;
                        fHandled = true;
                        break;

                    // Registers
                    case "s":
                        this.setStatusBarPermanentMessage("Copy to register:");
                        this.keybindProgressMode = KeybindProgressMode.RModeS;
                        fHandled = true;
                        break;

                    case "i":
                        this.setStatusBarPermanentMessage("Insert register:");
                        this.keybindProgressMode = KeybindProgressMode.RModeI;
                        fHandled = true;
                        break;

                    default:
                        break;
                }
                break;

            case KeybindProgressMode.RModeS:
                this.setStatusBarPermanentMessage("");
                this.SaveTextToRegister(text);
                this.keybindProgressMode = KeybindProgressMode.None;
                fHandled = true;
                break;

            case KeybindProgressMode.RModeI:
                this.setStatusBarPermanentMessage("");
                this.RestoreTextFromRegister(text);
                this.keybindProgressMode = KeybindProgressMode.None;
                fHandled = true;
                break;

            case KeybindProgressMode.AMode: // not supported [yet]
            case KeybindProgressMode.MacroRecordingMode: // not supported [yet]
            case KeybindProgressMode.None:
            default:
                this.keybindProgressMode = KeybindProgressMode.None;
                this.setStatusBarPermanentMessage("");
                break;
        }

        if (!fHandled) {
            // default input handling: pass control to VSCode
            vscode.commands.executeCommand("default:type", {
                text,
            });
        }
        return;
    }

    public SaveTextToRegister(registerName: string): void {
        if (null === registerName) {
            return;
        }
        const range: vscode.Range = this.getSelectionRange();
        if (range !== null) {
            const selectedText = vscode.window.activeTextEditor.document.getText(range);
            if (null !== selectedText) {
                this.registersStorage[registerName] = RegisterContent.fromRegion(selectedText);
            }
        }
        return;
    }

    public RestoreTextFromRegister(registerName: string): void {
        vscode.commands.executeCommand("emacs.exitMarkMode"); // emulate Emacs
        const obj: RegisterContent = this.registersStorage[registerName];
        if (null === obj) {
            this.setStatusBarMessage("Register does not contain text.");
            return;
        }
        if (RegisterKind.KText === obj.getRegisterKind()) {
            const content: string | vscode.Position | RectangleContent = obj.getRegisterContent();
            if (typeof content === "string") {
                vscode.window.activeTextEditor.edit((editBuilder) => {
                    editBuilder.insert(this.getSelection().active, content);
                });
            }
        }
        return;
    }

    private isRegion = (): boolean => {
        const currRegion = vscode.window.activeTextEditor.selection;
        return !currRegion.start.isEqual(currRegion.end);
    }

    private killEndOfLine(): void {
        let text = '';

        const currentCursorPosition = vscode.window.activeTextEditor.selection.active;
        vscode.commands.executeCommand("emacs.cursorEnd")
        .then(() => {
            const newCursorPos = vscode.window.activeTextEditor.selection.active;
            const rangeTillEnd = new vscode.Range(currentCursorPosition, newCursorPos);
            return vscode.window.activeTextEditor.document.getText(rangeTillEnd);
        }).then((text: string) => {
            vscode.window.activeTextEditor.selection.active = currentCursorPosition;
            vscode.commands.executeCommand("deleteAllRight").then(() => {
                this.killRing.save(text);
            });
        });
    }

    private killText(range: vscode.Range): void {
        const text = vscode.window.activeTextEditor.document.getText(range);
        const promises = [
            Editor.delete(range),
            vscode.commands.executeCommand("emacs.exitMarkMode"),
        ];

        Promise.all(promises).then(() => {
            this.killRing.save(text);
        });
    }

    private getFirstBlankLine(range: vscode.Range): vscode.Range {
        const doc = vscode.window.activeTextEditor.document;

        if (range.start.line === 0) {
            return range;
        }
        range = doc.lineAt(range.start.line - 1).range;
        while (range.start.line > 0 && range.isEmpty) {
            range = doc.lineAt(range.start.line - 1).range;
        }
        if (range.isEmpty) {
            return range;
        } else {
            return doc.lineAt(range.start.line + 1).range;
        }
    }

    private statusText = () => `EMACS Minor Modes: ${this.statusBarIcons.map(i => `$(${i})`).join(" ")}`;
}
