"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { findTrustedMovieById } from "~/server/movies/omdb";

const submittedMovieIdSchema = z
	.string()
	.trim()
	.regex(/^tt\d+$/);

export async function saveFavoriteMovie(formData: FormData) {
	const session = await auth();

	if (!session?.user.id) {
		redirect("/");
	}

	const submittedMovieId = formData.get("submittedMovieId");
	const parsedSubmittedMovieId =
		submittedMovieIdSchema.safeParse(submittedMovieId);

	if (!parsedSubmittedMovieId.success) {
		redirect("/onboard?error=selection");
	}

	const trustedMovie = await findTrustedMovieById(parsedSubmittedMovieId.data);

	if (!trustedMovie) {
		redirect("/onboard?error=selection");
	}

	await db.user.update({
		where: { id: session.user.id },
		data: {
			trustedTitle: trustedMovie.trustedTitle,
			trustedImdbId: trustedMovie.trustedImdbId,
		},
	});

	redirect("/dashboard");
}
