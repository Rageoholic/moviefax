import { describe, expect, it, vi } from "vitest";

import {
	createSingleFlightByKey,
	FACT_CACHE_MS,
	FavoriteMovieNotSetError,
	type LockedMovieFactState,
	resolveMovieFactForLockedUser,
	type StoredMovieFact,
} from "./core";

function createState(
	overrides: Partial<LockedMovieFactState> = {},
): LockedMovieFactState {
	return {
		movieTitle: "Mad Max: Fury Road",
		recentFacts: [],
		saveFact: vi.fn(async (fact: string) => ({
			createdAt: new Date("2026-04-02T12:00:00.000Z"),
			fact,
			id: "fact-new",
			movieTitle: "Mad Max: Fury Road",
			userId: "user-1",
		})),
		userId: "user-1",
		...overrides,
	};
}

function createFact(overrides: Partial<StoredMovieFact> = {}): StoredMovieFact {
	return {
		createdAt: new Date("2026-04-02T12:00:00.000Z"),
		fact: "Charlize Theron shaved her head for the role.",
		id: "fact-1",
		movieTitle: "Mad Max: Fury Road",
		userId: "user-1",
		...overrides,
	};
}

describe("resolveMovieFactForLockedUser", () => {
	it("coalesces concurrent work for the same key", async () => {
		const deferred = {
			resolve: ((_value: string) => {
				throw new Error("Resolver was not initialized.");
			}) as (value: string) => void,
		};
		const runSingleFlight = createSingleFlightByKey<string>();
		const work = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					deferred.resolve = resolve;
				}),
		);

		const firstCall = runSingleFlight("user-1", work);
		const secondCall = runSingleFlight("user-1", work);

		expect(firstCall).toBe(secondCall);
		expect(work).toHaveBeenCalledOnce();

		deferred.resolve("fact");

		await expect(firstCall).resolves.toBe("fact");
		await expect(secondCall).resolves.toBe("fact");
	});

	it("clears single-flight state after work settles", async () => {
		const runSingleFlight = createSingleFlightByKey<string>();
		const work = vi
			.fn<() => Promise<string>>()
			.mockResolvedValueOnce("first")
			.mockResolvedValueOnce("second");

		await expect(runSingleFlight("user-1", work)).resolves.toBe("first");
		await expect(runSingleFlight("user-1", work)).resolves.toBe("second");

		expect(work).toHaveBeenCalledTimes(2);
	});

	it("reuses a recent cached fact within 60 seconds", async () => {
		const latestFact = createFact();
		const state = createState({ recentFacts: [latestFact] });
		const generateFact = vi.fn(async () => "unused");

		const result = await resolveMovieFactForLockedUser(
			state,
			{
				now: new Date(latestFact.createdAt.getTime() + FACT_CACHE_MS - 1),
			},
			generateFact,
		);

		expect(result).toMatchObject({
			fact: latestFact.fact,
			source: "cache",
		});
		expect(generateFact).not.toHaveBeenCalled();
		expect(state.saveFact).not.toHaveBeenCalled();
	});

	it("reuses a newer completed fact for an older forced refresh request", async () => {
		const latestFact = createFact({
			createdAt: new Date("2026-04-02T12:00:05.000Z"),
		});
		const state = createState({ recentFacts: [latestFact] });
		const generateFact = vi.fn(async () => "unused");

		const result = await resolveMovieFactForLockedUser(
			state,
			{
				forceRefresh: true,
				now: new Date("2026-04-02T12:00:10.000Z"),
				requestReceivedAt: new Date("2026-04-02T12:00:00.000Z"),
			},
			generateFact,
		);

		expect(result).toMatchObject({
			fact: latestFact.fact,
			source: "cache",
		});
		expect(generateFact).not.toHaveBeenCalled();
		expect(state.saveFact).not.toHaveBeenCalled();
	});

	it("ignores a cached fact that belongs to another user", async () => {
		const state = createState({
			recentFacts: [createFact({ userId: "user-2" })],
		});
		const generateFact = vi.fn(async () => "A real fact for the current user.");

		const result = await resolveMovieFactForLockedUser(
			state,
			{ now: new Date("2026-04-02T12:00:10.000Z") },
			generateFact,
		);

		expect(generateFact).toHaveBeenCalledOnce();
		expect(result.source).toBe("fresh");
		expect(result.userId).toBe("user-1");
		expect(result.fact).toBe("A real fact for the current user.");
	});

	it("ignores cached facts for a different movie after reassignment", async () => {
		const state = createState({
			movieTitle: "The Matrix",
			recentFacts: [
				createFact({
					fact: "This fact belongs to a different movie.",
					movieTitle: "Mad Max: Fury Road",
				}),
			],
		});
		const generateFact = vi.fn(async () => "A matrix fact.");

		const result = await resolveMovieFactForLockedUser(
			state,
			{ now: new Date("2026-04-02T12:00:10.000Z") },
			generateFact,
		);

		expect(generateFact).toHaveBeenCalledWith("The Matrix", []);
		expect(result.source).toBe("fresh");
		expect(result.movieTitle).toBe("Mad Max: Fury Road");
		expect(result.fact).toBe("A matrix fact.");
	});

	it("falls back to the last saved fact when generation fails", async () => {
		const latestFact = createFact({
			createdAt: new Date("2026-04-02T11:58:00.000Z"),
		});
		const state = createState({ recentFacts: [latestFact] });
		const generateFact = vi.fn(async () => {
			throw new Error("OpenAI failed");
		});

		const result = await resolveMovieFactForLockedUser(
			state,
			{ forceRefresh: true, now: new Date("2026-04-02T12:00:10.000Z") },
			generateFact,
		);

		expect(result).toMatchObject({
			fact: latestFact.fact,
			source: "fallback",
		});
		expect(state.saveFact).not.toHaveBeenCalled();
	});

	it("fails when the user has not picked a movie yet", async () => {
		const state = createState({ movieTitle: null });

		await expect(
			resolveMovieFactForLockedUser(
				state,
				{},
				vi.fn(async () => "unused"),
			),
		).rejects.toBeInstanceOf(FavoriteMovieNotSetError);
	});

	it("passes recent fact history into generation so repeats can be avoided", async () => {
		const recentFacts = [
			createFact({
				fact: "The movie used real modified cars built for filming.",
			}),
			createFact({
				createdAt: new Date("2026-04-02T11:59:00.000Z"),
				fact: "Most of the stunts were done practically in the Namib Desert.",
			}),
		];
		const state = createState({ recentFacts });
		const generateFact = vi.fn(async () => "A different fact");

		await resolveMovieFactForLockedUser(
			state,
			{ forceRefresh: true, now: new Date("2026-04-02T12:00:10.000Z") },
			generateFact,
		);

		expect(generateFact).toHaveBeenCalledWith("Mad Max: Fury Road", [
			"The movie used real modified cars built for filming.",
			"Most of the stunts were done practically in the Namib Desert.",
		]);
	});
});
