import { Hono } from 'hono'
import { getSpotifyTrack, getSpotifyToken } from './lib/spotify'
import { getCorsHeaders, getNextDayOfWeek, validateDateFormat } from './utils'
import db, { hot100 } from './lib/postgres'
import { sql } from 'drizzle-orm'
import { SpotifyTrack } from './lib/spotify.js'

const yeast = require('yeast')

type TrackResult = {
	spotifyId: string | null
	title: string
	artist: string
	weeksOnChart: number
	index: number
}

type ChartEntry = {
	title: string
	performer: string
	chartWeek: string
	currentWeek: string
	lastWeek: string
	peakPos: string
	weeksOnChart: string
}

const CORS_ORIGIN_WHITELIST = [
	process.env.PRODUCTION_ORIGIN || '',
	process.env.PRODUCTION_ORIGIN_SUBDOMAIN || '',
	process.env.STAGING_ORIGIN || '',
	process.env.STAGING_ORIGIN_SUBDOMAIN || ''
]

if (CORS_ORIGIN_WHITELIST.some(origin => origin.length === 0)) {
	throw new Error('Failed to find CORS origins in environment variables')
}

const app = new Hono()

app.onError(async (error, c) => {
	console.log(`Error: ${error.message}`)
	return c.text(`Server Error: ${error.message}`, 500)
})

app.get('/', async c => {
	return c.text('Welcome to Song Charts API!')
})

app.options('*', async c => {
	const origin = c.req.header('origin')

	return c.body(
		'Departed',
		200,
		getCorsHeaders(CORS_ORIGIN_WHITELIST, origin)
	)
})

app.get('/top-tracks', async c => {
	const nonce = yeast()
	const date = c.req.query('date')
	const limit = c.req.query('limit')
	const origin = c.req.header('origin')
	const corsHeaders = getCorsHeaders(CORS_ORIGIN_WHITELIST, origin)

	if (!date) {
		console.log(`[${nonce}] Date is required`)
		return c.json({ error: 'Date is required' }, 400, corsHeaders)
	}

	if (!limit) {
		console.log(`[${nonce}] Limit is required`)
		return c.json({ error: 'Limit is required' }, 400, corsHeaders)
	}

	console.time('Request response time')

	// date format YYYY-MM-DD
	const formattedDate = new Date(date).toISOString().split('T')[0]
	console.log(formattedDate)
	const isValidDate = validateDateFormat(formattedDate)

	if (!formattedDate || !isValidDate) {
		console.log(`[${nonce}] Invalid date format`)
		return c.json({ error: 'Invalid date format' }, 400, corsHeaders)
	}

	// move to nearest Saturday. We only want to use this date
	// for the lookup, the actual date is still returned in
	// the response
	const queriedDate = new Date(formattedDate)
	const nextSaturday = getNextDayOfWeek(queriedDate, 6)
	const nextSaturdayFormatted = nextSaturday.toISOString().split('T')[0]

	console.log(
		`[${nonce}] Queried date: ${formattedDate} Query Saturday: ${nextSaturdayFormatted}`
	)

	console.log(
		`[${nonce}] Fetching top tracks for ${nextSaturdayFormatted} with limit ${limit}`
	)

	const queryTimeNow = performance.now()
	const songs: ChartEntry[] = await db
		.select()
		.from(hot100)
		.limit(Number(limit))
		.where(sql`${hot100.chartWeek} = ${nextSaturdayFormatted}`)
	const queryTime = performance.now() - queryTimeNow

	if (songs.length === 0) {
		console.log(`[${nonce}] No songs found for ${nextSaturdayFormatted}`)
		return c.json({ error: 'No songs found' }, 404, corsHeaders)
	}

	console.log(`[${nonce}] Queried db in ${queryTime}ms`)

	const token = await getSpotifyToken()
	const spotifyIds: (SpotifyTrack | null)[] = await Promise.all(
		songs.map(song =>
      getSpotifyTrack(
        token,
				`${song.title} ${song.performer}`,
				song.title,
				song.performer
			)
		)
	)

	const songResults: TrackResult[] = songs.map(
		({ title, performer, weeksOnChart }, index) => {
			const spotifyId =
				spotifyIds.find(
					track => track?.queryKey === `${title} ${performer}`
				)?.id ?? null
			return {
				index,
				title,
				artist: performer,
				weeksOnChart:
					weeksOnChart === 'NA' ? 0 : parseInt(weeksOnChart),
				spotifyId: spotifyId
			}
		}
	)

	console.log(`[${nonce}] Returning ${songResults.length} songs`)

	console.timeEnd('Request response time')

	return c.json({ date, limit, songs: songResults }, 200, corsHeaders)
})

export default {
	port: 3000,
	fetch: app.fetch
}

export { TrackResult }
