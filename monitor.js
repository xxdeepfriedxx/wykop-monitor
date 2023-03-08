const Wykop = import('wykop');
const assert = require('assert');
const crypto = require('crypto');

const defaultInterval = 60

let w = null
let timeoutID = null
let errorCallback = null

// Main function
exports.start = async ({ interval = defaultInterval, appkey, secret, token, rtoken, environment, username, password, debug = false }) => {

	// Setup the Wykop SDK
	console.log(`[wykop-monitor] [ ] Initializing Wykop SDK...`);
	try {
		w = new (await Wykop).default({ appkey: appkey, secret: secret, token: token, rtoken: rtoken, environment: environment });
		console.log(`[wykop-monitor] [✓] Wykop SDK Initialized`);
	} catch (error) {
		return console.log(`[wykop-monitor] [x] Failed to initialize Wykop SDK, see error below:\n`, error.stack ?? error.response ?? error.request ?? error);
	}

	if (username && password) {
		console.log(`[wykop-monitor] [ ] Username and password for Wykop.pl provided; logging in..`);
		try {
			await w.login(username, password);
			console.log(`[wykop-monitor] [✓] Login successful`);
		} catch (error) {
			return console.log(`[wykop-monitor] [x] Login failed, see error below:\n`, error.stack ?? error.response ?? error.request ?? error);
		}
	}

	if (Object.keys(contentFunctions).length === 0 && Object.keys(notificationFunctions).length === 0) {
		return console.log(`[wykop-monitor] [x] Nothing found to monitor...`);
	}

	// On the first run we check the latest posts without calling the callback();
	const timeoutFunction = async function(firstRun = false) {
		if (!firstRun && debug) { console.log(`[wykop-monitor] Checking for new content!`); }
		for (let key in contentFunctions) { await checkForContent(contentFunctions[key], firstRun) }
		for (let key in notificationFunctions) { await checkForNotifications(notificationFunctions[key], firstRun) }
	}
	
	// Save latest posts
	console.log(`[wykop-monitor] [ ] Saving latest content...`);
	try {
		await timeoutFunction(true);
		console.log(`[wykop-monitor] [✓] Latest content saved`);
	} catch (error) {
		return console.log(`[wykop-monitor] [x] Failed while trying to save the latest content, see error below:\n`, error.stack ?? error.response ?? error.request ?? error);
	}

	// Start monitoring
	console.log(`[wykop-monitor] [ ] Monitoring starting... checking every ${interval} seconds`);
	try {
		timeoutID = setInterval(timeoutFunction, interval * 1000);
		console.log(`[wykop-monitor] [✓] Monitoring started`);
	} catch (error) {
		return console.log(`[wykop-monitor] [x] Failed to start Monitoring, see error below:\n`, error.stack ?? error.response ?? error.request ?? error);
	}
}

exports.stop = () => {
	console.log(`[wykop-monitor] [ ] Stopping Monitoring...`);
	clearTimeout(timeoutID);
	console.log(`[wykop-monitor] [✓] Monitoring ended`);
}

// Latest content 'memory'
let latestIds = {}

async function checkForContent(configs, saveOnly) {
	if (configs.length === 0) { return }
	for (config of configs) {

		let latest = { items: [] }
		try {
			latest = await config.request();
		} catch (error) {
			return console.log(`[wykop-monitor] [x] Failed while trying to fetch the latest content, see error below:\n`, error.stack ?? error.response ?? error.request ?? error);
		}

		if (latest.items.length === 0) { return }
		for (post of latest.items) {
			if (saveOnly) { break }
			if (getContentId(post) <= latestIds[config.key]) { break }
			config.callback({ 
				[getPostType(post)]: post, 
				client: w
			});
		}

		if (latestIds[config.key] === undefined) { latestIds[config.key] = {} }
		latestIds[config.key] = getContentId(latest.items[0])
	}
}

async function checkForNotifications(configs, saveOnly) {
	if (configs.length === 0) { return }
	for (config of configs) {
		const latest = await config.request();
		if (latest.items.length === 0) { return }
		for (notification of latest.items) {
			if (config.filter !== undefined && !config.filter.includes(notification.type)) { break } 
			if (saveOnly) { break }
			if (getContentId(notification) <= latestIds[config.key]) { break }
			config.callback({ 
				notification: notification, 
				client: w
			});
		}

		const newestNotification = latest.items[0];
		if (latestIds[config.key] === undefined) { latestIds[config.key] = {} }
		latestIds[config.key] = getContentId(newestNotification)
	}
}

// new links
exports.links = ({ category, bucket } = {}, callback) => { 
	saveContentConfig({ 
		request: function() {
			return w.getUpcomming({
				sort: 'newest',
				category: category,
				bucket: bucket
			});
		},
		type: 'link',
		callback: callback
	});
}

// new entries
exports.entries = ({ category, bucket } = {}, callback) => { 
	saveContentConfig({ 
		request: function() {
			return w.getMicroblog({
				sort: 'newest',
				category: category,
				bucket: bucket
			});
		},
		type: 'entry',
		callback: callback
	});
}

// new link or entry in tag
exports.tags = ({ tag, type } = {}, callback) => { 
	assert(tag, `[wykop-monitor] No value specified for 'tag'`);
	saveContentConfig({ 
		request: function() {
			return w.tag(tag).getContent({
				sort: 'all',
				type: type
			})
		},
		type: 'tag',
		callback: callback
	});
}

// new link added by user
exports.userLinks = ({ username } = {}, callback) => { 
	assert(username, `[wykop-monitor] No value specified for 'username'`);
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getLinksAdded();
		},
		type: 'user-link',
		callback: callback
	});
}

// new link comments added by user
exports.userLinkComments = ({ username } = {}, callback) => { 
	assert(username, `[wykop-monitor] No value specified for 'username'`);
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getLinksCommented().items[0].comments;
		},
		type: 'user-link-comment',
		callback: callback
	});
}

// new link upvoted by user
exports.userLinkVotes = ({ username } = {}, callback) => { 
	assert(username, `[wykop-monitor] No value specified for 'username'`);
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getLinksUpvoted();
		},
		type: 'user-link-voted',
		callback: callback
	});
}

// new entry added by user
exports.userEntries = ({ username } = {}, callback) => { 
	assert(username, `[wykop-monitor] No value specified for 'username'`);
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getEntriesAdded();
		},
		type: 'user-entry',
		callback: callback
	});
}

// new entry comment added by user
exports.userEntryComments = ({ username } = {}, callback) => { 
	assert(username, `[wykop-monitor] No value specified for 'username'`);
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getEntriesCommented().items[0].comments;
		},
		type: 'user-entry-comment',
		callback: callback
	});
}

// new entry upvoted by user
exports.userEntryVotes = ({ username } = {}, callback) => { 
	assert(username, `[wykop-monitor] No value specified for 'username'`);
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getEntriesUpvoted();
		},
		type: 'user-entry-voted',
		callback: callback
	});
}

// new notification - requires login
exports.notifications = ({ types } = {}, callback) => { 
	if (!types) { types = ['new_link', 'new_comment_in_link', 'new_entry', 'new_comment_in_entry', 'new_follower', 'link_in_upcoming', 'link_on_homepage', 'link_was_buried', 'moderation_action', 'new_badge', 'system', 'new_issue_response'] }
	saveNotificationConfig({ 
		request: function() {
			return w.getPersonalNotifications();
		},
		type: 'notification',
		types: types,
		callback: callback
	});
}

// new private message - requires login
exports.pms = (_, callback) => { 
	saveNotificationConfig({ 
		request: function() {
			return w.getConversations();
		},
		type: 'pm',
		callback: callback
	});
}

// -- Function storage
let contentFunctions = {}
let notificationFunctions = {}

function saveContentConfig({ type, request, callback }) {
	if (contentFunctions[type] === undefined) { contentFunctions[type] = [] }
	contentFunctions[type].push({
		request: request,
		callback: callback,
		key: generateKey()
	});
}

function saveNotificationConfig({ type, types, request, callback }) {
	if (notificationFunctions[type] === undefined) { notificationFunctions[type] = [] }
	notificationFunctions[type].push({
		request: request,
		callback: callback,
		filter: types,
		key: generateKey()
	});
}

function generateKey() {
	return crypto.randomBytes(20).toString('hex');
}

function getContentId(content) {
	return (new Date(content.created_at)).getTime()
}

function getPostType(post) {
	return ('title' in post ? 'link' : 'entry');
}