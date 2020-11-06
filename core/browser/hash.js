import {readable} from "svelte/store"

const readHash = () => document.location.hash.toString().slice(1)
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

export default hashStore
// let currentHash = readHash()
// setInterval(
//     () => {
//         const hash = readHash()
//         if (hash !== currentHash) {
//             const evt = new CustomEvent("hashupdate")
//             evt.oldHash = currentHash
//             evt.newHash = hash
//             currentHash = hash
//             window.dispatchEvent(evt)
//         }
//     },
//     30
// )
