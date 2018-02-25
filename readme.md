# editorconnect-node

Node client and server (todo) implementing a call/reply messaging. The client also works in browser and is purposed for connecting to [editor-connect](https://github.com/anthonykoch/editorconnect-sublime).

## API 

### new Socket(url, options)

Uses [ws](https://github.com/websockets/ws) as the underlying websocket implementation. The socket doesn't connect util it's `.open()` function is called.

- `{string} url` - the url to connect to
- `{object} options` - the optionsfor the socket

```
import { Socket } from 'editorconnect-node';

(async () => {
  const ws = new Socket('ws://localhost:35048', {
    // manipulate the message before it's encoded by the parser
    prepare: (message) => message,

    // The parser for incoming messages
    parser,

    // options passed straight to the socket
    wsOptions: {}, 
  });

  ws.on('open', function() {
    console.log('we can now send data');
  });

  const { error } = await socket.open();

  if (error) return;
  
  ws.call('some-event');
})();
```

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
import { Socket } from 'editorconnect-node';
const ws = new WebSocket(url, options);

// Listens to calls coming in form the other side
ws.on('lint:javascript', (data) => {
  // Reply with some data
  return lint(data.input);
});

// You can also return a promise and the resolved value will be replied back to the caller
ws.on('fetch:milk-items', async (data) => {
  const promise = fetch('https://store.com/items/milk').then(res => res.json());

  return promise;
});


// Returning multiple replies for a single call
// Useful for when you want to send something back as it's happening
ws.on('get-google', (data, reply) => {
  request('https://google.com')
    .on('data', (data) => {
      reply(data);
    });
});
```


### Why?

Because I wanted a simple implementation of something like this in the browser, node, and python (for sublime text), so I decided to write it myself.


## Todo

- Write the node version of editorconnect-sublime

- Maybe just have Talkie extend node's own EventEmitter (getting rid of EventEmitter2) instead of using hub because the current way is somewhat convulated and requires rewriting a lot of the eventemitter2 functions anyway. Not really digging extending eventemitter2 because of the stuff it comes with is not a part of the Talkie api.
