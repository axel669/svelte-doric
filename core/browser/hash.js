const {readable} = require("svelte/store")

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

module.exports = hashStore
