import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "~/server/auth/user";
import {
	getMovieFactErrorMessage,
	getMovieFactForUser,
	serializeMovieFactResult,
} from "~/server/facts/service";
import { SignOutButton } from "../auth-button";
import { MovieFactPanel } from "./movie-fact-panel";
import { UserAvatar } from "./user-avatar";

export default async function DashboardPage() {
	const user = await getCurrentUser();
	let initialFact = null;
	let initialFactError = null;

	if (!user) {
		redirect("/");
	}

	if (!user.movieTitle) {
		redirect("/onboard");
	}

	try {
		initialFact = serializeMovieFactResult(
			await getMovieFactForUser(user.id, { forceRefresh: false }),
		);
	} catch (error) {
		initialFactError = getMovieFactErrorMessage(error);
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] px-6 text-white">
			<div className="flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/25 backdrop-blur">
				<div className="flex items-start justify-between gap-4">
					<UserAvatar name={user.name} src={user.image} />
					<div className="space-y-3">
						<p className="text-sm text-white/55 uppercase tracking-[0.3em]">
							Dashboard
						</p>
						<h1 className="font-semibold text-3xl tracking-tight">
							Welcome back{user.name ? `, ${user.name}` : ""}
						</h1>
						<p className="text-sm text-white/75 leading-6">
							Your saved movie is ready for the next step of the app.
						</p>
					</div>
					<SignOutButton />
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<section className="rounded-2xl border border-white/10 bg-black/20 p-5">
						<p className="text-white/50 text-xs uppercase tracking-[0.2em]">
							Name
						</p>
						<p className="mt-2 font-medium text-lg text-white">
							{user.name ?? "Unknown user"}
						</p>
					</section>
					<section className="rounded-2xl border border-white/10 bg-black/20 p-5">
						<p className="text-white/50 text-xs uppercase tracking-[0.2em]">
							Email
						</p>
						<p className="mt-2 font-medium text-lg text-white">
							{user.email ?? "No email available"}
						</p>
					</section>
					<section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:col-span-2">
						<p className="text-white/50 text-xs uppercase tracking-[0.2em]">
							Favorite movie
						</p>
						<p className="mt-2 font-semibold text-2xl text-white">
							{user.movieTitle}
						</p>
						<Link
							className="mt-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 font-medium text-sm text-white transition hover:bg-white/20"
							href="/edit-favorite"
						>
							Change favorite movie
						</Link>
					</section>
				</div>

				<MovieFactPanel
					initialError={initialFactError}
					initialFact={initialFact}
					movieTitle={user.movieTitle}
				/>
			</div>
		</main>
	);
}
