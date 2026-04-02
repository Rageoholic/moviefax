import { redirect } from "next/navigation";
import { getCurrentUser } from "~/server/auth/user";

import { SignOutButton } from "../auth-button";
import { saveFavoriteMovie } from "./actions";

export default async function OnboardPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/");
	}

	if (user.favoriteMovie) {
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
							We use this to personalize your dashboard after sign-in.
						</p>
					</div>
					<SignOutButton />
				</div>

				<form action={saveFavoriteMovie} className="flex flex-col gap-4">
					<label
						className="flex flex-col gap-2 text-sm text-white/80"
						htmlFor="favoriteMovie"
					>
						Favorite movie
						<input
							className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/35 focus:border-white/40"
							id="favoriteMovie"
							maxLength={120}
							name="favoriteMovie"
							placeholder="Mad Max: Fury Road"
							required
							type="text"
						/>
					</label>

					<button
						className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-medium text-sm text-white transition hover:bg-white/20"
						type="submit"
					>
						Save favorite movie
					</button>
				</form>
			</div>
		</main>
	);
}
