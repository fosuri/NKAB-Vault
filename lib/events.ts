import { EventEmitter } from 'events';

/**
 * Global event orchestrator for real-time Server-Sent Events (SSE) broadcasting.
 */

const globalForEvents = globalThis as unknown as {
  chatEventEmitter: EventEmitter | undefined;
};

// 1. Maintain a single event emitter instance across hot reloads in development
export const chatEventEmitter = globalForEvents.chatEventEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.chatEventEmitter = chatEventEmitter;
}
