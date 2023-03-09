<img src="https://wykop.pl/static/img/svg/wykop-min-logo.svg" width="100">

# WykopMonitor
Simple package that allows you to monitor new content on Wykop.pl

```
npm i wykop-monitor
```

## Example usage
```javascript
const Monitor = require('wykop-monitor');

// Add a comment to an entry where someone mentioned you
Monitor.notifications({ types: ['new_entry']}, async ({ notification }) => {

	// Add the comment and print the resulting EntryComment object
	await notification.entry.submitComment({ content: 'Nice entry!' }).then(console.log)
});

// Start monitoring
Monitor.start({
	interval: 60,
	rtoken: '<your-refresh-token>'
});
```
For more info see the ["Documentation"](#documentation) below

## Considerations

For the monitoring to work the way you'd like, there are a few things to consider:
- When using the monitor without logging in:
	- Global blacklists might be active (think #polityka for non-logged users)
	- Note: user categories (buckets) are available even when not logged in 
- When using the monitor while logged in to your account:
	- Blacklists will be active and filter content
	- You will be able to directly interact with content ([see WykopJS for more info](https://github.com/xxdeepfriedxx/wykop))

## "Documentation"

### Monitor.start(options)
- This starts the monitoring process, it should be at the end of your code



- The available options:

| Option                 | Default                     | Description |
| ---                    | ---                         | --- |
| `options.interval`     | `60`                        | <optional>  The interval between content checks |
| `options.appkey`       | `null`                      | <optional*> The appkey you received from Wykop.pl |
| `options.secret`       | `null`                      | <optional*> The secret you received from Wykop.pl |
| `options.token`        | `null`                      | <optional*> Your access token for Wykop.pl |
| `options.rtoken`       | `null`                      | <optional*> Your refresh token for Wykop.pl |
| `options.username`     | `null`                      | <optional>  Your username for Wykop.pl ** |
| `options.password`     | `null`                      | <optional>  Your password for Wykop.pl ** |

* = You'll need to provide at least (a) an `appkey` and a `secret`, (b) a `rtoken` or (c) a `token`. The best option is to provide an `appkey` and `secret`, that way we can generate tokens whenever we need a new one and you don't need to keep track of them. The second best option is to provide a `rtoken`, you'll be logged in and we can generate new tokens, but you'll need to keep track of the latest `rtoken` somewhere, so you can easily create a new Wykop instance. The last option is to provide a `token` but you'll be limited by the expiration date on the token, so keep that in mind.

** = I don't think permissions for logging in with a username and password are given to 3rd party apps, so keep in mind that you will probably get error `application_not_permission` when providing a username/password. The best option would be to provide an `rtoken` and after your calls to the API have completed you save the new rtoken somewhere. See [Monitor.databaseExtract()](#monitordatabaseextract) below on how to get the tokens.

### Monitor.stop()
This ends the monitoring
```javascript
Monitor.stop()
```

### Monitor.databaseExtract()
This can be called just before stopping your app to save the latest tokens, that way you don't have to get a new `rtoken` every time
```javascript
Monitor.databaseExtract()
// Returns a Promise that resolves to an object that has the latest 'token' and 'rtoken' values:
// {
// 	  token: <latest-token>,
// 	  rtoken: <latest-refresh-token>,
//    ...
// }
```

### Monitor.links(options, callback)
- Allows for monitoring new links
- Can be filtered using a bucket (user category)
Examples:
```javascript
// Callback will be called for all new links
Monitor.links(null, async ({ link }) => {
	
	// do something with the link
})

// Callback will be called for new links in your category
Monitor.links({ bucket: 'kjy2b3kjghvbwme' }, callback)

// Callback will be called for new links in global category
Monitor.links({ category: 'informacje' }, callback)
```

### Monitor.entries(options, callback)
- Allows for monitoring new entries
- Can be filtered using a bucket (user category)
Examples:
```javascript
// Callback will be called for all new entries
Monitor.entries({}, async ({ entry }) => {
	
	// do something with the entry
})

// Callback will be called for new entries in your category
Monitor.entries({ bucket: 'kjy2b3kjghvbwme' }, callback)

// Callback will be called for new entries in global category
Monitor.entries({ category: 'informacje' }, callback)
```

### Monitor.tags(options, callback)
- Allows for monitoring new content in a tag
- Can be filtered by type: `entry` or `link`
Examples:
```javascript
// Callback will be called for all new links
Monitor.tags({ tag: 'heheszki' }, async ({ link, entry }) => {
	
	// do something with the link or entry
})

// Callback will be called for new links in global category
Monitor.tags({ tag: 'heheszki', type: 'link' }, callback)

// Callback will be called for new entries in your category
Monitor.tags({ tag: 'heheszki', type: 'entry' }, callback)
```

### Monitor.notifications(options, callback)
- **This method requires you to be logged in to your account**
- Allows for monitoring new notifications
- Can be filtered based on notification types: `new_link`, `new_comment_in_link`, `new_entry`, `new_comment_in_entry`, `new_follower`, `link_in_upcoming`, `link_on_homepage`, `link_was_buried`, `moderation_action`, `new_badge`, `system`, `new_issue_response`
Examples:
```javascript
// Callback will be called for mentions of your username in entries
Monitor.notifications({ types: ['new_entry'] }, async ({ notification, entry }) => {

	// do something with the notificaiton, in this case we can access the entry like so:
	const entry = notification.entry
});

// Callback will be called for mentions of your username in entries and entry comments
Monitor.notifications({ types: ['new_entry', 'new_comment_in_entry' ] }, callback)

// Callback will be called for all new notifications - you'll need to check for the notification.type yourself
Monitor.notifications({}, callback)
```

### Monitor.pms(options, callback)
- **This method requires you to be logged in to your account**
- Allows for monitoring of new private messages
Examples:
```javascript
// Callback will be called for mentions of your username in entries
Monitor.pms({}, async ({ notification }) => {

	// do something with the notificaiton, in this case we can access the entry like so:
	const entry = notification.entry
});
```

### Monitor.userLinks(options, callback)
- Allows for monitoring all new links added by a specific user
Examples:
```javascript
// Callback will be called for all new links added by 'wykop'
Monitor.userLinks({ username: 'wykop' }, async ({ link }) => {
	
	// do something with the link
})
```

### Monitor.userEntries(options, callback)
- Allows for monitoring all new entries added by a specific user
Examples:
```javascript
// Callback will be called for all new entries added by 'wykop'
Monitor.userEntries({ username: 'wykop' }, async ({ entry }) => {
	
	// do something with the entry
})
```

### Other user actions:
These are some more of the options that are available, but they might not work as you'd expect. WykopMonitor currenly looks for newer content based on the date the post was created, so while these functions will work just fine if the user is voting or commenting on newer content, it'll fail (no callback) when the vote or comment is on an older post. In the future I'd like to address this, but for now that's how it is. 
- `Monitor.userLinkVotes({ username: 'wykop' }, callback)`
- `Monitor.userLinkComments({ username: 'wykop' }, callback)`
- `Monitor.userEntryVotes({ username: 'wykop' }, callback)`
- `Monitor.userEntryComments({ username: 'wykop' }, callback)`
