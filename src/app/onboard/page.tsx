import { redirect } from "next/navigation";
import { getCurrentUser } from "~/server/auth/user";
import { searchMoviesByTitle } from "~/server/movies/omdb";

import { SignOutButton } from "../auth-button";
import { saveFavoriteMovie } from "./actions";

type OnboardPageProps = {
	searchParams?: Promise<{
		error?: string;
		query?: string;
	}>;
};

export default async function OnboardPage({ searchParams }: OnboardPageProps) {
	const user = await getCurrentUser();
	const resolvedSearchParams = await searchParams;
	const query = resolvedSearchParams?.query?.trim() ?? "";
	const searchResults = query ? await searchMoviesByTitle(query) : [];
	const showSelectionError = resolvedSearchParams?.error === "selection";

	if (!user) {
		redirect("/");
	}

	if (user.movieTitle) {
		redirect("/dashboard");
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] px-6 text-white">
			<div className="flex w-full max-w-lg flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/25 backdrop-blur">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-3">
						<p className="text-sm text-white/55 uppercase tracking-[0.3em]">
							Onboarding
						</p>
						<h1 className="font-semibold text-3xl tracking-tight">
							Pick your favorite movie
						</h1>
						<p className="text-sm text-white/75 leading-6">
							Search for a movie, then save the canonical OMDb match.
						</p>
					</div>
					<SignOutButton />
				</div>

				<form className="flex flex-col gap-4" method="GET">
					<label
						className="flex flex-col gap-2 text-sm text-white/80"
						htmlFor="query"
					>
						Search for your favorite movie
						<input
							className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/35 focus:border-white/40"
							defaultValue={query}
							id="query"
							name="query"
							placeholder="Mad Max: Fury Road"
							required
							type="text"
						/>
					</label>

					<button
						className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-medium text-sm text-white transition hover:bg-white/20"
						type="submit"
					>
						Search OMDb
					</button>
				</form>

				{query ? (
					<form action={saveFavoriteMovie} className="flex flex-col gap-4">
						<label
							className="flex flex-col gap-2 text-sm text-white/80"
							htmlFor="submittedMovieId"
						>
							Choose a movie match
							<select
								className="rounded-2xl border border-white/15 bg-slate-950 px-4 py-3 text-base text-white outline-none transition focus:border-white/40"
								defaultValue=""
								id="submittedMovieId"
								name="submittedMovieId"
								required
								style={{ colorScheme: "dark" }}
							>
								<option disabled value="">
									Select a movie
								</option>
								{searchResults.map((movie) => (
									<option
										className="bg-slate-950 text-white"
										key={movie.movieId}
										value={movie.movieId}
									>
										{movie.title}
										{movie.year ? ` (${movie.year})` : ""}
									</option>
								))}
							</select>
						</label>

						{searchResults.length === 0 ? (
							<p className="text-red-200 text-sm">
								No OMDb movie matches found for that search.
							</p>
						) : null}

						{showSelectionError ? (
							<p className="text-red-200 text-sm">
								The selected movie could not be validated. Search again and
								choose a valid result.
							</p>
						) : null}

						<button
							className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-medium text-sm text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={searchResults.length === 0}
							type="submit"
						>
							Save favorite movie
						</button>
					</form>
				) : null}
			</div>
		</main>
	);
}
