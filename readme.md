# editorconnect-node

NodeJS websocket client and server implementing a call/reply messaging. Websocket client also works in browser.

## API 

### Sending calls

#### ws.call(name, payload, { onReply, onDone, replyTimeout, doneTimeout })

The call function (which exists on the server and socket side) has three arguments.

- `{string} name`_ - The name of the event to emit on the other side.
- `{any} payload` - The data you want to be sent with the event, which is the first argument to `onReply()`
- `{function} options.onReply({ data: any, part: uinteger, parts: Array<any> })` - Called when a reply is received from the other side. 
  - `{any} data` is the payload 
  - `{integer} part` is what index. 
- `{function} options.onDone({ data: any, parts: Array<any> })` - Called when the call has received all data. Receives an object as a parameter with properties data, parts, an part. 
  - `{any} data` is the last payload send. 
  - `{array<any>} parts` is an array of all payloads received. 
- `{integer} options.doneTimeout` - The amount of time before an error is thrown when a done reply hasn't been recieved. When -1 is passed, the timeout is not set.
- `{integer} options.replyTimeout` - The amount of time before an error is thrown when the first reply hasn't been received. When -1 is passed, the timeout is not set.

```js
// we can call an action on the server
ws.call('order-milk', { size: 'litre' });

// if the call returns data, we can await the call
(async () => {
  const response = await ws.call('order-milk');

  // Let's pretend data is a receipt for the order
  console.log(response.data); // { id: 1, total: '$2.99', subtotal: '$3.07', tax: '$0.08' }
})();
```

### Listening to calls

#### ws.on(name, callback);

- `{string} name` - The name of the event to watch. Accepts wildcards.
- `{function} callback` - Called when a call comes in 

```js
const { WebSocket } = require('lively');
const ws = new WebSocket(url, options);

// To listen to calls coming in form the other side
ws.on('lint:javascript', (data, reply, done) => {
  const output = await lint(data.input);

  // Here we can return some data
  reply({ output });
  done();
});

// If you return a promise, done will be called for you
ws.on('lint:javascript', async (data, reply) => {
  const errors = await lint(data.input);

  // Done is called automatically when returning a promise

  return errors;
});
```


### Why?

Because I wanted a simple implementation of something like this in the browser, node, and python, so I decided to write it myself.


### Todo

- [ ] Moar tests


