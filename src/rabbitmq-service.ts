import { AmqpConnection } from './connection';
import { AmqpConnectionManager } from './connection-manager';
import { PalboxLogger } from './logger';
import { RabbitMQConfig } from './types';

const connectionManager = new AmqpConnectionManager();

// RabbitMQModule

export class RabbitMQService {
  private _connection!: AmqpConnection;
  private logger = new PalboxLogger({ label: 'RabbitMQModule' });

  constructor(config: RabbitMQConfig) {
    this.initConnection(config);
  }

  async initConnection(config: RabbitMQConfig) {
    // init an instance of rabbitmq connection
    this._connection = new AmqpConnection(config);

    // add the connection to connections array
    connectionManager.addConnection(this._connection);

    // init connection configs
    await this._connection.init();
    this.logger.info('Successfully connected to RabbitMQ');
  }

  get connection() {
    return this._connection;
  }

  get config() {
    return this._connection.configuration;
  }
}
