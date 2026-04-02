"use server";

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function saveFavoriteMovie(formData: FormData) {
	const session = await auth();

	if (!session?.user.id) {
		redirect("/");
	}

	const favoriteMovie = formData.get("favoriteMovie");
	const normalizedFavoriteMovie =
		typeof favoriteMovie === "string" ? favoriteMovie.trim() : "";

	if (!normalizedFavoriteMovie) {
		redirect("/onboard");
	}

	await db.user.update({
		where: { id: session.user.id },
		data: { favoriteMovie: normalizedFavoriteMovie },
	});

	redirect("/dashboard");
}
