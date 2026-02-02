import Queue from 'bull';
import logger from '../logger.js';

export class QueueManager {
  private queues: Map<string, Queue.Queue> = new Map();
  private redisUrl: string;

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.redisUrl = redisUrl;
  }

  getQueue(name: string): Queue.Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, this.redisUrl);

      queue.on('completed', (job) => {
        logger.info(`Queue ${name} - Job ${job.id} completed`);
      });

      queue.on('failed', (job, err) => {
        logger.error(`Queue ${name} - Job ${job.id} failed:`, err);
      });

      this.queues.set(name, queue);
    }

    return this.queues.get(name)!;
  }

  async enqueueJob<T = any>(queueName: string, data: T, options?: any): Promise<Queue.Job> {
    const queue = this.getQueue(queueName);
    return queue.add(data, options || { attempts: 3, backoff: 'exponential' });
  }

  async processQueue<T = any>(
    queueName: string,
    processor: (job: Queue.Job<T>) => Promise<any>,
    concurrency: number = 1
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    queue.process(concurrency, processor);
  }

  async closeAll(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();
  }
}

export default new QueueManager(process.env.REDIS_URL);
