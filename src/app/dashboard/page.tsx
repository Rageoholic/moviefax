import { redirect } from "next/navigation";
import { getCurrentUser } from "~/server/auth/user";
import { SignOutButton } from "../auth-button";

export default async function DashboardPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/");
	}

	if (!user.favoriteMovie) {
		redirect("/onboard");
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] px-6 text-white">
			<div className="flex w-full max-w-2xl flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/25 backdrop-blur">
				<div className="flex items-start justify-between gap-4">
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
							{user.favoriteMovie}
						</p>
					</section>
				</div>
			</div>
		</main>
	);
}
