export function includes<T>(arr: Array<T>, element: T) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === element) return true;
  }
  return false;
}

export function unpackOffsetXY(event: MouseEvent | TouchEvent, rect: DOMRect) {
  const position = ('changedTouches' in event) && event.changedTouches[0] || event as MouseEvent;
  const x = 'offsetX' in position ? position.offsetX : position.clientX - rect.left;
  const y = 'offsetY' in position ? position.offsetY: position.clientY - rect.top;
  return { x, y };
}
