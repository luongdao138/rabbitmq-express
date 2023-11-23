//ts utils
export type DeepRequired<T, P extends string[] = string[]> = T extends object
  ? Omit<T, Extract<keyof T, P[0]>> &
      Required<{
        [K in Extract<keyof T, P[0]>]: NonNullable<
          DeepRequired<T[K], ShiftUnion<P>>
        >;
      }>
  : T;

export type Shift<T extends any[]> = ((...t: T) => any) extends (
  first: any,
  ...rest: infer Rest
) => any
  ? Rest
  : never;

// use a distributed conditional type here
type ShiftUnion<T> = T extends any[] ? Shift<T> : never;

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
};
