<script>
// import {createEventDispatcher} from "svelte"

import ToggleBase from "./toggle/base.svelte"
import Button from "./button.svelte"
import Icon from "./icon.svelte"

export let group = []
export let value

export let checked = group.indexOf(value) !== -1
export let disabled
export let color = "default"
// export let functional = false
export let labelPlacement


// const dispatch = createEventDispatcher()
// const toggle = () => {
//     const next = !checked
//     if (functional !== true) {
//         checked = next
//     }
//     dispatch("change", next)
// }
const toggle = () => checked = !checked
const updateGroup = checked => {
    if (checked === false) {
        if (group.indexOf(value) !== -1) {
            group = group.filter(v => v !== value)
        }
        return
    }
    if (group.indexOf(value) === -1) {
        group = [...group, value]
    }
}

;$: updateGroup(checked)
;$: buttonColor = checked ? color : "default"
;</script>

<style>
switch-label {
    display: flex;
    align-items: center;
}
switch-toggle {
    grid-area: symbol;
    align-self: center;
    justify-self: center;
}

switch-wrapper {
    display: block;
    position: relative;
    height: 36px;
    width: 48px;
}
switch-track {
    position: absolute;
    top: 50%;
    left: 0px;
    width: 100%;
    height: 28px;
    border-radius: 18px;
    background-color: var(--text-normal);
    opacity: 0.32;
    transform: translateY(-50%);
    transition: background-color 100ms linear, opacity 100ms linear;
}
switch-thumb {
    position: absolute;
    top: 50%;
    left: 0px;
    width: 16px;
    height: 16px;
    border-radius: 18px;
    background-color: #e0e0e0;
    transform: translate(8px, -50%);
    transition: transform 100ms linear;
}
switch-thumb.checked {
    transform: translate(26px, -50%);
}
switch-track.checked:not(.default) {
    background-color: var(--button-color);
    opacity: 0.75;
}
</style>

<ToggleBase {checked} {disabled} {toggle} {color} {labelPlacement}>
    <switch-toggle>
        <Button round="48px" color={buttonColor} {disabled}>
            <switch-wrapper>
                <switch-track class:checked class="{color}" />
                <switch-thumb class:checked />
            </switch-wrapper>
        </Button>
    </switch-toggle>
    <switch-label slot="label">
        <slot />
    </switch-label>
</ToggleBase>
