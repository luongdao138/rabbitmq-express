const amqp = require('amqplib');
const { interval, take, map } = require('rxjs');

(async () => {
  const connection = await amqp.connect('amqp://guest:guest@localhost:5674');

  const channel = await connection.createConfirmChannel();

  interval(1000)
    .pipe(
      take(10),
      map(() =>
        channel.publish(
          'exchange_1',
          'routing_key_1',
          Buffer.from(
            JSON.stringify({
              data: 'hehehe',
            }),
          ),
          (err, done) => {
            if (err) throw err;

            console.log('published success');
          },
        ),
      ),
    )
    .subscribe();
})();
