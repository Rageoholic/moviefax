import { db } from "~/server/db";

import { auth } from ".";

export async function getCurrentUser() {
	const session = await auth();

	if (!session?.user.id) {
		return null;
	}

	return db.user.findUnique({
		where: { id: session.user.id },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			favoriteMovie: true,
		},
	});
}
