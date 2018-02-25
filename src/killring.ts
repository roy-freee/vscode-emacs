
export class KillRing {
  private readonly MAX_LENGTH = 60;
  private items: string[];
  private pointer: number;

  constructor() {
    this.pointer = 0;
    this.items = new Array<string>(this.MAX_LENGTH);
  }

  public save = (text: string) => {
    this.items[this.pointer] = text;
    this.pointer = (this.pointer + 1) % this.MAX_LENGTH;
  }

  public top = () => {
    return this.items[(this.pointer - 1) % this.MAX_LENGTH];
  }

  public next = () => {
    if (this.items[(this.pointer + 1) % this.MAX_LENGTH] === undefined) {
      this.pointer = 0;
    } else {
      this.pointer = (this.pointer + 1) % this.MAX_LENGTH;
    }
  }

  public isEmpty = (): boolean => {
    return !this.items.some(i => i !== undefined);
  }
}
