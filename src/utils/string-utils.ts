import { randomArrayElement } from "./array-utils";
import { logger } from "./logging-utils";

export const START_SENTENCES = [
	"A screaming comes across the sky.",
	"Happy families are all alike; every unhappy family is unhappy in its own way.",
	"It was a bright cold day in April, and the clocks were striking thirteen.",
	"It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair.",
	"The sun shone, having no alternative, on the nothing new.",
	"Ships at a distance have every man's wish on board.",
	"I had the story, bit by bit, from various people, and, as generally happens in such cases, each time it was a different story.",
	"It was the day my grandmother exploded.",
	"Having placed in my mouth sufficient bread for three minutes' chewing, I withdrew my powers of sensual perception and retired into the privacy of my mind, my eyes and face assuming a vacant and preoccupied expression.",
	"It was love at first sight.",
	"He was born with a gift of laughter and a sense that the world was mad.",
	"Time is not a line but a dimension, like the dimensions of space.",
];

export function getLastStopSign(text: String) {
	return Math.max(
		text.lastIndexOf('.'),
		text.lastIndexOf('!'),
		text.lastIndexOf('?'),
		// text.lastIndexOf('\''), // don't use this one because it's used in the middle of a sentence (like in this one twice)
		// text.lastIndexOf('"'),
		// text.lastIndexOf('”'),
		// text.lastIndexOf('＂'),
		// text.lastIndexOf('〞'),
		// text.lastIndexOf('‟'),
		text.lastIndexOf('…'),
		// text.lastIndexOf("..."),
		text.lastIndexOf(':'),
		text.lastIndexOf(';'),
		text.lastIndexOf('\n'),
	);
}

export function wantsSpace(character: string) {
	return ".!?…\"”〞‟:;,)]}–—·".includes(character);
}

export function isCutoffSign(character: string) {
	return ".!?…".includes(character);
}

export function getLastCutoffSign(text: String) {
	return Math.max(
		text.lastIndexOf('.'),
		text.lastIndexOf('!'),
		text.lastIndexOf('?'),
		text.lastIndexOf('…'),
		text.lastIndexOf("..."),
	);
}

export function getNextCut(text: String) {
	return Math.min(
		text.includes('.') ? text.indexOf('.') : text.length - 1,
		text.includes('!') ? text.indexOf('!') : text.length - 1,
		text.includes('?') ? text.indexOf('?') : text.length - 1,
		text.includes('…') ? text.indexOf('…') : text.length - 1,
		text.includes("...") ? text.indexOf("...") : text.length - 1,
		text.includes(':') ? text.indexOf(':') : text.length - 1,
		text.includes(';') ? text.indexOf(';') : text.length - 1,
		// text.includes('\n') ? text.indexOf('\n') : text.length - 1,
		text.length - 1
	);
}

export const checkPrompt = (text: string) => {
	return /^([\u0000-\u024F])+$/u.test(text);
}

export const makeSafe = (text: string) => {
	return text.replace(/[^\u0000-\u024F]+/g, "");
}

export type promptType = { text: string; startPosition: number; endPosition: number }

export function getSelectionString(text: string, startPosition: number, endPosition: number): promptType {
	if (!text || text.length < 3) return { text: "", startPosition: startPosition, endPosition: endPosition };

	const maxCharacters = 250;
	const hasSelection = (Math.abs(startPosition - endPosition) > 3); // we regard selections of more than 3 characters as valid

	let finalString = "";
	logger.debug("text: " + text);
	// logger.debug("startPosition: " + startPosition);
	// logger.debug("endPosition: " + endPosition);

	// fill up until it would go over 250 characters
	let punctuationIndexLeft: number = startPosition;
	let insurance = 200;
	do {
		const remainingLeft = text.substring(Math.max(0, startPosition - maxCharacters), punctuationIndexLeft);
		const lastSentenceLength = remainingLeft.length - (getLastStopSign(remainingLeft) + 1);
		punctuationIndexLeft -= lastSentenceLength;
		const lastSentence = text.substring(Math.max(0, punctuationIndexLeft), startPosition - finalString.length);
		if (punctuationIndexLeft != Math.max(0, startPosition - maxCharacters)) {
			finalString = lastSentence + finalString;
			// logger.debug("--");
			// logger.debug("remainingLeft: " + remainingLeft);
			// logger.debug("remainingLeft length: " + (punctuationIndexLeft - Math.max(0, startPosition - maxCharacters)));
			// logger.debug("lastSentenceLength: " + lastSentenceLength);
			// logger.debug("punctuationIndexLeft: " + punctuationIndexLeft);
			// logger.debug("Appending: " + lastSentence);
			// logger.debug("String: " + finalString);

			punctuationIndexLeft -= 1; // go one left
			insurance--;
		}

	} while (punctuationIndexLeft > 0 && punctuationIndexLeft != Math.max(0, startPosition - maxCharacters) && finalString.length < 250 && insurance > 0);

	const startIndex =
		hasSelection ? startPosition :
			Math.abs(punctuationIndexLeft - startPosition) < 3 ? startPosition - maxCharacters : // full para if cut is too close
				punctuationIndexLeft < 0 ? 0 : Math.min(punctuationIndexLeft + 1, startPosition); // -1 because we add 1 below

	// find end of sentence if in the middle
	const remainingLength = maxCharacters - (endPosition - startIndex);
	const rightString = text && text.substring(endPosition, endPosition + remainingLength);
	const punctuationIndexRight = getNextCut(rightString) + 1 + endPosition;
	// const endIndex =
	//   hasSelection ? endPosition :
	//   Math.min(Math.max(punctuationIndexRight, endPosition), text.length); // take the one point further right

	finalString = text.substring(startIndex, startPosition);
	finalString = finalString.replaceAll("\n\n", " ");
	finalString = finalString.replaceAll("  ", " ");
	finalString = finalString.trim();

	logger.debug("Result string: " + finalString);

	if (finalString.length == 0) finalString = "";

	return { text: finalString, startPosition: startPosition - finalString.length, endPosition: startPosition };
}

export function getSelectionStringOld(text: string, startPosition: number, endPosition: number): promptType {
	if (!text || text.length < 3) return { text: "", startPosition: startPosition, endPosition: endPosition };

	const maxCharacters = 250;
	const hasSelection = (Math.abs(startPosition - endPosition) > 3); // we regard selections of more than 3 characters as valid

	let finalString = "";
	// logger.debug("text: " + text);
	// logger.debug("startPosition: " + startPosition);
	// logger.debug("endPosition: " + endPosition);

	// fill up until it would go over 250 characters
	let punctuationIndexLeft: number = startPosition;
	let insurance = 200;
	do {
		const remainingLeft = text.substring(Math.max(0, startPosition - maxCharacters), punctuationIndexLeft);
		const lastSentenceLength = remainingLeft.length - (getLastStopSign(remainingLeft) + 1);
		punctuationIndexLeft -= lastSentenceLength;
		const lastSentence = text.substring(Math.max(0, punctuationIndexLeft), startPosition - finalString.length);
		if (punctuationIndexLeft != Math.max(0, startPosition - maxCharacters)) {
			finalString = lastSentence + finalString;
			// logger.debug("--");
			// logger.debug("remainingLeft: " + remainingLeft);
			// logger.debug("remainingLeft length: " + (punctuationIndexLeft - Math.max(0, startPosition - maxCharacters)));
			// logger.debug("lastSentenceLength: " + lastSentenceLength);
			// logger.debug("punctuationIndexLeft: " + punctuationIndexLeft);
			// logger.debug("Appending: " + lastSentence);
			// logger.debug("String: " + finalString);

			punctuationIndexLeft -= 1; // go one left
			insurance--;
		}

	} while (punctuationIndexLeft > 0 && punctuationIndexLeft != Math.max(0, startPosition - maxCharacters) && finalString.length < 250 && insurance > 0);

	const startIndex =
		hasSelection ? startPosition :
			Math.abs(punctuationIndexLeft - startPosition) < 3 ? startPosition - maxCharacters : // full para if cut is too close
				punctuationIndexLeft < 0 ? 0 : Math.min(punctuationIndexLeft + 1, startPosition); // -1 because we add 1 below

	// find end of sentence if in the middle
	const remainingLength = maxCharacters - (endPosition - startIndex);
	const rightString = text && text.substring(endPosition, endPosition + remainingLength);
	const punctuationIndexRight = getNextCut(rightString) + 1 + endPosition;
	const endIndex =
		hasSelection ? endPosition :
			Math.min(Math.max(punctuationIndexRight, endPosition), text.length); // take the one point further right

	// logger.debug("Left string: " + (text && ));
	// logger.debug("Right string: " + (text && text.substring(startPosition, endIndex)));
	// logger.debug("Position " + startPosition + " -- " + endPosition);
	// logger.debug("Punctuation: " + punctuationIndexLeft + " -- " + punctuationIndexRight);
	// logger.debug("Indices " + startIndex + " -- " + endIndex);

	// This works but there are still edge cases where the selection could be >=250 characters and start in hte middle of a word.
	// If it's too long we cut in the calling function anyway, so all good.
	// And others where the selection is empty.

	finalString += text.substring(startPosition, endIndex);
	finalString = finalString.replaceAll("\n\n", " ");
	finalString = finalString.replaceAll("  ", " ");
	finalString = finalString.trim();

	logger.debug("Result string: " + finalString);

	if (finalString.length == 0) finalString = "";

	return { text: finalString, startPosition: startIndex, endPosition: endIndex };
}

// returns index of the previous cut relative to the whole string
export function findPreviousCut(text: string, startPosition: number = 0): number {
	// const cutIndex = getNextCut(text.substring(startPosition, text.length));

	const searchStartIndex = startPosition;

	const cutIndex =
		Math.max(
			text.lastIndexOf('.', searchStartIndex),
			text.lastIndexOf('!', searchStartIndex),
			text.lastIndexOf('?', searchStartIndex),
			text.lastIndexOf('…', searchStartIndex),
			// text.lastIndexOf("..."),
			text.lastIndexOf(":", searchStartIndex),
			text.lastIndexOf(";", searchStartIndex),
		);

	return cutIndex;
}


// returns index of the next cut relative to the whole string
export function findCut(text: string, startPosition: number = 0): number {
	return startPosition + getNextCut(text.substring(startPosition, text.length));
}

const countDoubleQuotes = (text: string) => text.split('"').length - 1;

export function removeLineBreaks(text: string): string {
	const cleanedText = text
		.replace(/[\r\n]/g, " ")            // replace \r or \n with space
		.replace(/[\s]{2,}/g, " ")          // replace 2 or more whitespaces (except newlines) with a single one, ref: https://stackoverflow.com/a/45046733

	return cleanedText;
}

// the following is the cleaning function for uploaded text as well as snippets
export function cleanText(text: string): string {

	const cleanedText = text

		// the following were active when we still supported quotations:
		// .replaceAll(/[«»““”„‟≪≫《》〝〞〟＂″‶]/g, "\"") // replacing all weird quotes a la: https://stackoverflow.com/a/47173868/17478452
		// .replaceAll(/[ʻʼʽ٬‘’‚‛՚︐]/g, "'")             // replacing all weird quotes a la: https://stackoverflow.com/a/47173868/17478452
		// .replaceAll(/"+/g, "\"")                    // replace duplicate double quotation marks
		// .replaceAll(/'+/g, "'")                     // replace duplicate single quotation marks
		// .replaceAll(/([\.\?!])"(\S)/g, "$1\" $2")        // add a space after ."
		// .replaceAll(/([\.\?!])'(\S)/g, "$1' $2")         // add a space after .'

		.replace(/[ʻʼʽ٬‘‚‛՚︐«»““”„‟≪≫《》〝〞〟＂″‶"]/g, "") // remove all kinds of quotation marks
		// .replaceAll(/[\x00-\x08\x0E-\x1F\x7F-\uFFFF]/g, '')   // ASCII only (strip unicode)
		.replace(/([\.\?!:;,])(\S)/g, "$1 $2")   // replace missing whitespace after a sentence end with whitespace
		.replace(/[\r\n]{2,}/g, "\n")            // replace 2 or more newlines with a single one
		.replace(/[^\S\r\n]{2,}/g, " ")          // replace 2 or more whitespaces (except newlines) with a single one, ref: https://stackoverflow.com/a/45046733
		;

	// logger.debug(cleanedText)
	return cleanedText;
}

export function cleanTextMinimal(text: string): string {

	const cleanedText = text

		.replace(/[ʻʼʽ٬‘‚‛՚︐«»““”„‟≪≫《》〝〞〟＂″‶"]/g, "") // remove all kinds of quotation marks
		.replace(/([\.\?!:;,])(\S)/g, "$1 $2")   // replace missing whitespace after a sentence end with whitespace
		// .replaceAll(/[\r\n]{2,}/g, "\n")            // replace 2 or more newlines with a single one
		// .replaceAll(/[^\S\r\n]{2,}/g, " ")          // replace 2 or more whitespaces (except newlines) with a single one, ref: https://stackoverflow.com/a/45046733
		;

	// logger.debug(cleanedText)
	return cleanedText;
}


export function cleanSnippet(text: string, minLength: number = 20, maintainNewlines: boolean = false): string {
	if (text == null) return "";

	let cleanedText = maintainNewlines ? cleanTextMinimal(text) : cleanText(text);
	let lastPunctuationIndex: number = getLastCutoffSign(cleanedText) + 1;
	if (lastPunctuationIndex < cleanedText.length && lastPunctuationIndex > minLength) {
		cleanedText = cleanedText.substring(0, lastPunctuationIndex);
	}

	// logger.debug("string: " + cleanedText);
	// logger.debug("last character: " + cleanedText[cleanedText.length - 1]);

	if (countDoubleQuotes(cleanedText) % 2 != 0 && isCutoffSign(cleanedText[cleanedText.length - 1])) return cleanedText + "\""; // add a " character if we have an uneven number of quotation marks

	return cleanedText;
}

export const titleCase = (str: string) => {
	return str.toLowerCase().split(' ').map(function (word) {
		return word.length > 1 ? word.replace(word[0], word[0].toUpperCase()) : word;
	}).join(' ');
}

export const deGutenberg = (text: string) => {
	if (text.startsWith("The Project Gutenberg")) {
		// const withoutPreamble = text.substring(0, text.indexOf())
		const lines = text.split(/\r\n/);
		let startIndex = 0;
		let endIndex = text.length - 1;
		let index = 0;
		lines.forEach((line, lineIndex) => {
			if (line.startsWith("***END OF") || line.startsWith("*** END OF")) endIndex = index + lineIndex * 2 - 1; // cut before current line but include newlines (via lineIndex)
			if (line.startsWith("***START OF") || line.startsWith("*** START OF")) startIndex = index + line.length + lineIndex * 2; // include current line and the newlines (via lineIndex)
			index += line.length;
		})
		logger.debug("Gutenbook of " + index + " characters (" + lines.length + " lines)! Keeping from " + startIndex + " to " + endIndex);
		return text.substring(startIndex, endIndex);
	}
	return text;
}

/*
A word has 4.7 characters on average
A sentence has 10-15 words (= 47-70.5 characters)
A paragraph has 200-300 words on average (= 940-1410 characters)
A page has 2000 characters on average
 */

const shortenText = (text: string, length: number) => {
	const startIndex = text.length - length;
	if (startIndex < 0) return text;

	const shorterText = text.substring(startIndex);
	const nextCutoff = getNextCut(shorterText) + 1;

	if (nextCutoff < shorterText.length) return shorterText.substring(nextCutoff);

	return shorterText;
}

export const getLastParagraph = (document: string) => {
	if (document.length <= 1000) return cleanText(document);

	const paragraphs = cleanText(document).split("\n");
	const selectedParagraph = paragraphs.pop();

	return selectedParagraph ? shortenText(selectedParagraph, 1000) : shortenText(document, 1000);
}

export const getLastSentence = (document: string) => {
	const trimmedDocument = cleanText(document.trim());

	if (trimmedDocument.length <= 70) return trimmedDocument.trim();

	const lastStopSign = getLastStopSign(trimmedDocument.substring(0, trimmedDocument.length - 3)) + 1;
	if (lastStopSign >= 0 && lastStopSign < trimmedDocument.length) return trimmedDocument.substring(lastStopSign).trim();

	return trimmedDocument.substring(trimmedDocument.length - 70).trim();
}

export const getRandomParagraph = (document: string) => {
	if (document.length <= 1000) return document;

	const paragraphs = cleanText(document).split("\n");
	if (paragraphs.length < 2) return getLastParagraph(document);
	const selectedParagraph = randomArrayElement(paragraphs);
	return shortenText(selectedParagraph, 1000).trim();
}

export const capitalizeFirstLetter = (string: string) => {
	return string[0].toUpperCase() + string.slice(1);
}
