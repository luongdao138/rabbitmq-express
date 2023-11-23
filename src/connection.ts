import _, { cloneDeep, merge } from 'lodash';
import {
  EXCHANGE_TYPE,
  RabbitChannelConfig,
  RabbitMQChannel,
  RabbitMQConfig,
} from './types';
import { PalboxLogger } from './logger';
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import {
  EMPTY,
  Subject,
  catchError,
  lastValueFrom,
  take,
  throwError,
  timeout,
} from 'rxjs';

const defaultConfig = {
  name: 'default', // by default, name of connection is `default` if not provided
  prefetchCount: 10,
  defaultExchangeType: EXCHANGE_TYPE.TOPIC,
  connectOptions: {
    wait: true,
    reject: true,
    timeout: 5000,
  },
  channels: [],
};

export class AmqpConnection {
  private logger = new PalboxLogger({ label: 'RabbitMQModule' });
  private _config: Required<RabbitMQConfig>;
  private _rabbitmqConnection!: AmqpConnectionManager;
  private _rabbitmqChannels: Map<string, ChannelWrapper> = new Map(); // save all channels
  private _rabbitmqChannel!: ChannelWrapper;

  private _channels: Map<string, ConfirmChannel> = new Map();
  private _channel!: ConfirmChannel;
  private initializeSubject = new Subject<void>();

  constructor(config: RabbitMQConfig) {
    this._config = merge(cloneDeep(defaultConfig), config);
  }

  get configuration() {
    return this._config;
  }

  async init() {
    const {
      reject,
      timeout: timeoutDuration,
      wait,
    } = this._config.connectOptions;
    const timeoutInterval = !_.isNil(timeoutDuration)
      ? Math.max(0, timeoutDuration)
      : 20000; // in ms

    const rs = this.initCore();

    if (!wait) {
      return rs;
    }

    return lastValueFrom(
      this.initializeSubject.pipe(
        take(1),
        timeout({
          each: timeoutInterval,
          with: () =>
            throwError(
              () =>
                new Error(
                  `Failed to connnect to a RabbitMQ broker within a timeout of ${timeoutInterval}ms`,
                ),
            ),
        }),
        catchError((err) => (reject ? throwError(() => err) : EMPTY)),
      ),
    );
  }

  private async initCore() {
    this.logger.info(
      `Trying to connect to RabbitMQ broker ${this._config.name}`,
    );

    // create actual rabbitmq connection
    this._rabbitmqConnection = connect(
      Array.isArray(this._config.uri) ? this._config.uri : [this._config.uri],
    );

    this._rabbitmqConnection.on('connect', () => {
      this.logger.info(
        `Successfully connected to RabbitMQ broker: ${this._config.name}`,
      );
    });

    this._rabbitmqConnection.on('disconnect', (err: any) => {
      this.logger.error(
        `Disconnected from RabbitMQ broker: ${this._config.name}: %o`,
        err.stack || err,
      );
    });

    let defaultChannel: RabbitMQChannel | undefined;

    // get the first channel that has default = true to be the default channel
    defaultChannel = this._config.channels.find(
      (channel) => !!channel.config?.default,
    );

    // assign default value to all channels
    this._config.channels =
      this.configuration.channels.map((channel) => ({
        ...channel,
        config: {
          prefetchCount: this._config.prefetchCount,
          default: channel.name === defaultChannel?.name ? true : false,
          ...(channel.config ?? {}),
        },
      })) ?? [];

    if (!defaultChannel) {
      // not provided any default channels, create a default channel
      defaultChannel = {
        name: AmqpConnection.name,
        config: {
          prefetchCount: this._config.prefetchCount,
          default: true,
        },
      };

      this._config.channels.push(defaultChannel);
    }

    await Promise.all(
      this._config.channels.map((channel) => {
        this.setupManagedChannel(channel.name, channel.config ?? {});
      }),
    );
  }

  private setupManagedChannel(name: string, config: RabbitChannelConfig) {
    // create new channels
    const newChannel = this._rabbitmqConnection.createChannel({ name });

    // save the channel
    this._rabbitmqChannels.set(name, newChannel);

    // save the default channel
    if (config.default) {
      this._rabbitmqChannel = newChannel;
    }

    // channel events
    newChannel.on('connect', () => {
      this.logger.info(`Successfully connected to a RabbitMQ channel: ${name}`);
    });

    newChannel.on('close', () => {
      this.logger.info(`Successfully closed to a RabbitMQ channel: ${name}`);
    });

    newChannel.on('error', (err, { name }) => {
      this.logger.warn(
        `Failed to create a RabbitMQ channel: ${name} / error: ${err.message} ${err.stack}`,
      );
    });

    return newChannel.addSetup((channel: ConfirmChannel) =>
      this.setUpInitChannel(channel, name, config),
    );
  }

  /**
   * @description This setup function will be rerun when rabbitmq broker reconnect
   * @param channel
   * @param name
   * @param config
   */
  async setUpInitChannel(
    channel: ConfirmChannel,
    name: string,
    config: RabbitChannelConfig,
  ) {
    // save raw channels
    this._channels.set(name, channel);

    // config prefetch count
    await channel.prefetch(config.prefetchCount || this._config.prefetchCount);

    if (config.default) {
      this._channel = channel;

      // this method will check if have exchange with specified name
      // if not channel will emit 'error' event => channel failed to created
      // when channel failed to created, connection will be disconnected
      // return channel.checkExchange('abc');

      this.initializeSubject.next();
    }
  }
}
