export const observedSymbol = Symbol('observed')
export const observedCallbacksSymbol = Symbol('observedCallbacks')

export type SetCallback = (prop: PropertyKey, value: any, valueBefore: any, receiver: any) => void | Promise<void>
export type GetCallback = (prop: PropertyKey, value: any, target: any, receiver: any) => void | Promise<void>

export interface ObserveOptions {
  /** allows for deep mutation listening. default: true  */
  deep?: boolean
  /** allows to register a callback globally to hook/mutate all mutations every level just before they happen. Has to return a value  */
  onBeforeSet?: SetCallback
  /** allows to register a callback globally to hook/mutate all mutations on every level after they have happened  */
  onSet?: SetCallback
  /** allows to get notified when a value is read */
  onGet?: GetCallback
}

export const defaultOptions: ObserveOptions = {
  deep: true,
}

export type Phase = 'before' | 'after'

export interface CallbackRegistration {
  cb: SetCallback
  phase: Phase
}

const errorMsgCallbackIsNotAFunction = 'callback must be a function'

/** listens for mutations on an object or its sub-objects */
export const onSet = <T extends object>(object: T, callback: SetCallback, phase: Phase = 'after') => {
  if (typeof callback !== 'function') {
    throw new Error(errorMsgCallbackIsNotAFunction)
  }

  initCallbackArray(object)

  // add the first global callback if set
  object[observedCallbacksSymbol].push({
    cb: callback,
    phase,
  })

  defineProp(object, observedCallbacksSymbol, [...object[observedCallbacksSymbol]])
}

/** initializes an observed objects mutation callback references */
export const initCallbackArray = <T extends Object>(object: T) => {
  // prepare for callbacks to be added
  if (!object[observedCallbacksSymbol]) {
    defineProp(object, observedCallbacksSymbol, [])
  }
}

/** defined a property on an object without polluting the objects own keys */
export const defineProp = (object: object | Array<any>, prop: PropertyKey, value: any) => {
  Object.defineProperty(object, prop, {
    enumerable: false,
    value,
    writable: true,
    configurable: false,
  })
}

/** removes a specific or all listeners from a mutation-observed object or its sub-objects */
export const offSet = <T extends object>(object: T, callback?: SetCallback) => {
  // remove all listeners
  if (typeof callback === 'undefined') {
    defineProp(object, observedCallbacksSymbol, [])
    return
  }

  // remove specific listeners
  if (typeof callback !== 'function') {
    throw new Error(errorMsgCallbackIsNotAFunction)
  }

  if (!Array.isArray(object[observedCallbacksSymbol])) {
    throw new Error('callback is not registered')
  }

  // removes the matching callback registration
  defineProp(
    object,
    observedCallbacksSymbol,
    object[observedCallbacksSymbol].filter(
      (callbackRegistration: CallbackRegistration) => callbackRegistration.cb !== callback,
    ),
  )
}

/** observes the object if it actually is an object (runtime check) - used for recursion / deep observation */
export const mayObserve = (value: object, options: ObserveOptions = defaultOptions) => {
  if (typeof value === 'object' && value !== null) {
    return observed(value, {
      ...options,
      deep: false,
    })
  }
  return value
}

/** checks if the observed symbol is in place */
export const isObserved = <T extends object>(object: T): boolean => !!object[observedSymbol]

/** returns the list of atomic observer callbacks on that object */
export const getObservers = <T extends object>(object: T): Array<CallbackRegistration> =>
  object[observedCallbacksSymbol]

/** observes mutations of an object via an Proxy at any depth */
export const observed = <T extends Object>(object: T, options: ObserveOptions = defaultOptions): T => {
  options = {
    ...defaultOptions,
    ...options,
  }

  initCallbackArray(object)

  const keys = Object.keys(object)

  for (let i = 0; i < keys.length; i++) {
    object[keys[i]] = mayObserve(object[keys[i]], options)
  }

  if (isObserved(object)) {
    // check if observed and return original in case
    return object
  } else {
    const proxy = new Proxy<T>(object, {
      get: (target, propertyKey, receiver) => {
        const value = Reflect.get(target, propertyKey, receiver)
        if (typeof options.onGet === 'function') {
          options.onGet(propertyKey, value, target, receiver)
        }
        return value
      },

      set: (target, prop, value, receiver) => {
        const valueBefore = target[prop]

        // observe deep / nested (recursive)?
        value = mayObserve(value, options)

        // call global callback if set (always in 'after' phase)
        if (typeof options.onBeforeSet === 'function') {
          value = options.onBeforeSet(prop, value, valueBefore, receiver)
        }

        const observers = getObservers(object)

        // inform all 'before' registered callbacks
        for (let i = 0; i < observers.length; i++) {
          const callbackRegistration: CallbackRegistration = observers[i]

          if (callbackRegistration.phase === 'before') {
            // allow to hook and override in 'before' phase (value change interception)
            value = callbackRegistration.cb(prop, value, valueBefore, receiver)
          }
        }

        // actually set the value for the prop on the target object
        Reflect.set(target, prop, value, receiver)

        // inform all 'after' registered callbacks
        for (let i = 0; i < observers.length; i++) {
          const callbackRegistration: CallbackRegistration = observers[i]

          if (callbackRegistration.phase === 'after') {
            callbackRegistration.cb(prop, value, valueBefore, receiver)
          }
        }

        // call global callback if set (always in 'after' phase)
        if (typeof options.onSet === 'function') {
          options.onSet(prop, value, valueBefore, receiver)
        }
        return true
      },
    })

    // mark as observed
    defineProp(object, observedSymbol, true)

    return proxy
  }
}
