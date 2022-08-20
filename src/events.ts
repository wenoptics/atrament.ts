type EventHandler<T> = (data?: T) => void

class AtramentEventTarget {

  eventListeners: Map<string, Set<EventHandler<unknown>>>;

  constructor() {
    this.eventListeners = new Map();
  }

  addEventListener<T>(eventName: string, handler: EventHandler<T>) {
    const handlers = this.eventListeners.get(eventName) || new Set();
    handlers.add(handler);
    this.eventListeners.set(eventName, handlers);
  }

  removeEventListener<T>(eventName: string, handler: EventHandler<T>) {
    const handlers = this.eventListeners.get(eventName);
    if (!handlers) return;
    handlers.delete(handler);
  }

  dispatchEvent<T> (eventName: string, data?: T) {
    const handlers = this.eventListeners.get(eventName);
    if (!handlers) return;
    handlers.forEach(handler => handler(data));
  }
}

export { AtramentEventTarget };
