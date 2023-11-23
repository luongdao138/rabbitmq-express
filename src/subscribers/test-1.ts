import { PalboxLogger } from '../logger';
import { RabbitMQSubscriberHandler } from '../types';

const logger = new PalboxLogger({ label: 'Subscriber1' });

export const subscriber1: RabbitMQSubscriberHandler<{
  data: string;
}> = (msg) => {
  logger.debug('Subscriber 1 is running: ' + msg.data);
};
