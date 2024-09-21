function levenshtein_fast(a, b) {
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	let matrix = [];

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}

	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) == a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1
				);
			}
		}
	}

	return matrix[b.length][a.length];
};

let levenstein_cache = new Map();

function levenstein_cached(x, y) {
	if (x > y) [x, y] = [y, x];

	if (!levenstein_cache.has(x)) levenstein_cache.set(x, new Map());

	if (levenstein_cache.get(x).has(y))	{
		return levenstein_cache.get(x).get(y);
	} else {
		const value = levenshtein_fast(x, y);

		levenstein_cache.get(x).set(y, value);

		return value;
	}
}

export const calc_distance = (x, y) => levenstein_cached(x, y);
