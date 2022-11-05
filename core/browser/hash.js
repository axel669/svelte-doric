import { readable } from "svelte/store"

const readHash = () => {
    if (typeof document !== "undefined") {
        return document.location.hash.toString().slice(1)
    }
    return ""
}
const hashStore = readable(
    readHash(),
    set => {
        const scanner = setInterval(
            () => set(readHash()),
            20
        )
        return () => clearInterval(scanner)
    }
)

export default {
    subscribe: hashStore.subscribe,
    set: (value) => {
        if (value === null) {
            history.pushState(
                null,
                null,
                `${location.origin}${location.pathname}`
            )
            return
        }
        history.pushState(null, null, `#${value}`)
    },
    clear: () => history.pushState(null, null, "")
}
