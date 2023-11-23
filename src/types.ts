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

export type RabbitChannelConfig = {
  prefetchCount?: number;
  default?: boolean;
};

export type RabbitMQChannel = { name: string; config?: RabbitChannelConfig };

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
};
