import { AmqpConnection } from './connection';

export class AmqpConnectionManager {
  private _connections: AmqpConnection[] = [];
  private static _instance: AmqpConnectionManager;

  static get instance() {
    if (!this._instance) {
      this._instance = new AmqpConnectionManager();
    }

    return this._instance;
  }

  private constructor() {}

  addConnection(connection: AmqpConnection) {
    return this._connections.push(connection);
  }

  getConnections() {
    return this._connections;
  }

  getConnection(name: string) {
    return this._connections.find(
      (connection) => connection.configuration.name === name,
    );
  }

  clearConnections() {
    this._connections = [];
  }
}
