"use client";

import { useRef, useState } from "react";

type SerializedMovieFact = {
	createdAt: string;
	fact: string;
	movieTitle: string;
	source: "cache" | "fallback" | "fresh";
};

type MovieFactPanelProps = {
	initialError: string | null;
	initialFact: SerializedMovieFact | null;
	movieTitle: string;
};

function isMovieFactResponse(
	responseBody: SerializedMovieFact | { error?: string },
): responseBody is SerializedMovieFact {
	return "fact" in responseBody;
}

function formatSourceLabel(source: SerializedMovieFact["source"]) {
	if (source === "cache") {
		return "Reused from the 60 second cache";
	}

	if (source === "fallback") {
		return "Showing the last saved fact after a refresh failed";
	}

	return "Generated just now";
}

export function MovieFactPanel({
	initialError,
	initialFact,
	movieTitle,
}: MovieFactPanelProps) {
	const [movieFact, setMovieFact] = useState(initialFact);
	const [error, setError] = useState(initialError);
	const [isGenerating, setIsGenerating] = useState(false);
	const requestInFlightRef = useRef(false);

	function regenerateFact() {
		if (requestInFlightRef.current) {
			return;
		}

		requestInFlightRef.current = true;
		setIsGenerating(true);

		void (async () => {
			try {
				setError(null);

				const response = await fetch("/api/fact", {
					cache: "no-store",
					headers: {
						accept: "application/json",
					},
					method: "POST",
				});

				const responseBody = (await response.json()) as
					| SerializedMovieFact
					| { error?: string };

				if (!response.ok || !isMovieFactResponse(responseBody)) {
					setError(
						("error" in responseBody ? responseBody.error : undefined) ??
							"Something went wrong while loading your movie fact.",
					);
					return;
				}

				setMovieFact(responseBody);
			} finally {
				requestInFlightRef.current = false;
				setIsGenerating(false);
			}
		})();
	}

	return (
		<section className="rounded-2xl border border-white/10 bg-black/20 p-5">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-2">
					<p className="text-white/50 text-xs uppercase tracking-[0.2em]">
						Movie fact
					</p>
					<h2 className="font-semibold text-2xl text-white">{movieTitle}</h2>
					<p className="max-w-2xl text-sm text-white/70 leading-6">
						{movieFact?.fact ??
							error ??
							"Generate a fact to learn something new about your favorite movie."}
					</p>
					{movieFact ? (
						<p className="text-white/50 text-xs">
							{formatSourceLabel(movieFact.source)}. Updated{" "}
							{new Date(movieFact.createdAt).toLocaleTimeString()}.
						</p>
					) : null}
					{error ? <p className="text-red-200 text-sm">{error}</p> : null}
				</div>

				<button
					className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-medium text-sm text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={isGenerating}
					onClick={regenerateFact}
					type="button"
				>
					{isGenerating
						? "Generating..."
						: movieFact
							? "Regenerate fact"
							: "Generate fact"}
				</button>
			</div>
		</section>
	);
}
