import { describe, expect, test } from '@jest/globals';
import { Drama } from '../src/drama';

test('initialised drama engine correctly', () => {
	const drama = Drama.initialize("fireplace", []);
	// const result = add(2, 3);
	expect(drama).toBeDefined();
});