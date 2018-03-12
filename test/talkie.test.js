'use strict';

import test from 'ava';

import sinon from 'sinon';

import Talkie from '../lib/talkie';
import * as Messages from '../lib/messages';

const INCOMING_ORIGIN = { id: 'incoming' };
const OUTGOING_ORIGIN = { id: 'outgoing' };

test.skip('validate(message) - validates messages conform to api', t => {
  t.false(Messages.isValid(null));
  t.false(Messages.isValid({ type: 'lime' }));
  t.false(Messages.isValid({ type: 'call' }));
  t.false(Messages.isValid({ type: 'reply' }));

  t.true(Messages.isValid({ type: 'call', event: 'order-milk' }));
});

test('talkie.send(data) - throws an error if not implemented', t => {
  const talkie = new Talkie();

  t.throws(() => talkie.send(), /not implemented/);
});

test('talkie - has event emitter attributes', t => {
  t.plan(4);

  const talkie = new Talkie();

  talkie.api.on('coconut', () => t.pass('api coconut event fires'));
  talkie.on('coconut', () => t.pass('hub coconut event fires'));
  talkie.api.emit('coconut');
  talkie.emit('coconut');

  talkie.on('coconut:*', () => t.pass('hub event fires for wildcard'));
  talkie.api.on('coconut:*', () => t.pass('api event fires for wildcard'));
  talkie.api.emit('coconut:water');
  talkie.emit('coconut:water');
});

test('talkie.call(event, payload) - sends an API call', async t => {
  t.plan(5);

  const SENT_PAYLOAD = { where: 'inside' };
  const EVENT_NAME = 'lime';

  class Coconut extends Talkie {

    get origin() {
      return OUTGOING_ORIGIN;
    }

    send(message) {
      t.pass('send is called');
      t.is(message.type, 'call');
      t.is(message.event, EVENT_NAME);
      t.deepEqual(message.payload, SENT_PAYLOAD);
    }

  }

  const coconut = new Coconut();
  const promise = coconut.call(EVENT_NAME, SENT_PAYLOAD);

  await t.throws(promise, /exceeded/, 'first reply timeout throws');
});

test('talkie.call(event, payload) - allows awaiting a call response', async t => {
  t.plan(3);

  const CALL_RETURN = 'you put the';
  const EVENT_NAME = 'lime';
  const PAYLOAD = { where: 'inside' };

  class Coconut extends Talkie {

    get origin() {
      return OUTGOING_ORIGIN;
    }

    send(call) {
      setTimeout(() => {
        this.dispatch([Messages.reply(CALL_RETURN, call, 0, true, INCOMING_ORIGIN)]);
      }, 0);
    }

  }

  const coconut = new Coconut();
  const promise = coconut.call(EVENT_NAME, PAYLOAD);

  t.is(typeof promise.then, 'function');
  await t.notThrows(promise);
  const response = await promise;

  t.deepEqual(response.parts, [CALL_RETURN], 'the call response should be an array');
});

test('talkie.call(event, payload) - await call response with multiple parts', async t => {
  t.plan(5);

  const SENT_PAYLOAD = { where: 'inside' };
  const EVENT_NAME = 'lime';

  class Coconut extends Talkie {

    get origin() {
      return OUTGOING_ORIGIN;
    }

    send(call) {
      setTimeout(() => {
        this.dispatch([
          Messages.reply('coconut', call, 0, false, INCOMING_ORIGIN),
          Messages.reply('lime', call, 1, false, INCOMING_ORIGIN),
          Messages.reply('water', call, 2, true, INCOMING_ORIGIN),
        ]);
      }, 0);
    }

  }

  const coconut = new Coconut();
  const promise = coconut.call(EVENT_NAME, SENT_PAYLOAD);

  t.is(typeof promise.then, 'function');

  await t.notThrows(promise);
  const response = await promise;

  t.deepEqual(response.parts, ['coconut', 'lime', 'water'], 'the call response should be an array');
  t.is(response.parts.length, 3, 'should resolve with all parts as array when done');
  t.is(response.data, 'water', 'data property should be last payload sent');
});

test('talkie.call(event, payload) - onReply and done callbacks are called', async t => {
  t.plan(5);

  const onReplySpy = sinon.spy();
  const onDoneSpy = sinon.spy();

  class Coconut extends Talkie {

    get origin() {
      return OUTGOING_ORIGIN;
    }

    send(call) {
      setTimeout(() => {
        this.dispatch([
          Messages.reply('coconut', call, 0, false, INCOMING_ORIGIN),
          Messages.reply('lime', call, 1, false, INCOMING_ORIGIN),
          Messages.reply('water', call, 2, true, INCOMING_ORIGIN),
        ]);
      }, 0);
    }

  }

  const coconut = new Coconut();

  const promise = coconut.call('hey', {}, {
    onReply: onReplySpy,
    onDone: onDoneSpy,
  });

  await t.notThrows(promise);

  t.true(onReplySpy.getCall(0).calledWith('coconut', 0));
  t.true(onReplySpy.getCall(1).calledWith('lime', 1));
  t.true(onReplySpy.calledTwice, 'onReply is not called when done');
  t.true(onDoneSpy.calledWith('water', ['coconut', 'lime', 'water']))
});

test('talkie.call(event, payload) - await call response with multiple parts', async t => {
  t.plan(1);

  class Coconut extends Talkie {

    get origin() {
      return OUTGOING_ORIGIN;
    }

    send() {}

  }

  const coconut = new Coconut();
  const promise = coconut.call();

  await t.throws(promise, /timeout until first reply has been exceeded/);
});

test('.on() allows replying to incoming call', async t => {
  t.plan(14);

  class Coconut extends Talkie {

    get origin() {
      return OUTGOING_ORIGIN;
    }

  }

  const sendSpy = sinon.spy();
  const coconut = new Coconut();
  const onReplySpy = sinon.spy();
  const event = 'order-milk';
  const payload = { size: 'litre' };
  const expected = { id: '123', total: '$123.00' };

  coconut.send = sendSpy;

  coconut.on(event, (data, reply) => {
    return reply(expected);
  });

  coconut.api.on('send:reply', onReplySpy);

  await coconut.dispatch([Messages.call(event, payload, INCOMING_ORIGIN)]);

  t.true(onReplySpy.calledTwice, 'api event is called twice');
  t.true(sendSpy.calledTwice, 'send is called for each reply');

  [sendSpy, onReplySpy].forEach(spy => {
    const firstReply = spy.firstCall.args[0];
    const secondReply = spy.secondCall.args[0];

    t.deepEqual(firstReply.payload, expected);
    t.false(firstReply.done);
    t.is(firstReply.part, 0);

    t.is(secondReply.part, 1, 'done is the second part');
    t.true(secondReply.done, 'done is automatically replied');
    t.is(secondReply.payload, null, 'done resulting value is null');
  });
});

test('.on() allows returning promise and replying', async t => {
  t.plan(14);

  class Coconut extends Talkie {

    get origin() {
      return OUTGOING_ORIGIN;
    }

  }

  const sendSpy = sinon.spy();
  const coconut = new Coconut();
  const onReplySpy = sinon.spy();
  const event = 'order-milk';
  const payload = { size: 'litre' };
  const firstPayload =  { meaningfuldata: 'doge' };
  const secondPayload = { id: '123', total: '$123.00' };

  coconut.send = sendSpy;

  coconut.on(event, (data, reply) => {
    reply(firstPayload);
    return Promise.resolve(secondPayload);
  });

  coconut.api.on('send:reply', onReplySpy);

  await coconut.dispatch([Messages.call(event, payload, INCOMING_ORIGIN)]);

  t.true(onReplySpy.calledTwice, 'api event is called twice');
  t.true(sendSpy.calledTwice, 'send is called for each reply');

  [sendSpy, onReplySpy].forEach(spy => {
    const firstReply = spy.firstCall.args[0];
    const secondReply = spy.secondCall.args[0];

    t.deepEqual(firstReply.payload, firstPayload);
    t.false(firstReply.done);
    t.is(firstReply.part, 0);

    t.is(secondReply.part, 1, 'done is the second part');
    t.true(secondReply.done, 'done is automatically replied');
    t.is(secondReply.payload, secondPayload, 'done resulting value is null');
  });
});

test('.off() removes a listener', async t => {
  t.plan(3);

  class Coconut extends Talkie {

    get origin() {
      return OUTGOING_ORIGIN;
    }

    send() {}
  }

  const listenerSpy = sinon.spy();
  const coconut = new Coconut();
  const incomingPayload = { hey: 'itsme' };
  const event = 'lime';

  coconut.on(event, listenerSpy);

  const incomingCall = Messages.call(event, incomingPayload, INCOMING_ORIGIN);

  await coconut.dispatch([incomingCall]);

  t.true(listenerSpy.calledOnce);
  t.deepEqual(listenerSpy.firstCall.args[0], incomingPayload);

  coconut.off(event, listenerSpy);

  await coconut.dispatch([Messages.call(event, incomingPayload, INCOMING_ORIGIN)]);

  t.true(listenerSpy.calledOnce, '.off() removed event listener');
});

test('.off() removes a listener', async t => {
  t.plan(3);

  class Coconut extends Talkie {

    get origin() {
      return OUTGOING_ORIGIN;
    }

    send() {}

  }

  const listenerSpy = sinon.spy();
  const coconut = new Coconut();
  const incomingPayload = { hey: 'itsme' };
  const event = 'lime';

  coconut.on(event, listenerSpy);

  const incomingCall = Messages.call(event, incomingPayload, INCOMING_ORIGIN);

  await coconut.dispatch([incomingCall]);

  t.true(listenerSpy.calledOnce);
  t.deepEqual(listenerSpy.firstCall.args[0], incomingPayload);

  coconut.off(event, listenerSpy);

  await coconut.dispatch([Messages.call(event, incomingPayload, INCOMING_ORIGIN)]);

  t.true(listenerSpy.calledOnce, '.off() removed event listener');
});
