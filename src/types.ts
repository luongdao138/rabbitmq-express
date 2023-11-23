import { Channel, ConsumeMessage, Options } from 'amqplib';
import { Nack } from './subscriber-response';

export enum EXCHANGE_TYPE {
  TOPIC = 'topic',
  DIRECT = 'direct',
  FANOUT = 'fanout',
  HEADERS = 'headers',
}

export type ConnectOptions = {
  wait?: boolean;
  timeout?: number;
  reject?: boolean;
};

export type RabbitMQQueueOptions = {
  channel?: string;
  bindingQueueArgs?: any;
} & Options.AssertQueue;

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
  type?: EXCHANGE_TYPE;
  createExchangeIfNotExists?: boolean;
  options?: Options.AssertExchange;
};

export type RabbitMQSubscriber = {
  name: string;
  config?: RabbitMQSubscriberOptions;
};

export type RabbitMQSubscriberResponse = void | Nack | any;

export type RabbitMQSubscriberHandler<T = any> = (
  msg: T,
  amqpMsg: ConsumeMessage,
  headers?: any,
) => RabbitMQSubscriberResponse | Promise<RabbitMQSubscriberResponse>;

export type RabbitMQSubscriberErrorHandler = (
  channel: Channel,
  msg: ConsumeMessage,
  error: any,
) => Promise<void> | void;

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
};
