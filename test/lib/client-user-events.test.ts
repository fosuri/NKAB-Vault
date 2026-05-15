class MockEventSource {
  static instances: MockEventSource[] = [];

  onmessage: ((message: MessageEvent) => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  close = jest.fn();

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }
}

describe("subscribeToUserEvents", () => {
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    jest.resetModules();
    MockEventSource.instances = [];
    Object.defineProperty(globalThis, "EventSource", {
      value: MockEventSource,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "EventSource", {
      value: originalEventSource,
      configurable: true,
    });
    jest.restoreAllMocks();
  });

  // Checks that only a single connection is opened, but all listeners receive the incoming messages.
  it("opens one user event stream and sends parsed events to subscribers", async () => {
    const { subscribeToUserEvents } = await import("../../lib/client-user-events");
    const firstListener = jest.fn();
    const secondListener = jest.fn();

    subscribeToUserEvents(firstListener);
    subscribeToUserEvents(secondListener);

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe("/api/chat/stream/user");

    MockEventSource.instances[0].onmessage?.({
      data: JSON.stringify({ type: "message", id: "event-1" }),
    } as MessageEvent);

    expect(firstListener).toHaveBeenCalledWith({ type: "message", id: "event-1" });
    expect(secondListener).toHaveBeenCalledWith({ type: "message", id: "event-1" });
  });

  // Ensures the live connection stays active as long as at least one listener is still listening.
  it("unsubscribes a listener without closing the stream while others remain", async () => {
    const { subscribeToUserEvents } = await import("../../lib/client-user-events");
    const firstListener = jest.fn();
    const secondListener = jest.fn();

    const unsubscribeFirst = subscribeToUserEvents(firstListener);
    subscribeToUserEvents(secondListener);
    unsubscribeFirst();

    MockEventSource.instances[0].onmessage?.({
      data: JSON.stringify({ type: "notification" }),
    } as MessageEvent);

    expect(firstListener).not.toHaveBeenCalled();
    expect(secondListener).toHaveBeenCalledWith({ type: "notification" });
    expect(MockEventSource.instances[0].close).not.toHaveBeenCalled();
  });

  // Verifies that the connection is properly closed to save resources when everyone stops listening.
  it("closes the stream after the last listener unsubscribes", async () => {
    const { subscribeToUserEvents } = await import("../../lib/client-user-events");

    const unsubscribe = subscribeToUserEvents(jest.fn());
    unsubscribe();

    expect(MockEventSource.instances[0].close).toHaveBeenCalledTimes(1);
  });

  // Safely handles corrupted or invalid data without crashing the app.
  it("ignores invalid JSON messages", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { subscribeToUserEvents } = await import("../../lib/client-user-events");
    const listener = jest.fn();

    subscribeToUserEvents(listener);
    MockEventSource.instances[0].onmessage?.({ data: "{invalid" } as MessageEvent);

    expect(listener).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to parse user event stream message:",
      expect.any(SyntaxError)
    );
  });

  // Makes sure connection errors are captured in the console for debugging.
  it("logs stream errors", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { subscribeToUserEvents } = await import("../../lib/client-user-events");
    const streamError = new Event("error");

    subscribeToUserEvents(jest.fn());
    MockEventSource.instances[0].onerror?.(streamError);

    expect(errorSpy).toHaveBeenCalledWith("User event stream error:", streamError);
  });
});
