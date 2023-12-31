import { AmqpConnectionManagerOptions } from 'amqp-connection-manager';
import { Channel, ConsumeMessage, Options } from 'amqplib';
import { Observable } from 'rxjs';

export class Nack {
  constructor(private readonly _requeue = false) {}

  get requeue() {
    return this._requeue;
  }
}

export enum EXTENDED_EXCHANGE_TYPE {
  TOPIC = 'topic',
  DIRECT = 'direct',
  FANOUT = 'fanout',
  HEADERS = 'headers',

  // for delay exchange (rabbitmq_delayed_message_exchange plugin)
  DELAY_MESSAGE = 'x-delayed-message',
}

export type EXCHANGE_TYPE = Exclude<
  EXTENDED_EXCHANGE_TYPE,
  EXTENDED_EXCHANGE_TYPE.DELAY_MESSAGE
>;

export type ConnectOptions = {
  /**
   * @description wait until connection and default channel is connected to start app
   */
  wait?: boolean;

  /**
   * @description use it if `wait` is set to true, timeout duration of rabbitmq connection
   */
  timeout?: number;

  /**
   * @description use it if `wait` is set to true, and you don't want to crash app if can not connect to rabbitmq
   */
  reject?: boolean;

  /**
   * @description options when create rabbitmq connection
   */
  managerOptions?: AmqpConnectionManagerOptions;
};

export type RabbitMQQueueOptions = {
  /**
   * @description Specify channel from which the queue will consume message from
   */
  channel?: string;
  bindingQueueArgs?: any;
} & Options.AssertQueue;

export type RabbitMQPublishResult =
  | {
      success: true;
      data?: any;
    }
  | {
      success: false;
      error?: Error;
    };

export type RabbitMQPublishOptions = Options.Publish & {
  /**
   * @description Use when set exchange type = 'x-delay-message'.
   */
  delay?: number;

  publishSource?: (
    baseSource: Observable<RabbitMQPublishResult>,
  ) =>
    | Observable<RabbitMQPublishResult>
    | Promise<Observable<RabbitMQPublishResult>>;
};

export type RabbitMQSubscriberOptions = {
  name?: string;
  exchange?: string;
  routingKey?: string | string[];
  queue?: string;
  queueOptions?: RabbitMQQueueOptions;
  errorHandler?: RabbitMQSubscriberErrorHandler;

  /**
   * @description Create a new queue if not exists
   */
  createQueueIfNotExists?: boolean;
};

export type RabbitChannelConfig = {
  prefetchCount?: number;
  default?: boolean;
};

export type RabbitMQChannel = { name: string; config?: RabbitChannelConfig };

export type RabbitMQExchange = {
  name: string;
  options?: Options.AssertExchange;
  createExchangeIfNotExists?: boolean;
} & (
  | {
      type?: EXCHANGE_TYPE;
    }
  | { type: EXTENDED_EXCHANGE_TYPE.DELAY_MESSAGE; delayType?: EXCHANGE_TYPE }
);

export type RabbitMQSubscriber = {
  name: string;
  config?: RabbitMQSubscriberOptions;
};

export type RabbitMQSubscriberResponse = void | Nack | any;

export type RabbitMQSubscriberHandler<T = any> = (
  msg: T,
  amqpMsg: ConsumeMessage,
  headers: any,
  channel: Channel,
) => RabbitMQSubscriberResponse | Promise<RabbitMQSubscriberResponse>;

export type RabbitMQSubscriberErrorHandler = (
  channel: Channel,
  msg: ConsumeMessage,
  error: any,
) => Promise<void> | void;

export interface ILogger {
  info(message: any, ...meta: any[]): void;
  warn(message: any, ...meta: any[]): void;
  error(message: any, ...meta: any[]): void;
  debug(message: any, ...meta: any[]): void;
  silly(message: any, ...meta: any[]): void;
}

export type RabbitMQConfig = {
  /**
   * @description Name of connection
   * @default 'default'
   */
  name?: string;

  /**
   * @description Connection string to connect to rabbitmq server
   * @requires
   */
  uri: string | string[];

  /**
   * @description Default prefetch count for all channels
   */
  prefetchCount?: number;

  /**
   * @description Default type for exchanges
   */
  defaultExchangeType?: EXCHANGE_TYPE;

  /**
   * @description Connection options
   */
  connectOptions?: ConnectOptions;

  /**
   * @description Channels to be created on init
   */
  channels?: RabbitMQChannel[];

  /**
   * @description You can pass a list with subscriber configs to use in the subscription decorator
   */
  subscribers?: RabbitMQSubscriber[];

  /**
   * @description Deserialize message before being handled by subscriber, often use to decode from buffer
   */
  deserializer?: (msg: ConsumeMessage) => any;

  /**
   * @description Serialize message to buffer type
   */
  serializer?: (data: any) => Buffer;

  /**
   * @description Error handling behavior when have error
   */
  errorHandler?: RabbitMQSubscriberErrorHandler;

  /**
   * Exchange to be created
   */
  exchanges?: RabbitMQExchange[];

  /**
   * Default options when consuming message
   */
  defaultConsumeOptions?: Options.Consume;

  /**
   * Logger of application. Must implement ILogger interface
   */
  logger?: ILogger;
};
