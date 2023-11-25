import { DefaultLogger } from '../default-logger';
import { RabbitMQSubscriberHandler } from '../types';

const logger = new DefaultLogger();

export const subscriber1: RabbitMQSubscriberHandler<{
  data: string;
}> = (msg) => {
  logger.debug('Subscriber 1 is running: ' + msg.data);
};
