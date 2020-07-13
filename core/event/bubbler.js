import {bubble, get_current_component} from "svelte/internal"

export default (handler) => {
    const component = get_current_component()
    const bubbleEvent = evt => bubble(component, evt)

    return evt => handler(evt, bubbleEvent)
}
