import {Editor} from "./editor";

export class Operation {
    public editor: Editor;
    private commandList: { [key: string]: (...args: any[]) => any, thisArgs?: any } = {};

    constructor() {
        this.editor = new Editor();
        this.commandList = {
            "undo": () => {
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
            "abortCommand": () => {
                this.editor.setStatusBarMessage("Quit");
                if (this.editor.markMode()) {
                    this.editor.toggleMarkMode();
                }
            },
            "kill": () => {
                this.editor.kill();
            },
            "killRegion": () => {
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
            "yank": () => {
                if (this.editor.yank()) {
                    this.editor.setStatusBarMessage("Yank");
                } else {
                    this.editor.setStatusBarMessage("Kill ring is empty");
                }
            },
            "yankPop": () => {
                this.editor.yankPop();
            },
            "killRingSave": () => {
                if (this.editor.copy()) {
                    this.editor.setStatusBarMessage("Copy");
                } else {
                    this.editor.setStatusBarMessage("Copy Error!");
                }
            },

            // cua mode
            "toggleCuaMode": () => {
                this.editor.toggleCuaMode();
            },
            "cuaCut": () => {
                this.editor.cuaCut();
            },
            "cuaPaste": () => {
                this.editor.cuaPaste();
            },
            "cuaCopy": () => {
                this.editor.cuaCopy();
            },

            // case-switching
            "uppercaseRegion": () => {
                this.editor.changeCase("upper", "region");
            },
            "lowercaseRegion": () => {
                this.editor.changeCase("lower", "region");
            },
            "uppercaseWord": () => {
                this.editor.changeCase("upper", "position");
            },
            "lowercaseWord": () => {
                this.editor.changeCase("lower", "position");
            },
            "capitaliseWord": () => {
                this.editor.changeCase("capitalise", "position");
            },

            "enterMarkMode": () => {
                this.editor.toggleMarkMode();
            },
            "exitMarkMode": () => {
                this.editor.toggleMarkMode();
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
