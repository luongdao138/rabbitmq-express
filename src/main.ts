// import { EMPTY, interval, throwError, timeout } from 'rxjs';
import { RabbitMQService } from './rabbitmq-service';

const RABBITMQ_CONNECTION_URI = 'amqp://guest:guest@localhost:5674';

async function bootstrap() {
  new RabbitMQService({
    uri: RABBITMQ_CONNECTION_URI,
    name: 'Palbox',
    connectOptions: {
      wait: false,
    },
  });

  // const slow$ = interval(1200);

  // slow$
  //   .pipe(
  //     timeout({
  //       first: 1500,
  //       each: 1000,
  //       with: () => throwError(() => EMPTY),
  //     }),
  //   )
  //   .subscribe({
  //     next(value) {
  //       console.log(value);
  //     },
  //     error: console.error,
  //     complete() {
  //       console.log('complete');
  //     },
  //   });
}

bootstrap();
