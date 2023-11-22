import { filter, from, reduce, take } from 'rxjs';
import { AmqpConnection } from './connection';

export class AmqpConnectionManager {
  private connections: AmqpConnection[] = [];

  constructor() {}

  fromSource() {
    return from(this.connections);
  }

  getConnections() {
    return this.fromSource().pipe(
      reduce((acc, current) => [...acc, current], [] as AmqpConnection[]),
    );
  }

  getConnection(name: string) {
    return this.fromSource().pipe(
      filter((connection) => connection.configuration.name === name),
      take(1),
    );
  }
}
