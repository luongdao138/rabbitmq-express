import { AmqpConnection } from './connection';
import { AmqpConnectionManager } from './connection-manager';
import { PalboxLogger } from './logger';
import { RabbitMQConfig } from './types';

const connectionManager = AmqpConnectionManager.instance;

// RabbitMQModule

export class RabbitMQService {
  private _config: RabbitMQConfig;
  private _connection!: AmqpConnection;
  private logger = new PalboxLogger({ label: 'RabbitMQModule' });

  constructor(config: RabbitMQConfig) {
    this._config = config;
  }

  /**
   * @description Init connection are asynchronous, so this function is used to make sure that rabbitmq connection is up and running
   */
  async initConnection() {
    // init an instance of rabbitmq connection
    this._connection = new AmqpConnection(this._config);

    // add the connection to connections array
    connectionManager.addConnection(this._connection);

    // init connection configs
    const isIntialized = await this._connection.init();

    if (isIntialized) {
      if (this._connection.configuration.connectOptions.wait) {
        this.logger.debug('Successfully connected to RabbitMQ');
      } else {
        this.logger.debug(
          "Finish rabbitmq initialization! Set 'wait' = true if you want to make sure rabbitmq connection and default channel are available",
        );
      }
    }
  }

  /**
   * @description Close rabbitmq connection
   */
  async closeConnection() {
    this.logger.info('Close AMQP connections');

    await this.connection.managedConnection.close();
    connectionManager.removeConnection(this.connection.configuration.name);
  }

  get connection() {
    return this._connection;
  }

  get config() {
    return this._connection.configuration;
  }
}
