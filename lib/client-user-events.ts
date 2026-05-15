"use client";

type UserEvent = {
  type?: string;
  [key: string]: unknown;
};

type UserEventListener = (event: UserEvent) => void;

const listeners = new Set<UserEventListener>();

let eventSource: EventSource | null = null;

function startUserEventStream() {
  if (eventSource) {
    return;
  }

  eventSource = new EventSource("/api/chat/stream/user");

  eventSource.onmessage = (message) => {
    let event: UserEvent;

    try {
      event = JSON.parse(message.data) as UserEvent;
    } catch (error) {
      console.error("Failed to parse user event stream message:", error);
      return;
    }

    listeners.forEach((listener) => listener(event));
  };

  eventSource.onerror = (error) => {
    console.error("User event stream error:", error);
  };
}

export function subscribeToUserEvents(listener: UserEventListener) {
  listeners.add(listener);
  startUserEventStream();

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      eventSource?.close();
      eventSource = null;
    }
  };
}
