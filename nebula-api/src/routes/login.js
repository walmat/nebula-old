const NEBULA_API_DISCORD_ID = process.env.NEBULA_API_DISCORD_ID;
const NEBULA_API_DISCORD_SECRET = process.env.NEBULA_API_DISCORD_SECRET;
const redirect = encodeURIComponent('http://localhost:8080/api/discord/callback');

module.exports = async function(app) {
    app.get('/login', async function(req, res) {
		// redirect the user to discord to get an auth token and user information so we can look at the discord uid
		res.status(200).json({
			authURL: `https://discordapp.com/oauth2/authorize?client_id=${NEBULA_API_DISCORD_ID}&scope=identify&response_type=code&redirect_uri=${redirect}`
		});
	});
};