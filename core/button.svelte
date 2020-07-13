<script>
import bubbler from "./event/bubbler.js"
import Ripple from "./ripple.svelte"

export let color = "default"
export let variant = "normal"
export let style = ""
export let disabled = false
export let round
export let fab

let klass = ""
export {klass as class}

const clicks = bubbler(
    (evt, bubble) => {
        if (disabled === true) {
            return
        }
        bubble(evt)
    }
)

;</script>

<style>
button-content {
    position: relative;
    padding: 8px 16px;
    border-radius: 4px;
    user-select: none;
    cursor: pointer;
    overflow: hidden;
    box-sizing: border-box;
    vertical-align: middle;

    display: inline-flex;
    justify-content: center;
    align-items: center;
    z-index: +1;
    font-weight: 500;

    --ripple-color: var(--ripple-normal);
    --button-color: var(--text-normal);
    --text-color: var(--text-invert);

    color: var(--button-color);
}

.round {
    min-width: var(--button-round-size);
    height: var(--button-round-size);
    padding: 8px;
    border-radius: var(--button-round-size);
}
.fab {
    width: var(--button-round-size);
    color: var(--button-fab-color);
    padding: 0px;
}

.disabled {
    filter: contrast(50%);
}

.primary {
    --button-color: var(--button-primary);
    --ripple-color: var(--button-primary-ripple);
    --text-color: var(--button-primary-text);
}
.secondary {
    --button-color: var(--button-secondary);
    --ripple-color: var(--button-secondary-ripple);
    --text-color: var(--button-secondary-text);
}
.danger {
    --button-color: var(--button-danger);
    --ripple-color: var(--button-danger-ripple);
    --text-color: var(--button-danger-text);
}

.filled:not(.default) {
    --ripple-color: var(--button-filled-ripple);
    background-color: var(--button-color);
    color: var(--text-color);
}
.outline {
    border: 1px solid var(--button-color);
    color: var(--button-color);
}
</style>

<button-content
    on:click={clicks}
    class="{color} {variant} {klass}"
    class:disabled
    class:round
    class:fab
    style="--button-round-size: {round}; {style}"
>
    <slot />
    <Ripple {disabled} />
</button-content>
