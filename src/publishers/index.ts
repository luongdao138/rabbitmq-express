import { concatMap, interval, take } from 'rxjs';
import { RabbitMQService } from '../rabbitmq-service';

export async function testPublishers(service: RabbitMQService) {
  interval(10)
    .pipe(
      take(10),
      concatMap((val) =>
        service.connection.publish('exchange_1', 'routing_key_1', {
          data: 'Hello rabbitmq ' + val,
        }),
      ),
    )
    .subscribe();
}
