import norn from "@axel669/norn"
import {readable, writable} from "svelte/store"

const {actions, store} = norn({
    a: {
        initial: 10,
        inc: a => a + 1,
        dec: a => a - 1,
    },
    b: {
        initial: 12,
        inc: b => b + 1,
        dec: b => b - 1,
    },
    customerID: {
        initial: "",
        set: (_, value) => value,
    }
})

window.actions = actions
store.subscribe(console.log)

const svelteStore = readable(
    store.readState(),
    set => store.subscribe(
        next => set(next)
    )
)

const contextStore = writable("")

const bindStore = store =>
    valueFunc => readable(
        valueFunc(store.readState()),
        set => store.subscribe(
            (next, prev) => {
                const prevValue = valueFunc(prev)
                const nextValue = valueFunc(next)
                if (prevValue !== nextValue) {
                    set(nextValue)
                }
            }
        )
    )
const appStore = bindStore(store)

export {
    actions,
    store as nornStore,
    svelteStore as store,
    appStore,
    // cssvars,
}
