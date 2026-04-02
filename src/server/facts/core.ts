export const FACT_CACHE_MS = 60_000;
export const FACT_MAX_CHARS = 500;
export const RECENT_MOVIE_FACT_LIMIT = 5;

export type StoredMovieFact = {
	createdAt: Date;
	fact: string;
	id: string;
	movieTitle: string;
	userId: string;
};

export type ResolvedMovieFact = StoredMovieFact & {
	source: "cache" | "fallback" | "fresh";
};

export type LockedMovieFactState = {
	recentFacts: StoredMovieFact[];
	movieTitle: string | null;
	saveFact: (fact: string) => Promise<StoredMovieFact>;
	userId: string;
};

export class FavoriteMovieNotSetError extends Error {
	constructor() {
		super("Favorite movie has not been set.");
		this.name = "FavoriteMovieNotSetError";
	}
}

export class MovieFactUnavailableError extends Error {
	constructor() {
		super("Movie fact is unavailable.");
		this.name = "MovieFactUnavailableError";
	}
}

export function createSingleFlightByKey<T>() {
	const inFlight = new Map<string, Promise<T>>();

	return (key: string, work: () => Promise<T>) => {
		const existingWork = inFlight.get(key);

		if (existingWork) {
			return existingWork;
		}

		const pendingWork = work().finally(() => {
			if (inFlight.get(key) === pendingWork) {
				inFlight.delete(key);
			}
		});

		inFlight.set(key, pendingWork);
		return pendingWork;
	};
}

function compactWhitespace(value: string) {
	return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function normalizeMovieFact(fact: string) {
	const normalizedFact = compactWhitespace(fact);

	if (normalizedFact.length <= FACT_MAX_CHARS) {
		return normalizedFact;
	}

	return `${normalizedFact.slice(0, FACT_MAX_CHARS - 3).trimEnd()}...`;
}

function isReusableFact(
	state: LockedMovieFactState,
	now: Date,
	latestFact: StoredMovieFact | null,
) {
	if (!latestFact) {
		return false;
	}

	if (latestFact.userId !== state.userId) {
		return false;
	}

	if (!state.movieTitle || latestFact.movieTitle !== state.movieTitle) {
		return false;
	}

	return now.getTime() - latestFact.createdAt.getTime() < FACT_CACHE_MS;
}

function getRelevantRecentFacts(state: LockedMovieFactState) {
	if (!state.movieTitle) {
		return [];
	}

	return state.recentFacts.filter(
		(recentFact) =>
			recentFact.userId === state.userId &&
			recentFact.movieTitle === state.movieTitle,
	);
}

export async function resolveMovieFactForLockedUser(
	state: LockedMovieFactState,
	options: {
		forceRefresh?: boolean;
		now?: Date;
		requestReceivedAt?: Date;
	},
	generateFact: (movieTitle: string, recentFacts: string[]) => Promise<string>,
): Promise<ResolvedMovieFact> {
	if (!state.movieTitle) {
		throw new FavoriteMovieNotSetError();
	}

	const now = options.now ?? new Date();
	const relevantRecentFacts = getRelevantRecentFacts(state);
	const latestFact = relevantRecentFacts[0] ?? null;
	const reusableFact = latestFact;

	if (
		options.forceRefresh &&
		reusableFact &&
		options.requestReceivedAt &&
		reusableFact.createdAt.getTime() >= options.requestReceivedAt.getTime()
	) {
		return {
			...reusableFact,
			source: "cache",
		};
	}

	if (
		!options.forceRefresh &&
		reusableFact &&
		isReusableFact(state, now, reusableFact)
	) {
		return {
			...reusableFact,
			source: "cache",
		};
	}

	try {
		const generatedFact = normalizeMovieFact(
			await generateFact(
				state.movieTitle,
				relevantRecentFacts.map((recentFact) => recentFact.fact),
			),
		);
		const savedFact = await state.saveFact(generatedFact);

		return {
			...savedFact,
			source: "fresh",
		};
	} catch (error) {
		if (latestFact) {
			return {
				...latestFact,
				source: "fallback",
			};
		}

		throw error instanceof MovieFactUnavailableError
			? error
			: new MovieFactUnavailableError();
	}
}
