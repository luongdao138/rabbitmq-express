import { RabbitMQService } from '../rabbitmq-service';
import { subscriber1 } from './test-1';

export async function registerSubscribers(service: RabbitMQService) {
  await Promise.all([
    service.createSubscriber(subscriber1, {
      queue: 'queue_1',
      exchange: 'exchange_1',
      routingKey: 'routing_key_1',
    }),
  ]);
}
