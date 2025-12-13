export function safeConsoleError(...args: any[]) {
  try {
    // Some browser extensions or logging libraries may replace console.error
    // with wrappers that assume internal state; guard against those throwing.
    // eslint-disable-next-line no-console
    console.error(...args);
  } catch (e) {
    // swallow
  }
}

export function safeConsoleLog(...args: any[]) {
  try {
    // eslint-disable-next-line no-console
    console.log(...args);
  } catch (e) {
    // swallow
  }
}
