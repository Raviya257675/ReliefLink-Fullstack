import test from 'node:test';
import assert from 'node:assert/strict';
import { installNavigationFallback } from '../../frontend/src/navigationFallback.js';

// Verify the navigation fallback can override React Router's client-side click
// handling for internal links without interfering with external links or tabs.
test('link navigation uses full-page reload only for plain same-origin links', () => {
  const oldDocument = globalThis.document;
  const oldWindow = globalThis.window;
  const oldElement = globalThis.Element;
  const listeners = [];
  const assigned = [];
  class FakeElement {}
  globalThis.Element = FakeElement;
  globalThis.document = {addEventListener(type, listener, useCapture) {
    if (type === 'click') listeners.push({listener, useCapture});
  }};
  globalThis.window = {location: {href:'http://localhost:5173/incidents', origin:'http://localhost:5173', pathname:'/incidents', search:'', assign(url){assigned.push(url)}}};
  try {
    installNavigationFallback();
    assert.equal(listeners.length, 1);
    assert.equal(listeners[0].useCapture, true);
    function click(href, props={}) {
      const link = {href, target:props.target || '', hasAttribute(name){return name==='download' && !!props.download}, getAttribute(){return href}};
      class Target extends FakeElement {closest(){return link}}
      const event = {target:new Target(), defaultPrevented:false, button:0, metaKey:false, ctrlKey:false, shiftKey:false, altKey:false,
        prevented:false, stopped:false,
        preventDefault(){this.prevented=true}, stopPropagation(){this.stopped=true}, ...props};
      listeners[0].listener(event);
      return event;
    }
    const internal=click('http://localhost:5173/dashboard');
    assert.equal(internal.prevented, true);
    assert.equal(internal.stopped, true);
    assert.deepEqual(assigned,['http://localhost:5173/dashboard']);
    assert.equal(click('https://example.com/').prevented,false);
    assert.equal(click('http://localhost:5173/shelters',{ctrlKey:true}).prevented,false);
    assert.equal(click('http://localhost:5173/shelters',{target:'_blank'}).prevented,false);
    assert.equal(click('http://localhost:5173/incidents#filters').prevented,false);
    assert.equal(assigned.length,1);
  } finally {
    globalThis.document=oldDocument;
    globalThis.window=oldWindow;
    globalThis.Element=oldElement;
  }
});
