import { cloneDeep, merge } from 'lodash';
import { DeepRequired, EXCHANGE_TYPE, RabbitMQConfig } from './types';
import { PalboxLogger } from './logger';
import { AmqpConnectionManager, connect } from 'amqp-connection-manager';

const defaultConfig = {
  name: 'default', // by default, name of connection is `default` if not provided
  prefetchCount: 10,
  defaultExchangeType: EXCHANGE_TYPE.TOPIC,
  connectOptions: {
    wait: true,
    reject: true,
    timeout: 5000,
  },
};

export class AmqpConnection {
  private logger = new PalboxLogger({ label: 'RabbitMQModule' });
  private _config: DeepRequired<RabbitMQConfig>;
  private _rabbitmqConnection!: AmqpConnectionManager;

  constructor(config: RabbitMQConfig) {
    this._config = merge(cloneDeep(defaultConfig), config);
  }

  get configuration() {
    return this._config;
  }

  async init() {
    const { reject, timeout, wait } = this._config.connectOptions;

    const rs = this.initCore();

    if (!wait) {
      return rs;
    }
  }

  private async initCore() {
    this.logger.info(
      `Trying to connect to RabbitMQ broker ${this._config.name}`,
    );

    // create actual rabbitmq connection
    this._rabbitmqConnection = connect(
      Array.isArray(this._config.uri) ? this._config.uri : [this._config.uri],
    );
  }
}
