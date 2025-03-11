require('dotenv').config();
const { fork } = require('child_process');
const path = require('path');
const os = require('os');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'process-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'process-combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

class ProcessManager {
  constructor(maxProcesses = os.cpus().length) {
    this.maxProcesses = maxProcesses;
    this.workers = new Map(); // processId -> { process, busy }
    this.jobQueue = [];
    this.jobCallbacks = new Map(); // jobId -> { resolve, reject }
    this.nextJobId = 1;
    this.nextProcessId = 1;

    logger.info(`Initializing ProcessManager with ${maxProcesses} workers`);
    this.initializeWorkers();
  }

  initializeWorkers() {
    for (let i = 0; i < this.maxProcesses; i++) {
      this.createWorker();
    }
  }

  createWorker() {
    const processId = this.nextProcessId++;
    const workerProcess = fork(path.join(__dirname, 'deploymentProcess.js'));
    
    workerProcess.on('message', (message) => {
      this.handleWorkerMessage(processId, message);
    });

    workerProcess.on('error', (error) => {
      logger.error(`Worker ${processId} error:`, {
        error: error.message,
        stack: error.stack
      });
      this.handleWorkerError(processId, error);
    });

    workerProcess.on('exit', (code) => {
      logger.warn(`Worker ${processId} exited with code ${code}, restarting...`);
      this.handleWorkerExit(processId, code);
    });

    this.workers.set(processId, {
      process: workerProcess,
      busy: false
    });

    logger.info(`Created worker process ${processId}`);
  }

  handleWorkerMessage(processId, message) {
    const worker = this.workers.get(processId);
    if (!worker) return;

    if (message.type === 'job_complete') {
      const callback = this.jobCallbacks.get(message.jobId);
      if (callback) {
        if (message.success) {
          callback.resolve(message.result);
        } else {
          callback.reject(new Error(message.error));
        }
        this.jobCallbacks.delete(message.jobId);
      }

      worker.busy = false;
      this.processNextJob();
    }
  }

  handleWorkerError(processId, error) {
    const worker = this.workers.get(processId);
    if (!worker) return;

    // Terminate the errored process and create a new one
    worker.process.kill();
    this.workers.delete(processId);
    this.createWorker();
  }

  handleWorkerExit(processId, code) {
    if (code !== 0) {
      const worker = this.workers.get(processId);
      if (worker) {
        // Clean up and create a new worker
        this.workers.delete(processId);
        this.createWorker();
      }
    }
  }

  async processJob(jobData) {
    return new Promise((resolve, reject) => {
      const jobId = this.nextJobId++;
      this.jobCallbacks.set(jobId, { resolve, reject });

      const availableWorker = Array.from(this.workers.entries())
        .find(([_, worker]) => !worker.busy);

      if (availableWorker) {
        const [processId, worker] = availableWorker;
        this.assignJobToWorker(processId, worker, jobId, jobData);
      } else {
        this.jobQueue.push({ jobId, jobData });
      }
    });
  }

  assignJobToWorker(processId, worker, jobId, jobData) {
    worker.busy = true;
    worker.process.send({
      type: 'job',
      jobId,
      data: jobData
    });

    logger.info(`Assigned job ${jobId} to worker ${processId}`, {
      jobData: {
        network: jobData?.network || process.env.CHAIN_NAME,
        deployedAddress: jobData?.deployedAddress,
        constructorArguments: jobData?.constructorArguments,
        templateNumber: jobData?.templateNumber,
        customContractPath: jobData?.customContractPath,
        tokenName: jobData?.tokenName,
        userId: jobData.userId
      }
    });
  }

  processNextJob() {
    if (this.jobQueue.length === 0) return;

    const availableWorker = Array.from(this.workers.entries())
      .find(([_, worker]) => !worker.busy);

    if (availableWorker) {
      const [processId, worker] = availableWorker;
      const job = this.jobQueue.shift();
      this.assignJobToWorker(processId, worker, job.jobId, job.jobData);
    }
  }

  async shutdown() {
    logger.info('Shutting down ProcessManager...');
    const shutdownPromises = Array.from(this.workers.values()).map(worker => {
      return new Promise((resolve) => {
        worker.process.once('exit', resolve);
        worker.process.kill();
      });
    });

    await Promise.all(shutdownPromises);
    logger.info('All workers shut down successfully');
  }
}

// Create and export a singleton instance
const processManager = new ProcessManager();
module.exports = processManager; 