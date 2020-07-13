<script>
import Ripple from "../ripple.svelte"
import Button from "../button.svelte"

export let checked = false
export let toggle
export let disabled
export let color = "default"
export let labelToggle = true
export let labelPlacement = "right"
export let style = ""
let klass = ""
export {klass as class}

let labelElement
const boxClick = evt => {
    if (disabled === true) {
        return
    }
    if (labelToggle === false && labelElement.contains(evt.target)) {
        return
    }
    toggle()
}

;$: buttonColor = checked ? color : "default"
;</script>

<style>
toggle-wrapper {
    position: relative;
    display: inline-grid;
    border-radius: 4px;
    overflow: hidden;
    column-gap: 4px;
    user-select: none;
}
toggle-wrapper *:first-child {
    grid-area: symbol;
    align-self: center;
    justify-self: center;
}
toggle-wrapper > *:nth-child(2) {
    grid-area: label;
}
.disabled {
    filter: contrast(50%);
}
.right {
    grid-template-columns: min-content auto;
    grid-template-areas:
        "symbol label"
    ;
}
.left {
    grid-template-columns: auto min-content;
    grid-template-areas:
        "label symbol"
    ;
}
.top {
    grid-template-rows: auto min-content;
    grid-template-areas:
        "label"
        "symbol"
    ;
}
.bottom {
    grid-template-rows: min-content auto;
    grid-template-areas:
        "symbol"
        "label"
    ;
}
toggle-wrapper.top > *, toggle-wrapper.bottom > * {
    justify-content: center;
}

toggle-label {
    display: grid;
    align-items: center;
}
.labelToggle {
    cursor: pointer;
}
</style>

<toggle-wrapper {disabled} {style} class="{labelPlacement} {klass}" on:click={boxClick}>
    <slot />
    <toggle-label class:labelToggle bind:this={labelElement}>
        <slot name="label" />
    </toggle-label>
</toggle-wrapper>
