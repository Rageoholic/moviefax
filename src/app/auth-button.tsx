"use client";

import * as auth from "next-auth/react";

const buttonClassName =
	"rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20";

export function SignOutButton() {
	return (
		<button
			className={buttonClassName}
			onClick={() => auth.signOut()}
			type="button"
		>
			Sign out
		</button>
	);
}

export function SignInButton() {
	return (
		<button
			className={buttonClassName}
			onClick={() => auth.signIn()}
			type="button"
		>
			Sign in
		</button>
	);
}
