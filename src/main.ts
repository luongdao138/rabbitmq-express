import { RabbitMQService } from './rabbitmq-service';

const RABBITMQ_CONNECTION_URI = 'amqp://guest:guest@localhost:5673';

async function bootstrap() {
  const rabbitmqService = new RabbitMQService({
    uri: RABBITMQ_CONNECTION_URI,
    name: 'Palbox',
  });

  rabbitmqService.connection;
  rabbitmqService.config;
}

bootstrap();
