import { z } from "zod";

const submittedMovieIdSchema = z
	.string()
	.trim()
	.regex(/^tt\d+$/);

type TrustedMovie = {
	trustedImdbId: string;
	trustedTitle: string;
};

export class FavoriteMovieSelectionError extends Error {
	constructor() {
		super("Favorite movie selection is invalid.");
		this.name = "FavoriteMovieSelectionError";
	}
}

export async function updateFavoriteMovieSelection({
	findMovieById,
	saveMovie,
	submittedMovieId,
	userId,
}: {
	findMovieById: (movieId: string) => Promise<TrustedMovie | null>;
	saveMovie: (input: { userId: string } & TrustedMovie) => Promise<void>;
	submittedMovieId: FormDataEntryValue | null;
	userId: string;
}) {
	const parsedSubmittedMovieId =
		submittedMovieIdSchema.safeParse(submittedMovieId);

	if (!parsedSubmittedMovieId.success) {
		throw new FavoriteMovieSelectionError();
	}

	const trustedMovie = await findMovieById(parsedSubmittedMovieId.data);

	if (!trustedMovie) {
		throw new FavoriteMovieSelectionError();
	}

	await saveMovie({
		...trustedMovie,
		userId,
	});

	return trustedMovie;
}
