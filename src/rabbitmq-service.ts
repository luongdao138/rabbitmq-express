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
      if (this._config.connectOptions?.wait) {
        this.logger.debug('Successfully connected to RabbitMQ');
      } else {
        this.logger.debug(
          "Finish rabbitmq initialization! Set 'wait' = true if you want to make sure rabbitmq connection and default channel are available",
        );
      }
    }
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
