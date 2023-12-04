import { RabbitMQSubscriberErrorHandler } from './types';

export enum ErrorHandlerBehavior {
  ACK = 'ACK',
  NACK = 'NACK',
  REQUEUE = 'REQUEUE',
}

export const ackErrorHandler: RabbitMQSubscriberErrorHandler = (
  channel,
  msg,
) => {
  channel.ack(msg);
};

export const nackErrorHandler: RabbitMQSubscriberErrorHandler = (
  channel,
  msg,
) => {
  channel.nack(msg, false, false);
};

export const requeueErrorHandler: RabbitMQSubscriberErrorHandler = (
  channel,
  msg,
) => {
  channel.nack(msg, false, true);
};
