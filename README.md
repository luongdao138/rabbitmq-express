# @luongdao/node-rabbitmq

## Description

A small package inpired by [@golevelup/nestjs-rabbitmq](https://github.com/golevelup/nestjs/tree/master/packages/rabbitmq) library. Helps to work with rabbitmq in `nodejs` more easily (support expressjs).

## Connection Management

This packages leverages [`amqp-connection-manager`](https://github.com/benbria/node-amqp-connection-manager) package to support connection resiliency.

By default, if you try to launch the app when rabbit connection is not available, an error was thrown and caused the app to crash.

If you want to enable connection resiliency, you can configure `connectionInitOptions` to not wait for a connection to be available. For example:

```typescript
import {
  RabbitMQService,
  EXTENDED_EXCHANGE_TYPE,
} from '@luongdao/node-rabbitmq';

async function initRabbitMQ() {
  const rabbitMQService = new RabbitMQService({
    exchanges: [
      {
        name: 'exchange1',
        type: EXTENDED_EXCHANGE_TYPE.TOPIC,
      },
    ],
    uri: 'amqp://rabbitmq:rabbitmq@localhost:5672',
    connectionInitOptions: { wait: false },
  });

  await rabbitMQService.initConnection();
}
```

With `wait` set to `false`, unavailability of a RabbitMQ broker still allows your application to bootstrap correctly and relevant channel setups take place whenever a connection can be established.

The same principle applies to when a connection is lost. In such cases, rabbitmq tries to reconnect and set up everything again once it is reconnected.

## Usage

### Install

`npm install ---save @luongdao/node-rabbitmq`

or

`yarn add @luongdao/node-rabbitmq`

### Module Initialization

Import and add `RabbitMQService` it to the `imports` array of module.

```typescript
import {
  RabbitMQService,
  EXTENDED_EXCHANGE_TYPE,
} from '@luongdao/node-rabbitmq';

async function initRabbitMQ() {
  const rabbitMQService = new RabbitMQService({
    exchanges: [
      {
        name: 'exchange1',
        type: 'topic',
      },
    ],
    uri: 'amqp://rabbitmq:rabbitmq@localhost:5672',
    channels: {
      channel_1: {
        prefetchCount: 15,
        default: true,
      },
      channel_2: {
        prefetchCount: 2,
      },
    },
  });

  await rabbitMQService.initConnection();
}
```

## Register RabbitMQ subscribers

Simply make use of `registerSubscriber()` function of the connection object obtained from your rabbitmq service.

```typescript
import { RabbitMQSubscriberHandler } from '@luongdao/node-rabbitmq';

// init rabbitmq service and connection

export const subscriber1: RabbitMQSubscriberHandler<{
  data: string;
}> = (msg) => {
  logger.debug('Subscriber 1 is running: ' + msg.data);
};

await service.connection.registerSubscriber(subscriber1, {
  queue: 'queue_1',
  exchange: 'exchange_1',
  routingKey: 'routing_key_1',
  queueOptions: {
    channel: 'channel_1',
  },
});
```

### Handling messages with format different than JSON

By default, messages are parsed with `JSON.parse` method when they are received and stringified with `JSON.stringify` on publish.
If you wish to change this behavior, you can use your own parsers, like so

```typescript
import {
  RabbitMQService,
  EXTENDED_EXCHANGE_TYPE,
} from '@luongdao/node-rabbitmq';
import { ConsumeMessage } from 'amqplib';

async function initRabbitMQ() {
  const rabbitMQService = new RabbitMQService({
    // ...other configs
    deserializer: (message: Buffer, msg: ConsumeMessage) => {
      const decodedMessage = myCustomDeserializer(
        msg.toString(),
        msg.properties.headers,
      );
      return decodedMessage;
    },
    serializer: (msg: any) => {
      const encodedMessage = myCustomSerializer(msg);
      return Buffer.from(encodedMessage);
    },
  });

  await rabbitMQService.initConnection();
}
```

### Publising Messages (Fire and Forget)

If you just want to publish a message onto a RabbitMQ exchange, use the `publish` method of the `AmqpConnection` which has the following signature:

```typescript
public publish<T = any>(
  exchange: string,
  routingKey: string,
  message: T,
  options?: amqplib.Options.Publish
)

// init service and connnection
await rabbitMQService.connection.publish('exchange_1', 'routing_key_1', {message: 'Hello World'})
```

For example:

```typescript
// init service and connnection
await rabbitMQService.connection.publish('exchange_1', 'routing_key_1', {
  message: 'Hello World',
});
```
