import PQueue from "p-queue";

const queues = new Map<string, PQueue>();

/**
 * One request-per-host queue, shared across the process. minIntervalMs is the
 * larger of the configured requests-per-second budget and the host's
 * robots.txt Crawl-delay, so a stricter robots.txt always wins.
 */
export function getHostQueue(host: string, minIntervalMs: number): PQueue {
  let queue = queues.get(host);
  if (!queue) {
    queue = new PQueue({ interval: minIntervalMs, intervalCap: 1, concurrency: 1 });
    queues.set(host, queue);
  }
  return queue;
}

export function resetHostQueues() {
  queues.clear();
}
