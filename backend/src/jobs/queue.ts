type ProcessorFn<DataType, ResultType> = (job: { id: string; data: DataType }) => Promise<ResultType>;

const processors = new Map<string, ProcessorFn<any, any>>();

export function registerWorkerProcessor<DataType, ResultType>(
  name: string,
  processor: ProcessorFn<DataType, ResultType>,
) {
  processors.set(name, processor);
}

export function getQueue<DataType = unknown, ResultType = unknown>(name: string) {
  return {
    add: async (_jobName: string, data: DataType, _opts?: any) => {
      const jobId = Math.random().toString(36).substring(2, 9);
      const job = { id: jobId, data };
      const processor = processors.get(name);

      const promise = (async () => {
        if (processor) {
          return await processor(job);
        }
        return undefined as unknown as ResultType;
      })();

      return {
        id: jobId,
        waitUntilFinished: async (_events?: any, _timeoutMs?: number) => {
          return await promise;
        },
      };
    },
  };
}

export type Job<DataType = unknown, ResultType = unknown> = {
  id?: string;
  data: DataType;
  returnvalue?: ResultType;
};
