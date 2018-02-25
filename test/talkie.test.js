'use strict';

import test from 'ava';

import sinon from 'sinon';

import Talkie from '../src/talkie';
import * as Messages from '../src/messages';

const createTalkie = (...args) => {
  return new Talkie(...args);
};

test('talkie.send(data) - throws an error if not implemented', t => {
  const talkie = createTalkie();
  t.throws(() => talkie.send(), /not implemented/);
});

test('talkie - has event emitter attributes', t => {
  t.plan(4);

  const talkie = createTalkie();

  talkie.api.on('coconut', () => t.pass('api coconut event fires'));
  talkie.hub.on('coconut', () => t.pass('hub coconut event fires'));
  talkie.api.emit('coconut');
  talkie.hub.emit('coconut');

  talkie.hub.on('coconut:*', () => t.pass('hub event fires for wildcard'));
  talkie.api.on('coconut:*', () => t.pass('api event fires for wildcard'));
  talkie.api.emit('coconut:water');
  talkie.hub.emit('coconut:water');
});

test('talkie.call(event, payload) - sends an API call', async t => {
  t.plan(5);

  const SENT_PAYLOAD = { where: 'inside' };
  const EVENT_NAME = 'lime';

  class Coconut extends Talkie {

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

    send(call) {
      setTimeout(() => {
        this.dispatch([Messages.reply(CALL_RETURN, call, 0, true)]);
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

    send(call) {
      setTimeout(() => {
        this.dispatch([
          Messages.reply('coconut', call, 0, false),
          Messages.reply('lime', call, 1, false),
          Messages.reply('water', call, 2, true),
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

    send(call) {
      setTimeout(() => {
        this.dispatch([
          Messages.reply('coconut', call, 0, false),
          Messages.reply('lime', call, 1, false),
          Messages.reply('water', call, 2, true),
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

    send() {}

  }

  const coconut = new Coconut();
  const promise = coconut.call();

  await t.throws(promise, /timeout until first reply has been exceeded/);
});
