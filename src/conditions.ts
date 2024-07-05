import { KeyValueRecord, StateTypes } from "./database";

export type Tag = "none" | "event" | "action";
export type Category = "greeting" | "confirmation" | "sign-off";

/**
 * Some shortcuts for listing a number of standard utterances that are produced without using the LLM.
 * @date 31/01/2024
 *
 * @export
 * @typedef {ConditionalLine}
 */
export type ConditionalLine = {
	category?: Category,
	lines: string[],
	condition?: Condition,
}

/**
 * A condition can either be a tag (if it is companion-dependent) or the name of a world data key. It is always
 * compared with a lower boundary (inclusive, >=) and an upper boundary (exclusive, <).
 * @date 31/01/2024
 *
 * @export
 * @typedef {Condition}
 */
export type Condition = {
	tag: Tag | string,
	min?: number,
	max?: number,
	value?: StateTypes,
}

/**
 * Evaluate a condition
 * @param {Condition} condition
 * @param {KeyValueRecord[]} worldState
 * @returns {boolean}
 */
export const evaluateCondition = (condition: Condition, worldState: KeyValueRecord[]) => {

	const min = condition.min || 0;
	const max = condition.max || Number.MAX_SAFE_INTEGER;

	switch (condition.tag) {
		case "none":
			return true;
		case "event":
			const activeEvent = worldState.find(entry => entry.key == condition.value);
			return activeEvent != undefined && activeEvent.value as boolean;
		default:
			break;
	}

	if (typeof condition.tag == "string") { 
		const entry = worldState.find(entry => entry.key == condition.tag);

		if (!entry) {
			console.error("Invalid trigger: '" + condition.tag + "' not found in world state.")
			return false; // entry not found
		}
		if (condition.value && typeof condition.value != typeof entry.value) { 
			console.error("Invalid trigger: " + condition.tag + " has a different type than the corresponding world state.")
			return false; // entry not found
		}

		// we check for an interval
		if (typeof entry.value == "number" && condition.value == undefined)
			return entry.value >= min && entry.value < max;
		
		// we compare to a value
		return (entry.value === condition.value);
	}

	return false;
}
