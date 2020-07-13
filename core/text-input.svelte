<script>
import ControlBorder from "./control/border.svelte"
import ControlLabel from "./control/label.svelte"

export let value = ""
export let disabled = false
export let label = ""
export let error = ""
export let style = ""
let klass = ""
export {klass as class}

;</script>

<style>
input {
    font-family: var(--font);
    font-size: 16px;
    border-width: 0px;
    background-color: transparent;
    color: var(--text-normal);
    padding: 24px 12px;
}
input:focus {
    outline: none;
}
</style>

<ControlBorder {klass} {style} {error}>
    <input
        type="text"
        bind:value
        {disabled}
        on:input
        style="grid-area: control"
    />
    <ControlLabel>
        {label}
    </ControlLabel>
    <ControlLabel {error}>
        {error}
    </ControlLabel>
    <slot name="start-adornment" />
    <slot name="end-adornment" />
</ControlBorder>
