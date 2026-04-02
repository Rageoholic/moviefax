import { env } from "~/env";
import { db } from "~/server/db";

import {
	createSingleFlightByKey,
	FavoriteMovieNotSetError,
	type LockedMovieFactState,
	MovieFactUnavailableError,
	RECENT_MOVIE_FACT_LIMIT,
	type ResolvedMovieFact,
	resolveMovieFactForLockedUser,
} from "./core";

const OPENAI_FACT_MODEL = "gpt-4o-mini";
const OPENAI_MAX_OUTPUT_TOKENS = 120;
const OPENAI_TEMPERATURE = 1.1;
const OPENAI_TIMEOUT_MS = 10_000;
const OPENAI_RETRY_DELAYS_MS = [250, 750, 1_500];
const runSingleFlightMovieFactRefresh =
	createSingleFlightByKey<ResolvedMovieFact>();

type SerializedMovieFact = {
	createdAt: string;
	fact: string;
	movieTitle: string;
	source: ResolvedMovieFact["source"];
};

type OpenAIResponsesApiResult = {
	output?: Array<{
		content?: Array<{
			text?: string;
			type?: string;
		}>;
	}>;
	output_text?: string;
};

function delay(milliseconds: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

function extractOpenAIText(result: OpenAIResponsesApiResult) {
	if (typeof result.output_text === "string" && result.output_text.trim()) {
		return result.output_text.trim();
	}

	for (const item of result.output ?? []) {
		for (const contentPart of item.content ?? []) {
			if (contentPart.type === "output_text" && contentPart.text?.trim()) {
				return contentPart.text.trim();
			}
		}
	}

	throw new MovieFactUnavailableError();
}

async function generateMovieFact(movieTitle: string, recentFacts: string[]) {
	const recentFactsPrompt = recentFacts.length
		? `Avoid repeating or closely paraphrasing any of these recent facts:\n${recentFacts
				.slice(0, RECENT_MOVIE_FACT_LIMIT)
				.map((recentFact, index) => `${index + 1}. ${recentFact}`)
				.join("\n")}`
		: "No recent facts have been generated for this movie yet.";

	for (const [attemptIndex, retryDelayMs] of OPENAI_RETRY_DELAYS_MS.entries()) {
		const abortController = new AbortController();
		const timeoutId = setTimeout(
			() => abortController.abort(),
			OPENAI_TIMEOUT_MS,
		);

		try {
			const response = await fetch("https://api.openai.com/v1/responses", {
				method: "POST",
				headers: {
					authorization: `Bearer ${env.OPENAI_API_KEY}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					input: [
						{
							content: [
								{
									text: "Write exactly one concise, accurate movie trivia fact. Output only the fact. Do not mention spoilers, uncertainty, or the prompt. Keep it under 500 characters.",
									type: "input_text",
								},
							],
							role: "system",
						},
						{
							content: [
								{
									text: `Movie title: ${movieTitle}\n\n${recentFactsPrompt}`,
									type: "input_text",
								},
							],
							role: "user",
						},
					],
					max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
					model: OPENAI_FACT_MODEL,
					temperature: OPENAI_TEMPERATURE,
				}),
				signal: abortController.signal,
			});

			if (!response.ok) {
				if (
					(response.status === 429 || response.status >= 500) &&
					attemptIndex < OPENAI_RETRY_DELAYS_MS.length - 1
				) {
					await delay(retryDelayMs);
					continue;
				}

				throw new MovieFactUnavailableError();
			}

			return extractOpenAIText(
				(await response.json()) as OpenAIResponsesApiResult,
			);
		} catch (error) {
			if (attemptIndex < OPENAI_RETRY_DELAYS_MS.length - 1) {
				await delay(retryDelayMs);
				continue;
			}

			throw error instanceof MovieFactUnavailableError
				? error
				: new MovieFactUnavailableError();
		} finally {
			clearTimeout(timeoutId);
		}
	}

	throw new MovieFactUnavailableError();
}

async function withLockedMovieFactState<T>(
	userId: string,
	callback: (state: LockedMovieFactState) => Promise<T>,
) {
	return db.$transaction(async (transaction) => {
		await transaction.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

		const user = await transaction.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				trustedTitle: true,
			},
		});

		if (!user) {
			throw new Error("Authenticated user was not found.");
		}

		const recentFacts = user.trustedTitle
			? await transaction.movieFact.findMany({
					orderBy: {
						createdAt: "desc",
					},
					take: RECENT_MOVIE_FACT_LIMIT,
					where: {
						movieTitle: user.trustedTitle,
						userId: user.id,
					},
				})
			: [];

		return callback({
			recentFacts,
			movieTitle: user.trustedTitle,
			saveFact: async (fact) => {
				if (!user.trustedTitle) {
					throw new FavoriteMovieNotSetError();
				}

				const createdFact = await transaction.movieFact.create({
					data: {
						fact,
						movieTitle: user.trustedTitle,
						userId: user.id,
					},
				});

				return createdFact;
			},
			userId: user.id,
		});
	});
}

export async function getMovieFactForUser(
	userId: string,
	options: {
		forceRefresh?: boolean;
		requestReceivedAt?: Date;
	} = {},
) {
	const loadMovieFact = () =>
		withLockedMovieFactState(userId, (state) =>
			resolveMovieFactForLockedUser(state, options, generateMovieFact),
		);

	if (options.forceRefresh) {
		return runSingleFlightMovieFactRefresh(userId, loadMovieFact);
	}

	return loadMovieFact();
}

export function serializeMovieFactResult(
	result: ResolvedMovieFact,
): SerializedMovieFact {
	return {
		createdAt: result.createdAt.toISOString(),
		fact: result.fact,
		movieTitle: result.movieTitle,
		source: result.source,
	};
}

export function getMovieFactErrorMessage(error: unknown) {
	if (error instanceof FavoriteMovieNotSetError) {
		return "Pick a favorite movie before generating facts.";
	}

	if (error instanceof MovieFactUnavailableError) {
		return "Movie facts are temporarily unavailable. Try again in a moment.";
	}

	return "Something went wrong while loading your movie fact.";
}
