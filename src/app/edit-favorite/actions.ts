"use server";

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
	FavoriteMovieSelectionError,
	updateFavoriteMovieSelection,
} from "~/server/movies/favorite-core";
import { findTrustedMovieById } from "~/server/movies/omdb";

export async function updateFavoriteMovie(formData: FormData) {
	const session = await auth();

	if (!session?.user.id) {
		redirect("/");
	}

	try {
		await updateFavoriteMovieSelection({
			findMovieById: findTrustedMovieById,
			saveMovie: async ({ trustedImdbId, trustedTitle, userId }) => {
				await db.user.update({
					where: { id: userId },
					data: {
						trustedImdbId,
						trustedTitle,
					},
				});
			},
			submittedMovieId: formData.get("submittedMovieId"),
			userId: session.user.id,
		});
	} catch (error) {
		if (error instanceof FavoriteMovieSelectionError) {
			redirect("/edit-favorite?error=selection");
		}

		throw error;
	}

	redirect("/dashboard");
}
