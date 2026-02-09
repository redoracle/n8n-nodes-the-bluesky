module.exports = {
	nodeClasses: {
		Bluesky: require('./dist/nodes/Bluesky/Bluesky.node').Bluesky,
	},
	credentialClasses: {
		BlueskyApi: require('./dist/credentials/BlueskyApi.credentials').BlueskyApi,
	},
};
