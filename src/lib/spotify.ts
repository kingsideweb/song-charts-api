export type SpotifyTrack = {
	id: string
	queryKey: string
}

let cachedToken: string | null = null
let tokenExpiry: number = 0

export async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization:
				'Basic ' +
				Buffer.from(
					`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
				).toString('base64'),
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: 'grant_type=client_credentials'
	})

	if (!res.ok) {
		throw new Error(`Spotify auth failed: ${res.status} ${res.statusText}`)
	}

  const data = await res.json()

  cachedToken = data.access_token
  tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000)

  console.log(`Aquired new token, Expires in ${data.expires_in} Expires at ${tokenExpiry} Current ${Date.now()}`)

	return data.access_token
}

export async function getSpotifyTrack(
  token: string,
	queryKey: string,
	songName: string,
	artistName: string
): Promise<SpotifyTrack | null> {
	const query = encodeURIComponent(`${songName} ${artistName}`)
	const res = await fetch(
		`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1&market=US&offset=0`,
		{
			headers: {
				Authorization: `Bearer ${token}`
			}
		}
	)

	if (!res.ok) {
		console.error(`Spotify search failed: ${res.status} ${res.statusText}`)
		return null
	}

	const data = await res.json()

	if (!data.tracks?.items?.length) {
		console.log(`No track found for ${songName} by ${artistName}`)
		return null
	}

	const { id } = data.tracks.items[0]
	return { queryKey, id }
}
