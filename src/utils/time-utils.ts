
export const secondsToString = (interval: number) => {
	switch (interval) {
		case 3600: return "LAST HOUR";
		case 86400: return "LAST 24H";
		case 604800: return "LAST WEEK";
		case 2592000: return "LAST MONTH";
	}
	return "SINCE THE DAWN OF TIME";
}

export const unixTimestampToDate = (timestamp: number) => {
	const options: Intl.DateTimeFormatOptions = {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	};
	let dt = new Date(timestamp).toLocaleDateString("default", options);
	return dt;
}

export const timeToString = (date: Date) => {
	const hours = date.getHours();
	const minutes = "0" + date.getMinutes();
	const seconds = "0" + date.getSeconds();

	return hours + ':' + minutes.substring(-2) + ':' + seconds.substring(-2);
	// console.log(formattedTime);
}

export function formatRelativeDate(date: number) {
	let diff = Date.now() - date * 1000; // the difference in milliseconds

	if (diff < 10000) { // less than 1 second
		return 'now';
	}

	const sec = Math.floor(diff / 1000);
	if (sec < 60) {
		return sec + 's';
	}

	const min = Math.floor(diff / (1000 * 60));
	if (min < 60) {
		return min + 'm';
	}

	const hours = Math.floor(diff / (1000 * 60 * 60));
	if (hours < 60) {
		return hours + 'h';
	}

	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	if (days < 14) {
		return days + 'd';
	}

	return unixTimestampToDate(date);
}

export function getMidnightUtc(): Date {
	const maxTimeToday = new Date();
	maxTimeToday.setUTCHours(23, 59, 59, 999);
	return new Date(maxTimeToday.getTime() + 1);
}

export function nextCreditsResetCountdownString(creditsTtl: number): string {
	return new Date(creditsTtl).toISOString().slice(11, 19);
}
