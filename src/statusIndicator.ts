import { StatusBarAlignment, StatusBarItem, window } from "vscode";

export enum Mode {
  Mark,
  Cua,
  Register,
}

const IconMapper = {
  [Mode.Mark]: "markdown",
  [Mode.Cua]: "clippy",
  [Mode.Register]: "server",
};
export default class StatusIndicator {
  private statusBarItem: StatusBarItem;
  private statusBarIcons: string[];
  private activeModes: Mode[];
  constructor() {
    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
    this.statusBarIcons = [];
    this.activeModes = [];
    this.statusBarItem.text = this.statusText();
    this.statusBarItem.tooltip = this.toolTipText();
    this.statusBarItem.show();
  }

  public toggleMode(mode: Mode) {
    if (this.activeModes.some(i => i === mode)) {
      const index = this.activeModes.indexOf(mode);
      this.activeModes.splice(index, 1);
      this.statusBarIcons = this.statusBarIcons.filter(i => i !== IconMapper[mode]);
    } else {
      this.activeModes.push(mode);
      this.statusBarIcons.push(IconMapper[mode]);
    }

    this.statusBarItem.text = this.statusText();
    this.statusBarItem.tooltip = this.toolTipText();
  }

  public isModeActive(mode: Mode) {
    return this.activeModes.some(i => i === mode);
  }
  public setStatusBarMessage = (text: string, duration: number = 1000) => {
    this.statusBarItem.text = this.tempMessage(text);

    // put the mode indicators back in
    setTimeout(
      () => {
        this.statusBarItem.text = this.statusText();
      },
      duration);
  }

  private tempMessage = (msg: string) => `EMACS: ${msg}`;
  private statusText = () => `EMACS: ${this.statusBarIcons.map(i => `$(${i})`).join(" ")}`;
  private toolTipText = () => {
    let text = "";

    text = this.activeModes.map(i => `${Mode[i]} mode active`).join("\n");
    return text;
  }
}
