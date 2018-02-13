import {Editor} from "./editor";

export class Operation {
    private editor: Editor;
    private commandList: { [key: string]: (...args: any[]) => any, thisArgs?: any } = {};

    constructor() {
        this.editor = new Editor();
        this.commandList = {
            "C-/": () => {
                this.editor.undo();
                this.editor.setStatusBarMessage("Undo!");
            },
            "C-M-Space": () => {
                this.editor.goToNextSexp(true);
            },
            "C-M-b": () => {
                this.editor.goToPrevSexp();
            },
            "C-M-f": () => {
                this.editor.goToNextSexp();
            },
            "C-g": () => {
                this.editor.setStatusBarMessage("Quit");
            },
            "C-k": () => {
                this.editor.kill();
            },
            "C-w": () => {
                if (this.editor.cut()) {
                    this.editor.setStatusBarMessage("Cut");
                } else {
                    this.editor.setStatusBarMessage("Cut Error!");
                }
            },
            "C-x_C-o": () => {
                this.editor.deleteBlankLines();
            },
            "C-x_r": () => {
                this.editor.setRMode();
            },
            "C-x_u": () => {
                this.editor.undo();
                this.editor.setStatusBarMessage("Undo!");
            },
            "C-y": () => {
                if (this.editor.yank()) {
                    this.editor.setStatusBarMessage("Yank");
                } else {
                    this.editor.setStatusBarMessage("Kill ring is empty");
                }
            },
            "M-w": () => {
                if (this.editor.copy()) {
                    this.editor.setStatusBarMessage("Copy");
                } else {
                    this.editor.setStatusBarMessage("Copy Error!");
                }
            },
            "uppercaseRegion": () => {
                this.editor.changeCase("upper", "region");
            },
            "lowercaseRegion": () => {
                this.editor.changeCase("lower", "region");
            },
            "uppercaseWord": () => {
                this.editor.changeCase("upper", "position")
            },
            "lowercaseWord": () => {
                this.editor.changeCase("lower", "position")
            },
            "capitaliseWord": () => {
                this.editor.changeCase("capitalise", "position")
            },
        };
    }

    public getCommand(commandName: string): (...args: any[]) => any {
        return this.commandList[commandName];
    }

    public onType(text: string): void {
        this.editor.onType(text);
    }
}
