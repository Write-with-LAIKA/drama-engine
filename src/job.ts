import { Context } from "./context";
import { ModelConfig } from "./model-config";


/**
 * Description placeholder
 * @date 18/01/2024 - 09:45:34
 *
 * @export
 * @typedef {JobStatus} - The status of a job. Can be used for building a job queue.
 */
export type JobStatus = "new" | "scheduled" | "running" | "run" | "done" | null;

/**
 * Description placeholder
 * @date 18/01/2024 - 09:45:34
 *
 * @export
 * @typedef {Job} - The job structure. Wraps an inference.
 */
export type Job = {
	id: string,
	status: JobStatus,
	context: Context,
	prompt?: string,
	remoteID: string,
	timeStamp: number,
	modelConfig?: ModelConfig,
}
