import { jest } from '@jest/globals'
import {
  onSet,
  offSet,
  observed,
  observedSymbol,
  observedCallbacksSymbol,
  isObserved,
  getObservers,
  defaultOptions,
  SetCallback,
  mayObserve,
} from '../dist/index.esm'

describe('observed', () => {
  it('can call observed', () => {
    observed({
      foo: 'X',
    })

    expect(observed).toBeDefined()
  })

  describe('onSet', () => {
    it('throws an error if callback is not a function', () => {
      expect(() => onSet({}, {} as SetCallback)).toThrow('callback must be a function')
    })

    it('registers a callback to be called after a mutation happens', () => {
      const object = {}
      const callback = jest.fn(() => {})
      onSet(object, callback)
      expect(object[observedCallbacksSymbol]).toEqual([{ cb: callback, phase: 'after' }])
    })
  })

  describe('offSet', () => {
    it('throws an error if callback is not a function that has been passed by reference to onSet before', () => {
      expect(() => offSet({}, {} as SetCallback)).toThrow('callback must be a function')
    })

    it('throws an error if offSet is called before any callbacks have been registered with onSet', () => {
      expect(() =>
        offSet(
          {},
          jest.fn(() => {}),
        ),
      ).toThrow('callback is not registered')
    })

    it('removes a specific callback that has been registered with onSet', () => {
      const object = {}
      const callback1 = jest.fn(() => {})
      const callback2 = jest.fn(() => {})
      onSet(object, callback1)
      onSet(object, callback2)
      offSet(object, callback1)
      expect(object[observedCallbacksSymbol]).toEqual([{ cb: callback2, phase: 'after' }])
    })

    it('removes all callbacks that have been registered with onSet', () => {
      const object = {}
      const callback1 = jest.fn(() => {})
      const callback2 = jest.fn(() => {})
      onSet(object, callback1)
      onSet(object, callback2)
      offSet(object)
      expect(object[observedCallbacksSymbol]).toEqual([])
    })
  })

  describe('observed', () => {
    it('returns the original object if it has already been observed', () => {
      const object = {}
      const observedObject = observed(object)
      expect(observed(observedObject)).toBe(observedObject)
    })

    it('creates a proxy of the object that listens for mutations', () => {
      const object = {}
      const observedObject = observed(object)
      expect(observedObject[observedSymbol]).toBeTruthy()
    })

    it('should observe mutations of an object', () => {
      const spy = jest.fn(() => {})
      const object: any = observed({})
      onSet(object, spy)
      object.test = 'test'
      expect(spy).toHaveBeenCalled()
    })

    it('should observe mutations of an object with custom options', () => {
      const spy = jest.fn(() => {})
      const object: any = observed(
        {},
        {
          deep: false,
          onBeforeSet: () => {},
        },
      )
      onSet(object, spy, 'before')
      object.test = 'test'
      expect(spy).toHaveBeenCalled()
    })

    it('deep mutation change listening', () => {
      const object = observed({
        level1: {
          level2: {
            prop: 'value',
          },
        },
      })

      const spy = jest.fn(() => {})
      onSet(object.level1.level2, spy, 'before')
      object.level1.level2.prop = 'new value'
      expect(spy).toHaveBeenCalledWith('prop', 'new value', 'value')
    })

    it('deep mutation change listening in "before" phase, changeing a value to undefinged and a global after handler', () => {
      const onSetSpy = jest.fn(() => {})
      const object = observed(
        {
          level1: {
            level2: {
              prop: 'value',
            },
          },
        },
        { onSet: onSetSpy },
      )

      const spy = jest.fn(() => {})
      onSet(object.level1.level2, spy, 'before')
      object.level1.level2.prop = 'new value'
      expect(spy).toHaveBeenCalledWith('prop', 'new value', 'value')
      expect(onSetSpy).toHaveBeenCalledWith('prop', undefined, 'value')
    })

    it('deep mutation change listening in "before" phase, changeing a value to undefinged and a global after handler, and a global onGet', () => {
      const onSetSpy = jest.fn(() => {})
      const onGetSpy = jest.fn(() => {})
      const object = observed(
        {
          level1: {
            level2: {
              prop: 'value',
            },
          },
        },
        { onSet: onSetSpy, onGet: onGetSpy },
      )

      const spy = jest.fn(() => {})
      onSet(object.level1.level2, spy, 'before')
      object.level1.level2.prop = 'new value'
      expect(spy).toHaveBeenCalledWith('prop', 'new value', 'value')
      expect(onSetSpy).toHaveBeenCalledWith('prop', undefined, 'value')
      expect(onGetSpy).toHaveBeenCalledTimes(7)
    })
  })
})

describe('mayObserve', () => {
  it('should return the original value if options.deep is false', () => {
    const value = {}
    const options = { deep: false }
    expect(mayObserve(value, options)).toEqual(value)
  })

  it('should return the observed value if options.deep is true and value is an object', () => {
    const value = {}
    const options = { deep: true }
    const result = mayObserve(value, options)
    expect(result).not.toBe(value)
    expect(result).toEqual(observed(value, options))
  })

  it('should return the original value if value is not an object', () => {
    const value = { val: 42 }
    const options = { deep: true }
    expect(mayObserve(value, options)).toEqual(value)
  })

  it('should return the original value if value is null', () => {
    const value = { val: 42 }
    const options = { deep: true }
    expect(mayObserve(value, options)).toEqual(value)
  })

  it('should use default options if none are provided', () => {
    const value = {}
    expect(mayObserve(value)).toEqual(observed(value, defaultOptions))
  })
})

describe('readme examples', () => {
  it('handles the readme examples simple use-case well', () => {
    const onSetSpy = jest.fn((prop, value, prevValue) => {})
    const onBeforeSetSpy = jest.fn((prop, value, prevValue) => {})

    const someObject: any = { foo: 'X', cool: { test: 123 } }

    // is now observed, by default deeply
    const someObjectObserved = observed(someObject)

    const onSomethingInCoolChange = (prop, value, prevValue) => {
      onSetSpy(prop, value, prevValue)
      console.log(prop, 'changed from', prevValue, 'to', value)
    }

    // listen to changes, by default in 'after' phase, when it already happened
    onSet(someObjectObserved.cool, onSomethingInCoolChange)

    someObjectObserved.cool.test = 456 // prints to console now

    // lets set an interceptor, so we can change the values before the change happens
    const interceptAndChangeWhenSomethingInCoolChanges = (prop, value, prevValue) => {
      onBeforeSetSpy(prop, value, prevValue)
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

    // stop listenting/intercepting specifically
    offSet(someObjectObserved.cool, onSomethingInCoolChange)

    expect(someObjectObserved.cool[observedCallbacksSymbol].length).toEqual(1)

    // or remove all callbacks on that level at once
    offSet(someObjectObserved.cool)
    expect(someObjectObserved.cool[observedCallbacksSymbol].length).toEqual(0)

    expect(someObjectObserved.cool.test).toEqual(912)
    expect(someObjectObserved.lala).toEqual(234)
    expect(someObjectObserved.foo).toEqual('Y')

    expect(onBeforeSetSpy).toHaveBeenCalledTimes(1)
    expect(onBeforeSetSpy).toHaveBeenNthCalledWith(1, 'test', 456, 456)

    expect(onSetSpy).toHaveBeenCalledTimes(2)
    expect(onSetSpy).toHaveBeenNthCalledWith(1, 'test', 456, 123)
    expect(onSetSpy).toHaveBeenNthCalledWith(2, 'test', 912, 456)
  })

  it('handles the readme examples advanced use-case well', () => {
    const someObject: any = { foo: 'X', cool: { test: 123 } }

    const onSetSpy = jest.fn((prop, value, prevValue) => {})
    const onBeforeSetSpy = jest.fn((prop, value, prevValue) => {})

    // now lets say we that we want to observe any change at any level
    const someObjectObserved = observed(someObject, {
      onSet: (prop, value, prevValue) => {
        onSetSpy(prop, value, prevValue)
        console.log(prop, 'changed from', prevValue, 'to', value)
      },
      onBeforeSet: (prop, value, prevValue) => {
        onBeforeSetSpy(prop, value, prevValue)
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

    someObjectObserved.lala = 234 // prints 468

    someObjectObserved.foo = 'Y' // prints to the console

    expect(someObjectObserved.cool.test).toEqual(912)
    expect(someObjectObserved.lala).toEqual(468)
    expect(someObjectObserved.foo).toEqual('Y')

    expect(onBeforeSetSpy).toHaveBeenCalledTimes(3)
    expect(onBeforeSetSpy).toHaveBeenNthCalledWith(1, 'test', 456, 123)
    expect(onBeforeSetSpy).toHaveBeenNthCalledWith(2, 'lala', 234, undefined)
    expect(onBeforeSetSpy).toHaveBeenNthCalledWith(3, 'foo', 'Y', 'X')

    expect(onSetSpy).toHaveBeenCalledTimes(3)
    expect(onSetSpy).toHaveBeenNthCalledWith(1, 'test', 912, 123)
    expect(onSetSpy).toHaveBeenNthCalledWith(2, 'lala', 468, undefined)
    expect(onSetSpy).toHaveBeenNthCalledWith(3, 'foo', 'Y', 'X')
  })
})

describe('isObserved', () => {
  it('returns true if the object has the observed symbol', () => {
    expect(isObserved(observed({}))).toBe(true)
  })

  it('returns false if the object does not have the observed symbol', () => {
    const otherObject = {}
    expect(isObserved(otherObject)).toBe(false)
  })
})

describe('getObservers', () => {
  const callback = () => {}
  const object = observed({})
  onSet(object, callback)

  it('returns the list of atomic observer callbacks on the object', () => {
    expect(getObservers(object)).toEqual([
      {
        phase: 'after',
        cb: callback,
      },
    ])
  })

  it('returns an empty array if the object does not have the observed callbacks symbol', () => {
    const otherObject = {}
    expect(getObservers(otherObject)).toEqual(undefined)
  })
})
