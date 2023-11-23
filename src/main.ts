// import { EMPTY, interval, throwError, timeout } from 'rxjs';
import { RabbitMQService } from './rabbitmq-service';
import { registerSubscribers } from './subscribers';

const RABBITMQ_CONNECTION_URI = 'amqp://guest:guest@localhost:5674';

async function bootstrap() {
  const rabbitMQService = new RabbitMQService({
    uri: RABBITMQ_CONNECTION_URI,
    name: 'Palbox',
    connectOptions: {
      wait: false,
    },
    exchanges: [
      {
        name: 'exchange_1',
      },
      {
        name: 'exchange_2',
      },
    ],
  });

  await registerSubscribers(rabbitMQService);
}

bootstrap();
