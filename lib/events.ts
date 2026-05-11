import { EventEmitter } from 'events';

const globalForEvents = globalThis as unknown as {
  chatEventEmitter: EventEmitter | undefined;
};

export const chatEventEmitter = globalForEvents.chatEventEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.chatEventEmitter = chatEventEmitter;
}
