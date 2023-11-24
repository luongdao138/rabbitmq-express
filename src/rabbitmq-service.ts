import { AmqpConnection } from './connection';
import { AmqpConnectionManager } from './connection-manager';
import { PalboxLogger } from './logger';
import {
  RabbitMQConfig,
  RabbitMQSubscriberHandler,
  RabbitMQSubscriberOptions,
} from './types';

const connectionManager = AmqpConnectionManager.instance;

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
    this.logger.debug('Successfully connected to RabbitMQ');
  }

  get connection() {
    return this._connection;
  }

  get config() {
    return this._connection.configuration;
  }

  /**
   * @description Add subscriber
   */
  async registerSubscriber(
    handler: RabbitMQSubscriberHandler,
    config: RabbitMQSubscriberOptions,
  ) {
    for (const connection of connectionManager.getConnections()) {
      const initConfig =
        connection.configuration.subscribers.find(
          (subscriber) => subscriber.name === config.name,
        ) ?? {};

      const subscriberName = config.name || handler.name;
      this.logger.debug(
        `${connection.configuration.name}::Registering rabbitmq subscriber: ${subscriberName}`,
      );

      const mergeConfig = {
        ...config,
        ...initConfig,
      };

      await connection.addSubscriber(handler, mergeConfig);
    }
  }
}
