export class Nack {
  constructor(private readonly _requeue = false) {}

  get requeue() {
    return this._requeue;
  }
}
