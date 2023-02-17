<h1 align="center">@jsheaven/observed</h1>

> Transparently observe and/or intercept JavaScropt Object and Array mutations (data changes) at any level (depth)

<h2 align="center">User Stories</h2>

1. As a developer, I want to define a store as an object at one location in code, but want hooks to be called somewhere else, when values in that object change at any level I'm interested in, atomically (e.g. `foo.bar.xyz[1]`).

2. As a developer, I want the ability to intercept mutations and change the value of the mutation before it happens (meta-programming, indirection).

3. As a developer, I want to observe mutations `before` and `after` they happen. I want the ability to listen for mutation globally and/or atomically to specific locations in the object tree.

4. As a developer, I want the library to act transparently, so that every mutation (set) comes thru, even though the value may be the same.

5. As a developer, I expect great performance without unnecessary overhead/dependencies. I expect `O(1)` runtime complexity on average.

<h2 align="center">Features</h2>

- ✅ Observes mutations (value changes) in JavaScript Objects and Arrays at any level
- ✅ Available as a simple, functional API: `const myObservedObj = observed({ foo: { test: 123, bar: [true] } });`
- ✅ Observe changes at any level `foo.test` etc.
- ✅ Allows to stop observing at any level using `offSet(myObservedObj.foo)`
- ✅ Allows to register interceptors to change mutation values
- ✅ Allows to register _global_ listeners and interceptors
- ✅ Allows to control depth of observation
- ✅ Just `720 byte` nano sized (ESM, gizpped)
- ✅ 0 dependencies
- ✅ Tree-shakable and side-effect free
- ✅ First class TypeScript support
- ✅ 100% Unit Test coverage

<h2 align="center">Example usage</h2>

<h3 align="center">Setup</h3>

- yarn: `yarn add @jsheaven/observed`
- npm: `npm install @jsheaven/observed`

<h3 align="center">ESM</h3>

```ts
import { observed, onSet, offSet } from '@jsheaven/observed'

const someObject = { foo: 'X', cool: { test: 123 } }

// is now observed, by default deeply
const someObjectObserved = observed(someObject)

const onSomethingInCoolChange = (prop, value, prevValue) => {
  console.log(prop, 'changed from', prevValue, 'to', value)
}

// listen to changes, by default in 'after' phase, when it already happened
onSet(someObjectObserved.cool, onSomethingInCoolChange)

someObjectObserved.cool.test = 456 // prints to console now

// lets set an interceptor, so we can change the values before the change happens
const interceptAndChangeWhenSomethingInCoolChanges = (prop, value, prevValue) => {
  console.log(prop, 'changed from', prevValue, 'to', value)
  if (prop === 'test' && typeof value === 'number') {
    return value * 2 // always double
  }
  return value // original change
}
onSet(someObjectObserved.cool, interceptAndChangeWhenSomethingInCoolChanges, 'before')

someObjectObserved.cool.test = 456 // prints 912 to console now because the doubling of the value happens first

someObjectObserved.lala = 234 // nothing happens, there is no listener on someObject directly

someObjectObserved.foo = 'Y' // nothing happens, also here there is no listener

// you can also test an object to be observed (if Proxy the proxy is set)
isObserved(someObjectObserved) // true
isObserved(someObject) // false

// and also fetch the callback references from an observed object
getObservers(someObjectObserved.cool) // [ ... ]

// to stop listenting/intercepting specifically:
offSet(someObjectObserved.cool, onSomethingInCoolChange)

// to remove all callbacks on that level at once:
offSet(someObjectObserved.cool)
```

<h3 align="center">CommonJS</h3>

```ts
const { observed } = require('@jsheaven/observed')

// same API like ESM variant
```

<h3 align="center">Advanced - global listeners and depth control</h3>

```ts
import { observed } from '@jsheaven/observed'

// original object always stays untouched (never mutated from observed objects mutations)
const someObject = { foo: 'X', cool: { test: 123 } }

// now lets say we that we want to observe any change at any level
const someObjectObserved = observed(someObject, {
  onSet: (prop, value, prevValue) => {
    console.log(prop, 'changed from', prevValue, 'to', value)
  },
  onGet: (prop, value, target, receiver) => {
    console.log(prop, 'has been read/accessed with value', value, 'in target object', target, 'receiver', receiver)
  },
  onBeforeSet: (prop, value, prevValue) => {
    console.log(prop, 'changed from', prevValue, 'to', value)
    if (typeof value === 'number') {
      return value * 2 // always double
    }
    return value // original change
  },
})

// both listeners are registered now and act before and after all atomic listeners
// therefore atomic listeners in 'before' phase, can override global listeners in 'before' phase
// and global listeners in 'after' phase always receive the "final" result and are reading last

someObjectObserved.cool.test = 456 // prints 912 to console now because the doubling of the value happens first

someObjectObserved.lala = 468 // prints 468

someObjectObserved.foo = 'Y' // prints to the console

// has no effect, because we're talking global listeners and they can't be removed
offSet(someObjectObserved.cool)
```

<h3 align="center">CommonJS</h3>

```ts
const { observed } = require('@jsheaven/observed')

// same API like ESM variant
```

<h2 align="center">Notes on time complexity</h2>

TL;DR: On average, the time complexity of this library is `O(1)`.

Because this library supports infinite depth mutation tracking, and because you could add as much hook listeners on every property of an object as you like, you can, theoretical, run into `O(n)` where n is the number of properties on the object being observed. This is because the observed function loop over all the properties of the object to observe them. The time complexity of the `onSet` function is `O(n)` as it adds a callback to the list of callbacks of the observed object, which has a length of `n`, but as explained before, in the average case, it's `O(1)`.
