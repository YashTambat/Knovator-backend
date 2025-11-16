require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const fetcher = require('./services/fetcher');
const ImportLog = require('./models/ImportLog');
const JobModel = require('./models/Job');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const QUEUE_NAME = 'job-import-queue';

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI missing in env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // const connection = new IORedis(REDIS_URL);
  // const queue = new Queue(QUEUE_NAME, { connection });

  // Worker - no QueueScheduler required in BullMQ v5
  const concurrency = parseInt(process.env.MAX_CONCURRENCY || '5', 10);

  // const worker = new Worker(QUEUE_NAME, async job => {
  //   try {
  //     const payload = job.data;
  //     const filter = { link: payload.link };
  //     const update = { $set: payload, $setOnInsert: { createdAt: new Date() } };
  //     const result = await JobModel.findOneAndUpdate(filter, update, { upsert: true, new: true });
  //     return { status: 'ok', id: result._id.toString() };
  //   } catch (err) {
  //     console.error('Worker error', err);
  //     throw err;
  //   }
  // }, { connection, concurrency });

  const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Queue
const queue = new Queue(QUEUE_NAME, {
  connection
});

// Worker
const worker = new Worker(
  QUEUE_NAME,
  async job => {
    try {
      const payload = job.data;
      const filter = { link: payload.link };
      const update = { $set: payload, $setOnInsert: { createdAt: new Date() } };
      const result = await JobModel.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true
      });
      return { status: "ok", id: result._id.toString() };
    } catch (err) {
      console.error("Worker error", err);
      throw err;
    }
  },
  {
    connection,
    concurrency
  }
);

  worker.on('failed', (job, err) => {
    console.error('Job failed', job.id, err.message);
  });

  app.get('/api/import-logs', async (req, res) => {
    const logs = await ImportLog.find().sort({ importDateTime: -1 }).limit(100);
    res.json(logs);
  });

  
  app.post('/api/import/manual', async (req, res) => {
    const urls = req.body.url ? [req.body.url] : req.body.urls || [
      'https://jobicy.com/?feed=job_feed',
      'https://jobicy.com/?feed=job_feed&job_categories=copywriting'
    ];

    const start = new Date();
    let totalFetched = 0;
    const failedJobs = [];

    for (const url of urls) {
      try {
        const items = await fetcher.fetchAndParse(url);
        totalFetched += items.length;

        for (const it of items) {
          try {
            await queue.add(
              'import-job',
              it,
              { removeOnComplete: true, attempts: 3 }
            );
          } catch (e) {
            failedJobs.push({ url, reason: e.message });
          }
        }
      } catch (e) {
        failedJobs.push({ url, reason: e.message });
      }
    }

    const log = new ImportLog({
      fileName: urls.join(', '),
      importDateTime: start,
      totalFetched,
      failedJobs
    });

    await log.save();
    res.json({ ok: true, totalFetched, queued: totalFetched, logId: log._id });
  });

  app.get('/api/health', (_, res) => res.json({ ok: true }));

  app.listen(PORT, () => console.log('Server listening on', PORT));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
