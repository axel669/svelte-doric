const touchState = {}

if (typeof window !== "undefined") {
    if (window.ontouchstart === undefined) {
        window.addEventListener(
            "mousedown",
            evt => {
                if (evt.button !== 0) {
                    return
                }
                const customEvt = new CustomEvent("touchstart")
                evt.identifier = -1
                customEvt.changedTouches = [evt]
                evt.target.dispatchEvent(customEvt)
            },
            {capture: true}
        )
        window.addEventListener(
            "mouseup",
            evt => {
                if (evt.button !== 0) {
                    return
                }
                const customEvt = new CustomEvent("touchend")
                evt.identifier = -1
                customEvt.changedTouches = [evt]
                evt.target.dispatchEvent(customEvt)
            },
            {capture: true}
        )
    }

    window.addEventListener(
        "touchstart",
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
        "touchend",
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

                const customEvent = new CustomEvent("tap")
                customEvent.changedTouches = [touch]
                touch.target.dispatchEvent(customEvent)
            }
        },
        {capture: true}
    )
}
