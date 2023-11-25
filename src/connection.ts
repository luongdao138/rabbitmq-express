import _, { cloneDeep, merge } from 'lodash';
import {
  EXTENDED_EXCHANGE_TYPE,
  RabbitChannelConfig,
  RabbitMQChannel,
  RabbitMQConfig,
  RabbitMQExchange,
  RabbitMQPublishOptions,
  RabbitMQSubscriberHandler,
  RabbitMQSubscriberOptions,
  Nack,
} from './types';
import { PalboxLogger } from './logger';
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage, Options, Replies } from 'amqplib';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  defaultIfEmpty,
  lastValueFrom,
  take,
  takeLast,
  throwError,
  timeout,
} from 'rxjs';

const defaultConfig = {
  name: 'default', // by default, name of connection is `default` if not provided
  prefetchCount: 10,
  defaultExchangeType: EXTENDED_EXCHANGE_TYPE.TOPIC,
  connectOptions: {
    wait: true,
    reject: true,
    timeout: 5000,
    managerOptions: {},
  },
  channels: [],
  exchanges: [],
  subscribers: [],
  defaultConsumeOptions: {},
};

export class AmqpConnection {
  private logger = new PalboxLogger({ label: 'RabbitMQModule' });
  private _config: Required<RabbitMQConfig>;
  private _rabbitmqConnection!: AmqpConnectionManager;
  private _rabbitmqChannels: Map<string, ChannelWrapper> = new Map(); // save all channels
  private _rabbitmqChannel!: ChannelWrapper;

  private _channels: Map<string, ConfirmChannel> = new Map();

  // always use default channel to publish message
  private _channel!: ConfirmChannel;
  private initializeSubject = new Subject<boolean>();

  constructor(config: RabbitMQConfig) {
    this._config = {
      deserializer(msg) {
        return JSON.parse(msg.content.toString('utf-8'));
      },
      serializer(data) {
        return Buffer.from(JSON.stringify(data));
      },
      errorHandler() {
        // do nothing
      },
      ...merge(cloneDeep(defaultConfig), config),
    };
  }

  get configuration() {
    return this._config;
  }

  get managedConnection() {
    return this._rabbitmqConnection;
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
        catchError((err) => {
          if (reject) {
            return throwError(() => err);
          }

          this.logger.warn(
            `Failed to connnect to a RabbitMQ broker within a timeout of ${timeoutInterval}ms. Set 'reject' = true if you want to stop server if no connection available`,
          );
          return EMPTY;
        }),
        defaultIfEmpty(false),
      ),
    );
  }

  /**
   * @description Register a subscriber
   * @param handler
   * @param config
   */
  async registerSubscriber(
    handler: RabbitMQSubscriberHandler,
    config: RabbitMQSubscriberOptions,
    consumeOptions?: Options.Consume,
  ) {
    const subscriberName = config.name || handler.name;
    this.logger.debug(
      `${this._config.name}::Registering rabbitmq subscriber: ${subscriberName}`,
    );

    const initConfig =
      this._config.subscribers.find(
        (subscriber) => subscriber.name === config.name,
      ) ?? {};
    const mergeConfig = {
      ...config,
      ...initConfig,
    };

    await this.getManagedChannel(mergeConfig.queueOptions?.channel).addSetup(
      async (channel: ConfirmChannel) => {
        await this.consumeMessage(
          handler,
          channel,
          mergeConfig,
          consumeOptions,
        );
      },
    );
  }

  async publish<T = any>(
    exchange: string,
    routingKey: string,
    msg: T,
    options: RabbitMQPublishOptions = {},
  ) {
    if (!this._rabbitmqConnection.isConnected() || !this._channel) {
      throw new Error('AMQP connection is not available');
    }

    // TODO: add feature to create exchange if not exists here
    const exchangeToPublish = this._config.exchanges.find(
      (e) => e.name === exchange,
    );
    if (!exchangeToPublish) {
      throw new Error('Exchange not found');
    }

    let buffer: Buffer;

    if (msg instanceof Buffer) {
      buffer = msg;
    } else if (msg instanceof Uint8Array) {
      buffer = Buffer.from(msg);
    } else if (!_.isNil(msg)) {
      buffer = this._config.serializer(msg);
    } else {
      buffer = Buffer.alloc(0);
    }

    // convert some options before publishing message
    this.setPublishOptions(exchangeToPublish, options);

    return lastValueFrom(
      new Observable<Replies.Empty>((subsciber) => {
        this._channel.publish(
          exchange,
          routingKey,
          buffer,
          options,
          (err, ok) => {
            if (err) {
              subsciber.error(err);
            }

            subsciber.next(ok);
            subsciber.complete();
          },
        );
      }).pipe(takeLast(1)),
    );
  }

  private setPublishOptions(
    exchangeToPublish: RabbitMQExchange,
    options: RabbitMQPublishOptions,
  ) {
    // add delay configuration
    if (
      typeof options.delay === 'number' &&
      exchangeToPublish.type === EXTENDED_EXCHANGE_TYPE.DELAY_MESSAGE
    ) {
      options.headers = {
        ...(options.headers || {}),
        'x-delay': options.delay,
      };

      delete options.delay;
    }
  }

  private async initCore() {
    this.logger.info(
      `Trying to connect to RabbitMQ broker ${this._config.name}`,
    );

    // create actual rabbitmq connection
    this._rabbitmqConnection = connect(
      Array.isArray(this._config.uri) ? this._config.uri : [this._config.uri],
      this._config.connectOptions.managerOptions ?? {},
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
      (channel) => channel.config?.default === true,
    );

    if (!defaultChannel) {
      defaultChannel = this._config.channels.find(
        (channel) => channel.config?.default === undefined,
      );
    }

    if (!defaultChannel) {
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
        const channelConfig = {
          ...channel,
          config: {
            default: channel.name === defaultChannel!.name,
            prefetchCount:
              channel.config?.prefetchCount ?? this._config.prefetchCount,
          },
        };
        this.setupManagedChannel(channel.name, channelConfig.config);
      }),
    );

    return true;
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
  private async setUpInitChannel(
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

      // assert exchange in default channel
      await Promise.all(
        this._config.exchanges.map((exchangeConfig) => {
          const {
            name,
            createExchangeIfNotExists = true,
            options = {},
            type = this._config.defaultExchangeType,
          } = exchangeConfig;

          if (type === EXTENDED_EXCHANGE_TYPE.DELAY_MESSAGE) {
            options.arguments = {
              ...(options.arguments || {}),
              'x-delayed-type':
                'delayType' in exchangeConfig
                  ? exchangeConfig.delayType || EXTENDED_EXCHANGE_TYPE.TOPIC
                  : EXTENDED_EXCHANGE_TYPE.TOPIC,
            };
          }

          if (createExchangeIfNotExists) {
            return channel.assertExchange(name, type, options);
          }

          // this method will check if have exchange with specified name
          // if not channel will emit 'error' event => channel failed to created
          // when channel failed to created, connection will be disconnected
          return channel.checkExchange(name);
        }),
      );

      this.initializeSubject.next(true);
    }
  }

  private async consumeMessage(
    handler: RabbitMQSubscriberHandler,
    channel: ConfirmChannel,
    config: RabbitMQSubscriberOptions,
    consumeOptions: Options.Consume = {},
  ) {
    // setup queue, exchange, routing key, bindings before consuming message
    const queueName = await this.setupQueue(channel, config);

    // add some default configs for cosuming messages
    const consumeConfig: Options.Consume = {
      ...this._config.defaultConsumeOptions, // default
      ...consumeOptions,
    };

    // consume message
    await channel.consume(
      queueName,
      async (msg) => {
        if (_.isNull(msg)) {
          this.logger.warn('Receive null message');
          return;
        }

        try {
          const response = await this.handleMessage(handler, msg);

          if (response instanceof Nack) {
            channel.nack(msg, false, response.requeue);
            return;
          }

          if (response) {
            this.logger.warn(
              `Received response [${this._config.serializer(
                response,
              )}] from subscriber []. Subcribe handlers should only return void or Nack instance`,
            );
          }

          // acknowledge message when process successfully
          channel.ack(msg);
        } catch (error) {
          const errorHandler = config.errorHandler || this._config.errorHandler; // local => module

          await errorHandler(channel, msg, error);
        }
      },
      consumeConfig,
    );
  }

  private handleMessage(
    handler: RabbitMQSubscriberHandler,
    msg: ConsumeMessage,
  ) {
    let message: any;
    let headers: any;

    if (msg.content) {
      // deserialize message before process it
      message = this._config.deserializer(msg);
    }

    if (msg.properties?.headers) {
      headers = msg.properties.headers;
    }

    return handler(message, msg, headers);
  }

  private async setupQueue(
    channel: ConfirmChannel,
    config: RabbitMQSubscriberOptions,
  ) {
    let queueName: string;
    const {
      createQueueIfNotExists = true,
      queue = '',
      queueOptions = {},
      routingKey = [],
      exchange,
    } = config;

    // check queue
    if (createQueueIfNotExists) {
      const { queue: currentQueueName } = await channel.assertQueue(
        queue,
        queueOptions,
      );
      queueName = currentQueueName;
    } else {
      const { queue: currentQueueName } = await channel.checkQueue(queue);
      queueName = currentQueueName;
    }

    const routingKeys = Array.isArray(routingKey) ? routingKey : [routingKey];

    if (exchange && routingKeys.length) {
      await Promise.all(
        routingKeys
          .filter(Boolean)
          .map((key) =>
            channel.bindQueue(
              queueName,
              exchange,
              key,
              queueOptions.bindingQueueArgs,
            ),
          ),
      );
    }

    return queueName;
  }

  private getManagedChannel(channelName?: string) {
    if (!channelName) {
      return this._rabbitmqChannel;
    }

    const channel = this._rabbitmqChannels.get(channelName);

    if (!channel) {
      this.logger.warn(
        `Channel '${channelName}' does not exist, using default channel`,
      );

      return this._rabbitmqChannel;
    }

    return channel;
  }
}
