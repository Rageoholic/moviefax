import { env } from "~/env";

type OmdbSearchMovie = {
	Title: string;
	Year: string;
	imdbID: string;
	Type: string;
};

type OmdbSearchResponse =
	| {
			Response: "True";
			Search: OmdbSearchMovie[];
	  }
	| {
			Error: string;
			Response: "False";
	  };

type OmdbTitleResponse =
	| {
			Response: "True";
			Title: string;
			Type: string;
			imdbID: string;
	  }
	| {
			Error: string;
			Response: "False";
	  };

function normalizeMovieTitle(title: string) {
	return title.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

async function fetchOmdb<T>(searchParams: Record<string, string>) {
	const requestUrl = new URL("https://www.omdbapi.com/");

	requestUrl.searchParams.set("apikey", env.OMDB_API_KEY);

	for (const [key, value] of Object.entries(searchParams)) {
		requestUrl.searchParams.set(key, value);
	}

	const response = await fetch(requestUrl, {
		cache: "no-store",
		headers: {
			accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`OMDb lookup failed with status ${response.status}`);
	}

	return (await response.json()) as T;
}

export async function findTrustedMovieByTitle(movieTitle: string) {
	const searchResults = await searchMoviesByTitle(movieTitle);
	const normalizedQuery = normalizeMovieTitle(movieTitle);

	const exactMatch = searchResults.find(
		(movie) => normalizeMovieTitle(movie.title) === normalizedQuery,
	);

	const candidate =
		exactMatch ?? (searchResults.length === 1 ? searchResults[0] : null);

	if (!candidate) {
		return null;
	}

	return findTrustedMovieById(candidate.movieId);
}

export async function searchMoviesByTitle(movieTitle: string) {
	const normalizedQuery = normalizeMovieTitle(movieTitle);
	const searchResult = await fetchOmdb<OmdbSearchResponse>({
		s: movieTitle,
		type: "movie",
	});

	if (searchResult.Response === "False") {
		return [];
	}

	return searchResult.Search.filter((movie) => movie.Type === "movie")
		.map((movie) => ({
			movieId: movie.imdbID,
			title: movie.Title,
			year: movie.Year,
			isExactMatch: normalizeMovieTitle(movie.Title) === normalizedQuery,
		}))
		.sort(
			(left, right) => Number(right.isExactMatch) - Number(left.isExactMatch),
		);
}

export async function findTrustedMovieById(movieId: string) {
	const titleResult = await fetchOmdb<OmdbTitleResponse>({
		i: movieId,
	});

	if (titleResult.Response === "False" || titleResult.Type !== "movie") {
		return null;
	}

	return {
		trustedImdbId: titleResult.imdbID,
		trustedTitle: titleResult.Title.trim(),
	};
}
