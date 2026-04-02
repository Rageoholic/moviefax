import { db } from "~/server/db";

import { auth } from ".";

export async function getCurrentUser() {
	const session = await auth();

	if (!session?.user.id) {
		return null;
	}

	const user = await db.user.findUnique({
		where: { id: session.user.id },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			trustedTitle: true,
			trustedImdbId: true,
		},
	});

	if (!user) {
		return null;
	}

	return {
		email: user.email,
		id: user.id,
		image: user.image,
		movieId: user.trustedImdbId,
		movieTitle: user.trustedTitle,
		name: user.name,
	};
}
