<img src="https://wykop.pl/static/img/svg/wykop-min-logo.svg" width="100">

# WykopMonitorJS
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

- [Monitor.start(options)](#monitorstartoptions)
- [Monitor.stop()](#monitorstop)
- [Monitor.reset()](#monitorreset)
- [Monitor.databaseExtract()](#monitordatabaseextract)
- [Monitor.links(options, callback)](#monitorlinksoptions-callback)
- [Monitor.linkComments(options, callback)](#monitorlinkcommentsoptions-callback)
- [Monitor.relatedLinks(options, callback)](#monitorrelatedlinksoptions-callback)
- [Monitor.entries(options, callback)](#monitorentriesoptions-callback)
- [Monitor.entryComments(options, callback)](#monitorentrycommentsoptions-callback)
- [Monitor.tags(options, callback)](#monitortagsoptions-callback)
- [Monitor.notifications(options, callback)](#monitornotificationsoptions-callback)
- [Monitor.pms(options, callback)](#monitorpmsoptions-callback)
- [Monitor.conversation(options, callback)](#monitorconversationoptions-callback)
- [Monitor.userLinks(options, callback)](#monitoruserlinksoptions-callback)
- [Monitor.userEntries(options, callback)](#monitoruserentriesoptions-callback)

### Monitor.start(options)
- This starts the monitoring process, it should be called **after** any of the monitoring functions in your code
- The available options:

| Option                 | Default                     | Description |
| ---                    | ---                         | --- |
| `options.interval`     | `60`                        | \<optional> The interval between content checks |
| `options.appkey`       | `null`                      | \<optional> The appkey you received from Wykop.pl (1) |
| `options.secret`       | `null`                      | \<optional> The secret you received from Wykop.pl (1) |
| `options.token`        | `null`                      | \<optional> Your access token for Wykop.pl (1) |
| `options.rtoken`       | `null`                      | \<optional> Your refresh token for Wykop.pl (1) |
| `options.username`     | `null`                      | \<optional> Your username for Wykop.pl (2) |
| `options.password`     | `null`                      | \<optional> Your password for Wykop.pl (2) |
| `options.debug`        | `true`                      | \<optional> Here you can turn off all non-error logging info |

```javascript
// Starts monitoring for whatever your specified before
Monitor.start({
    interval: 60,
    token: '<your-token>'
})
```

(1) You'll need to provide at least (a) an `appkey` and a `secret`, (b) a `rtoken` or (c) a `token`. The best option is to provide an `appkey` and `secret`, that way we can generate tokens whenever we need a new one and you don't need to keep track of them. The second best option is to provide a `rtoken`, you'll be logged in and we can generate new tokens, but you'll need to keep track of the latest `rtoken` somewhere, so you can easily create a new Wykop instance. The last option is to provide a `token` but you'll be limited by the expiration date on the token, so keep that in mind.

(2) Permissions for logging in with a username and password are not given to 3rd party apps, so keep in mind that you will probably get error `application_not_permission` when providing a username/password. The best option would be to provide an `rtoken` and when your app is about to shut down you save the latest tokens somewhere. See [Monitor.databaseExtract()](#monitordatabaseextract) below on how to get your tokens.

### Monitor.stop()
This ends the monitoring
```javascript
Monitor.stop()
```

### Monitor.reset()
This ends and resets the monitoring
```javascript
Monitor.reset()
```

### Monitor.databaseExtract()
This can be called just before stopping your app to save the latest tokens, that way you don't have to get a new `rtoken` every time
```javascript
Monitor.databaseExtract()
// Returns a Promise that resolves to an object that has the latest 'token' and 'rtoken' values:
// {
//    token: <latest-token>,
//    rtoken: <latest-refresh-token>,
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

### Monitor.linkComments(options, callback)
- Allows for monitoring new main-comments or sub-comments added to a specific link

Examples:
```javascript
// Callback will be called for new main-comments added to a specific link
Monitor.linkComments({ linkId: '1234' }, async ({ comment }) => {

    // do something with the comment
})

// Callback will be called for new sub-comments added to a specific main-comment
Monitor.linkComments({ linkId: '1234', commentId: '4321' }, callback)
```

### Monitor.relatedLinks(options, callback)
- Allows for monitoring new related links added to a specific link

Examples:
```javascript
// Callback will be called for new related links added to a specific link
Monitor.relatedLinks({ linkId: '1234' }, async ({ related }) => {

    // do something with the related link
})
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

### Monitor.entryComments(options, callback)
- Allows for monitoring new comments added to a specific entry

Examples:
```javascript
// Callback will be called for new comments in an entry
Monitor.entryComments({ entryId: '1234' }, async ({ comment }) => {

    // do something with the comment
})
```

### Monitor.searchLinks(options, callback)
- Allows for monitoring new links based on a search
- The `votes` option is unreliable and might skip some content

Examples:
```javascript
// Callback will be called for new links based on a query
Monitor.searchLinks({ query: 'wykop' }, async ({ link }) => {

    // do something with the link
})

// Callback will be called for new links that include the tag #polska OR #polityka
Monitor.searchLinks({ tags: ['polska', 'polityka'] }, callback)

// Callback will be called for new links added by user @wykop OR @m__b
Monitor.searchLinks({ users: ['wykop', 'm__b'] }, callback)

// Callback will be called for new links that add content from example.com OR example.pl
Monitor.searchLinks({ domains: ['example.com', 'example.pl'] }, callback)

// Callback will be called for new links in a category
Monitor.searchLinks({ category: '1000' }, callback)

// Callback will be called for new links in a bucket
Monitor.searchLinks({ bucket: '1000' }, callback)

// Callback will be called for new links with at least a 1000 upvotes (unreliable)
Monitor.searchLinks({ votes: '1000' }, callback)
```

### Monitor.searchEntries(options, callback)
- Allows for monitoring new entries based on a search
- The `votes` option is unreliable and might skip some content

Examples:
```javascript
// Callback will be called for new entries based on a query
Monitor.searchEntries({ query: 'wykop' }, async ({ entry }) => {

    // do something with the entry
})

// Callback will be called for new entries that include the tag #polska OR #polityka
Monitor.searchEntries({ tags: ['polska', 'polityka'] }, callback)

// Callback will be called for new entries added by user @wykop OR @m__b
Monitor.searchEntries({ users: ['wykop', 'm__b'] }, callback)

// Callback will be called for new entries that add content from example.com OR example.pl
Monitor.searchEntries({ domains: ['example.com', 'example.pl'] }, callback)

// Callback will be called for new entries in a category
Monitor.searchEntries({ category: '1000' }, callback)

// Callback will be called for new entries in a bucket
Monitor.searchEntries({ bucket: '1000' }, callback)

// Callback will be called for new entries with at least a 1000 upvotes (unreliable)
Monitor.searchEntries({ votes: '1000' }, callback)
```

### Monitor.tags(options, callback)
- Allows for monitoring new content in a tag
- Can be filtered by type: `entry` or `link`
- ⚠️ If you plan to monitor multiple tags, it would be better to use [Monitor.entries(options, callback)](#monitorentriesoptions-callback) or [Monitor.links(options, callback)](#monitorlinksoptions-callback) with a custom bucket (user category) instead. 

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

    // do something with the notificaiton, in this case we can fetch the conversation like so:
    const conversation = notification.conversation.get()
});
```

### Monitor.conversation(options, callback)
- **This method requires you to be logged in to your account**
- Allows for monitoring of new private messages

Examples:
```javascript
// Callback will be called for new messages in the conversation with 'wykop'
Monitor.conversation({ username: 'wykop' }, async ({ message, conversation }) => {

    // do something with the message/conversation object
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
These are some more of the options that are available, but they might not work as you'd expect. WykopMonitorJS currenly looks for newer content based on the date the post was created, so while these functions will work just fine if the user is voting or commenting on newer content, it'll fail (no callback) when the vote or comment is on an older post. In the future I'd like to address this, but for now that's how it is. 
- `Monitor.userLinkVotes({ username: 'wykop' }, callback)`
- `Monitor.userLinkComments({ username: 'wykop' }, callback)`
- `Monitor.userEntryVotes({ username: 'wykop' }, callback)`
- `Monitor.userEntryComments({ username: 'wykop' }, callback)`
