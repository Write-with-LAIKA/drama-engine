
export const getRandomElement = (array: any[]) => {
	return array[Math.floor((Math.random() * array.length))];
}

export const randomArrayElement = <T>(array: T[]) => {
	return array[Math.floor((Math.random() * array.length))];
}
