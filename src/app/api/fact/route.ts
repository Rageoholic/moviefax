import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import {
	getMovieFactErrorMessage,
	getMovieFactForUser,
	serializeMovieFactResult,
} from "~/server/facts/service";

function getErrorStatus(errorMessage: string) {
	if (errorMessage === "Pick a favorite movie before generating facts.") {
		return 409;
	}

	if (
		errorMessage ===
		"Movie facts are temporarily unavailable. Try again in a moment."
	) {
		return 503;
	}

	return 500;
}

async function loadMovieFact(forceRefresh: boolean) {
	const requestReceivedAt = new Date();
	const session = await auth();

	if (!session?.user.id) {
		return NextResponse.json(
			{ error: "Authentication is required." },
			{ status: 401 },
		);
	}

	try {
		const movieFact = await getMovieFactForUser(session.user.id, {
			forceRefresh,
			requestReceivedAt,
		});

		return NextResponse.json(serializeMovieFactResult(movieFact));
	} catch (error) {
		const errorMessage = getMovieFactErrorMessage(error);

		return NextResponse.json(
			{ error: errorMessage },
			{ status: getErrorStatus(errorMessage) },
		);
	}
}

export async function GET() {
	return loadMovieFact(false);
}

export async function POST() {
	return loadMovieFact(true);
}
