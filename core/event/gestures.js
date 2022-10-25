import nvalue from "../util/nvalue"

const touchState = {}

const keepKeys = (source, dest) => {
    dest.altKey = source.altKey
    dest.ctrlKey = source.ctrlKey
    dest.metaKey = source.metaKey
}
if (typeof window !== "undefined") {
    const pointerStart = "pointer-start"
    const pointerEnd = "pointer-end"
    const evtOptions = {bubbles: true}

    const isMobile = (window.ontouchstart !== undefined)
    const sourceEvents = isMobile
        ? {down: "touchstart", up: "touchend"}
        : {down: "mousedown", up: "mouseup"}

    window.addEventListener(
        sourceEvents.down,
        evt => {
            if (isMobile === false && evt.button !== 0) {
                return
            }
            const customEvent = new CustomEvent(pointerStart, evtOptions)
            evt.identifier = nvalue(evt.identifier, -1)
            customEvent.changedTouches = isMobile ? evt.changedTouches : [evt]
            keepKeys(evt, customEvent)
            evt.target.dispatchEvent(customEvent)
        },
        {capture: true}
    )
    window.addEventListener(
        sourceEvents.up,
        evt => {
            if (isMobile === false && evt.button !== 0) {
                return
            }
            const customEvent = new CustomEvent(pointerEnd, evtOptions)
            evt.identifier = nvalue(evt.identifier, -1)
            customEvent.changedTouches = isMobile ? evt.changedTouches : [evt]
            keepKeys(evt, customEvent)
            evt.target.dispatchEvent(customEvent)
        },
        {capture: true}
    )

    window.addEventListener(
        pointerStart,
        evt => {
            const timestamp = Date.now()
            for (const touch of evt.changedTouches) {
                touchState[touch.identifier] = {
                    timestamp,
                    touch,
                }
            }
        },
        {capture: true}
    )
    window.addEventListener(
        pointerEnd,
        evt => {
            const timestamp = Date.now()
            for (const touch of evt.changedTouches) {
                const prev = touchState[touch.identifier]
                touchState[touch.identifier] = null

                if (prev === null || prev === undefined) {
                    return
                }

                const duration = timestamp - prev.timestamp
                const dist = Math.sqrt(
                    (prev.touch.clientX - touch.clientX) ** 2
                    + (prev.touch.clientY - touch.clientY) ** 2
                )
                if (dist > 30 || duration > 500) {
                    return
                }

                const customEvent = new CustomEvent("tap", evtOptions)
                customEvent.changedTouches = [touch]
                keepKeys(evt, customEvent)
                touch.target.dispatchEvent(customEvent)
            }
        },
        {capture: true}
    )
}
