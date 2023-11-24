import { testPublishers } from './publishers';
import { RabbitMQService } from './rabbitmq-service';
import { registerSubscribers } from './subscribers';

const RABBITMQ_CONNECTION_URI = 'amqp://guest:guest@localhost:5674';

async function bootstrap() {
  const rabbitMQService = new RabbitMQService({
    uri: RABBITMQ_CONNECTION_URI,
    name: 'Palbox',
    connectOptions: {
      reject: false,
      managerOptions: {
        heartbeatIntervalInSeconds: 30, // heartbeat 30s
      },
    },
    exchanges: [
      {
        name: 'exchange_1',
      },
      {
        name: 'exchange_2',
      },
    ],
    channels: [
      {
        name: 'Palbox',
      },
    ],
  });

  // init connection are asynchronous => need a function to assert connection and channel
  await rabbitMQService.initConnection();

  await registerSubscribers(rabbitMQService);

  await testPublishers(rabbitMQService);
}

bootstrap();
