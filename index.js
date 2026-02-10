module.exports = {
	nodeClasses: {
		Bluesky: require('./dist/nodes/Bluesky/Bluesky.node').Bluesky,
		BlueskyTrigger: require('./dist/nodes/BlueskyTrigger/BlueskyTrigger.node').BlueskyTrigger,
	},
	credentialClasses: {
		BlueskyApi: require('./dist/credentials/BlueskyApi.credentials').BlueskyApi,
	},
};
