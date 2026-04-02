import { describe, expect, it, vi } from "vitest";

import {
	FavoriteMovieSelectionError,
	updateFavoriteMovieSelection,
} from "./favorite-core";

describe("updateFavoriteMovieSelection", () => {
	it("rejects malformed movie ids", async () => {
		await expect(
			updateFavoriteMovieSelection({
				findMovieById: vi.fn(async () => null),
				saveMovie: vi.fn(async () => undefined),
				submittedMovieId: "not-an-imdb-id",
				userId: "user-1",
			}),
		).rejects.toBeInstanceOf(FavoriteMovieSelectionError);
	});

	it("rejects selections that cannot be validated", async () => {
		const findMovieById = vi.fn(async () => null);

		await expect(
			updateFavoriteMovieSelection({
				findMovieById,
				saveMovie: vi.fn(async () => undefined),
				submittedMovieId: "tt0133093",
				userId: "user-1",
			}),
		).rejects.toBeInstanceOf(FavoriteMovieSelectionError);

		expect(findMovieById).toHaveBeenCalledWith("tt0133093");
	});

	it("saves the trusted movie for the user", async () => {
		const saveMovie = vi.fn(async () => undefined);

		const result = await updateFavoriteMovieSelection({
			findMovieById: vi.fn(async () => ({
				trustedImdbId: "tt0133093",
				trustedTitle: "The Matrix",
			})),
			saveMovie,
			submittedMovieId: "tt0133093",
			userId: "user-1",
		});

		expect(result).toEqual({
			trustedImdbId: "tt0133093",
			trustedTitle: "The Matrix",
		});
		expect(saveMovie).toHaveBeenCalledWith({
			trustedImdbId: "tt0133093",
			trustedTitle: "The Matrix",
			userId: "user-1",
		});
	});
});
