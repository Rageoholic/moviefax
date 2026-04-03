"use client";

import Image from "next/image";
import { useState } from "react";

interface UserAvatarProps {
	name: string | null;
	src: string | null;
}

export function UserAvatar({ name, src }: UserAvatarProps) {
	const [imgFailed, setImgFailed] = useState(false);

	if (src && !imgFailed) {
		return (
			<Image
				alt={name ? `${name}'s profile picture` : "Profile picture"}
				className="h-12 w-12 flex-none rounded-full border border-white/20 object-cover"
				height={48}
				onError={() => setImgFailed(true)}
				src={src}
				width={48}
			/>
		);
	}

	return (
		<div
			aria-hidden="true"
			className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-white/20 bg-white/10 font-semibold text-lg text-white"
		>
			{name ? name[0]?.toUpperCase() : "?"}
		</div>
	);
}
