const Wykop = require('wykop');
const assert = require('assert');
const crypto = require('crypto');

const defaultInterval = 60;

let w = null;
let _debug = false;
let timeoutID = null;

// Main function
exports.start = async ({ interval = defaultInterval, appkey, secret, token, rtoken, environment, username, password, debug = false, debugAPI = false }) => {
	_debug = debug;

	// Setup the Wykop SDK
	if (_debug) { console.log('[wykop-monitor] [ ] Initializing Wykop SDK...'); }
	try {
		w = new Wykop({ appkey: appkey, secret: secret, token: token, rtoken: rtoken, environment: environment, debug: debugAPI });
		if (_debug) { console.log('[wykop-monitor] [✓] Wykop SDK Initialized'); }
	} catch (error) {
		return console.log('[wykop-monitor] [x] Failed to initialize Wykop SDK, see error below:\n', error.stack ?? error.response ?? error.request ?? error);
	}

	if (username && password) {
		if (_debug) { console.log('[wykop-monitor] [ ] Username and password for Wykop.pl provided; logging in..'); }
		try {
			await w.login(username, password);
			if (_debug) { console.log('[wykop-monitor] [✓] Login successful'); }
		} catch (error) {
			return console.log('[wykop-monitor] [x] Login failed, see error below:\n', error.stack ?? error.response ?? error.request ?? error);
		}
	}

	if (Object.keys(contentFunctions).length === 0) {
		return console.log('[wykop-monitor] [x] Nothing found to monitor...');
	}

	// On the first run we check the latest posts without calling the callback();
	const timeoutFunction = async function(firstRun = false) {
		if (!firstRun && _debug) { console.log('[wykop-monitor] Checking for new content!'); }
		for (let key in contentFunctions) { await checkForContent(contentFunctions[key], firstRun); }
	};
	
	// Save latest posts
	if (_debug) { console.log('[wykop-monitor] [ ] Saving latest content...'); }
	try {
		await timeoutFunction(true);
		if (_debug) { console.log('[wykop-monitor] [✓] Latest content saved'); }
	} catch (error) {
		return console.log('[wykop-monitor] [x] Failed while trying to save the latest content, see error below:\n', error.stack ?? error.response ?? error.request ?? error);
	}

	// Start monitoring
	if (_debug) { console.log(`[wykop-monitor] [ ] Monitoring starting... checking every ${interval} seconds`); }
	try {
		timeoutID = setInterval(timeoutFunction, interval * 1000);
		if (_debug) { console.log('[wykop-monitor] [✓] Monitoring started'); }
	} catch (error) {
		return console.log('[wykop-monitor] [x] Failed to start Monitoring, see error below:\n', error.stack ?? error.response ?? error.request ?? error);
	}
};

exports.stop = () => {
	if (_debug) { console.log('[wykop-monitor] [ ] Stopping Monitoring...'); }
	clearTimeout(timeoutID);
	if (_debug) { console.log('[wykop-monitor] [✓] Monitoring ended'); }
};

exports.databaseExtract = async () => {
	return await w.databaseExtract();
};

const contentTypes = ['link', 'link-comment', 'link-related', 'entry', 'entry-comment', 'tag', 'user-link', 'user-link-comment', 'user-link-voted', 'user-entry', 'user-entry-comment', 'user-entry-voted'];
const notificationTypes = ['notification'];
const pmTypes = ['pm'];
const conversationTypes = ['conversation'];

// Latest content 'memory'
let latestIds = {};

async function checkForContent(configs, saveOnly) {
	if (configs.length === 0) { return; }
	for (let config of configs) {

		let latest = { items: [] };
		try {
			latest = await config.request();
		} catch (error) {
			return console.log('[wykop-monitor] [x] Failed while trying to fetch the latest content, see error below:\n', error.stack ?? error.response ?? error.request ?? error);
		}

		if (contentTypes.includes(config.type)) {
			handleContent(config, latest, saveOnly);
			continue;
		}

		if (notificationTypes.includes(config.type)) {
			handleNotification(config, latest, saveOnly);
			continue;
		}

		if (pmTypes.includes(config.type)) {
			handlePM(config, latest, saveOnly);
			continue;
		}

		if (conversationTypes.includes(config.type)) {
			handleConversation(config, latest, saveOnly);
			continue;
		}
	}
}

async function handleContent(config, latest, saveOnly) {
	if (latest.items.length === 0) { return; }
	for (let post of latest.items) {
		if (saveOnly) { break; }
		if (getContentId(post) <= latestIds[config.key]) { break; }
		config.callback({ 
			[getPostType(post)]: post, 
			client: w
		});
	}

	if (latestIds[config.key] === undefined) { latestIds[config.key] = {}; }
	latestIds[config.key] = getContentId(latest.items[0]);
}

async function handleNotification(config, latest, saveOnly) {
	if (latest.items.length === 0) { return; }
	for (let notification of latest.items) {
		if (config.filter !== undefined && !config.filter.includes(notification.type)) { continue; } 
		if (saveOnly) { break; }
		if (getContentId(notification) <= latestIds[config.key]) { break; }
		config.callback({ 
			notification: notification, 
			client: w
		});
	}

	const newestNotification = latest.items[0];
	if (latestIds[config.key] === undefined) { latestIds[config.key] = {}; }
	latestIds[config.key] = getContentId(newestNotification);
}

async function handlePM(config, latest, saveOnly) {
	if (latest.items.length === 0) { return; }
	for (let conversation of latest.items) {
		if (config.excludeSelf && conversation.last_message.type === 0) { continue; } 
		if (saveOnly) { break; }
		if (getContentId(conversation.last_message) <= latestIds[config.key]) { break; }
		config.callback({ 
			conversation: conversation,
			client: w
		});
	}

	const newestConversation = latest.items[0];
	if (latestIds[config.key] === undefined) { latestIds[config.key] = {}; }
	latestIds[config.key] = getContentId(newestConversation.last_message);
}

async function handleConversation(config, latest, saveOnly) {
	if (latest.messages.length === 0) { return; }
	latest.messages = latest.messages.reverse();
	for (let message of latest.messages) {
		if (config.excludeSelf && message.type === 0) { continue; } 
		if (saveOnly) { break; }
		if (getContentId(message) <= latestIds[config.key]) { break; }
		config.callback({ 
			message: message,
			conversation: latest,
			client: w
		});
	}

	const newestMessage = latest.messages[0];
	if (latestIds[config.key] === undefined) { latestIds[config.key] = {}; }
	latestIds[config.key] = getContentId(newestMessage);
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
};

// new link comment
exports.linkComments = ({ linkId, commentId } = {}, callback) => {
	assert(linkId, '[wykop-monitor] No value specified for \'linkId\'');
	saveContentConfig({ 
		request: function() {
			return w.link(linkId).getComments({
				commentId: commentId,
				sort: 'newest'
			});
		},
		type: 'link-comment',
		callback: callback
	});
};

// new link comment
exports.relatedLinks = ({ linkId } = {}, callback) => {
	assert(linkId, '[wykop-monitor] No value specified for \'linkId\'');
	saveContentConfig({ 
		request: function() {
			return w.link(linkId).getRelatedLinks().then(res => {
				res.items.sort((a, b) => b.id - a.id);
				return res;
			});
		},
		type: 'link-related',
		callback: callback
	});
};

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
};

// new entry comment
exports.entryComments = ({ entryId } = {}, callback) => {
	assert(entryId, '[wykop-monitor] No value specified for \'entryId\'');
	saveContentConfig({ 
		request: function() {
			return w.entry(entryId).getComments().then(res => {
				const lastPage = Math.ceil(res.pagination.total/res.pagination.per_page);
				if (lastPage > 1) {
					return w.entry(entryId).getComments({ page: lastPage }).then(res => Promise.resolve(res));
				}
				return Promise.resolve(res);
			}).then(res => {
				res.items.reverse();
				return res;
			});
		},
		type: 'entry-comment',
		callback: callback
	});
};

// new link or entry in tag
exports.tags = ({ tag, type } = {}, callback) => { 
	assert(tag, '[wykop-monitor] No value specified for \'tag\'');
	saveContentConfig({ 
		request: function() {
			return w.tag(tag).getContent({
				sort: 'all',
				type: type
			});
		},
		type: 'tag',
		callback: callback
	});
};

// new link added by user
exports.userLinks = ({ username } = {}, callback) => { 
	assert(username, '[wykop-monitor] No value specified for \'username\'');
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getLinksAdded();
		},
		type: 'user-link',
		callback: callback
	});
};

// new link comments added by user
exports.userLinkComments = ({ username } = {}, callback) => { 
	assert(username, '[wykop-monitor] No value specified for \'username\'');
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getLinksCommented().items[0].comments;
		},
		type: 'user-link-comment',
		callback: callback
	});
};

// new link upvoted by user
exports.userLinkVotes = ({ username } = {}, callback) => { 
	assert(username, '[wykop-monitor] No value specified for \'username\'');
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getLinksUpvoted();
		},
		type: 'user-link-voted',
		callback: callback
	});
};

// new entry added by user
exports.userEntries = ({ username } = {}, callback) => { 
	assert(username, '[wykop-monitor] No value specified for \'username\'');
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getEntriesAdded();
		},
		type: 'user-entry',
		callback: callback
	});
};

// new entry comment added by user
exports.userEntryComments = ({ username } = {}, callback) => { 
	assert(username, '[wykop-monitor] No value specified for \'username\'');
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getEntriesCommented().items[0].comments;
		},
		type: 'user-entry-comment',
		callback: callback
	});
};

// new entry upvoted by user
exports.userEntryVotes = ({ username } = {}, callback) => { 
	assert(username, '[wykop-monitor] No value specified for \'username\'');
	saveContentConfig({ 
		request: function() {
			return w.profile(username).getEntriesUpvoted();
		},
		type: 'user-entry-voted',
		callback: callback
	});
};

// new notification - requires login
exports.notifications = ({ types } = {}, callback) => { 
	if (!types) { types = ['new_link', 'new_comment_in_link', 'new_entry', 'new_comment_in_entry', 'new_follower', 'link_in_upcoming', 'link_on_homepage', 'link_was_buried', 'moderation_action', 'new_badge', 'system', 'new_issue_response']; }
	saveNotificationConfig({ 
		request: function() {
			return w.getPersonalNotifications();
		},
		type: 'notification',
		types: types,
		callback: callback
	});
};

// new private message - requires login
exports.pms = ({ excludeSelf } = {}, callback) => { 
	savePmConfig({ 
		request: function() {
			return w.getConversations();
		},
		type: 'pm',
		excludeSelf: excludeSelf,
		callback: callback
	});
};

// new private message in conversation - requires login
exports.conversation = ({ username, excludeSelf } = {}, callback) => { 
	assert(username, '[wykop-monitor] No value specified for \'username\'');
	savePmConfig({ 
		request: function() {
			return w.getConversation(username);
		},
		type: 'conversation',
		excludeSelf: excludeSelf,
		callback: callback
	});
};

// -- Function storage
let contentFunctions = {};

function saveContentConfig({ type, request, callback }) {
	if (contentFunctions[type] === undefined) { contentFunctions[type] = []; }
	contentFunctions[type].push({
		type: type,
		request: request,
		callback: callback,
		key: generateKey()
	});
}

function saveNotificationConfig({ type, types, request, callback }) {
	if (contentFunctions[type] === undefined) { contentFunctions[type] = []; }
	contentFunctions[type].push({
		type: type,
		request: request,
		callback: callback,
		filter: types,
		key: generateKey()
	});
}

function savePmConfig({ type, excludeSelf, request, callback }) {
	if (contentFunctions[type] === undefined) { contentFunctions[type] = []; }
	contentFunctions[type].push({
		type: type,
		request: request,
		callback: callback,
		excludeSelf: excludeSelf,
		key: generateKey()
	});
}

// -- Helpers
function generateKey() {
	return crypto.randomBytes(20).toString('hex');
}

function getContentId(content) {
	return (new Date(content.created_at)).getTime();
}

function getPostType(post) {
	if (post.title && post.parent_id) { return 'related'; }
	if (post.resource === 'link_comment' || post.resource === 'entry_comment') { return 'comment'; }
	return post.resource ?? 'content';
}