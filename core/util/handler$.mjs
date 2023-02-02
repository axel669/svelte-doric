const handler$ = (func) =>
    (...args) =>
        () => func(...args)
const eventHandler$ = (func) =>
    (...args) =>
        (event) => func(event, ...args)

export { handler$, eventHandler$ }
