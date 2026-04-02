import { redirect } from "next/navigation";
import { getCurrentUser } from "~/server/auth/user";
import { SignInButton } from "./auth-button";

export default async function HomePage() {
	const user = await getCurrentUser();

	if (user?.favoriteMovie) {
		redirect("/dashboard");
	}

	if (user) {
		redirect("/onboard");
	}

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<div className="flex max-w-xl flex-col items-center gap-6 px-6 text-center">
				<p className="text-sm text-white/55 uppercase tracking-[0.3em]">
					MovieFax
				</p>
				<h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
					Track your favorite movie and get a fresh fact on demand.
				</h1>
				<p className="text-base text-white/75 leading-7 sm:text-lg">
					Sign in with Google to save your favorite movie and unlock your
					personal dashboard.
				</p>
				<SignInButton />
			</div>
		</main>
	);
}
