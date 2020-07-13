<script>
import {createEventDispatcher} from "svelte"

import Ripple from "./ripple.svelte"
import Icon from "./icon.svelte"
import Button from "./button.svelte"

export let group = []
export let value
export let functional = false

export let checked = false
export let checkedIcon = "check_box"
export let uncheckedIcon = "check_box_outline_blank"
export let outlined
export let disabled

export let type

export let color = "default"
export let labelToggle = true
export let style = ""
let klass = ""
export {klass as class}

const dispatch = createEventDispatcher()

if (group.indexOf(value) !== -1) {
    checked = true
}

let localInput = null
const toggle = () => {
    if (labelToggle === false) {
        return
    }
    const next = !checked
    if (!functional) {
        checked = next
    }
    dispatch("change", next)
    // localInput.click()
}
const buttonToggle = () => {
    if (labelToggle === true) {
        return
    }
    const next = !checked
    if (!functional) {
        checked = next
    }
    dispatch("change", next)
    // localInput.click()
}
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

;$: icon = checked ? checkedIcon : uncheckedIcon
;$: buttonColor = checked ? color : "default"

;$: updateGroup(checked)

;</script>

<style>
toggle-wrapper {
    position: relative;
    display: inline-grid;
    border-radius: 4px;
    overflow: hidden;
    grid-template-columns: min-content auto;
    column-gap: 4px;
    align-items: center;
    user-select: none;
}
toggle-wrapper.labelToggle {
    /* cursor: pointer; */
}
.disabled {
    filter: contrast(50%);
}

switch-wrapper {
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

input {
    display: none;
}
</style>

<toggle-wrapper
    {disabled}
    {style}
    on:click={toggle}
    class:labelToggle
    class={klass}
>
    <Button round="30px" color={buttonColor} on:click={buttonToggle} {disabled}>
        {#if type === "checkbox"}
            <Icon name={icon} size="24px" {outlined} />
        {/if}
        {#if type === "switch"}
            <switch-wrapper>
                <switch-track class:checked class={color} />
                <switch-thumb class:checked />
            </switch-wrapper>
        {/if}
    </Button>
    <div style="cursor: pointer; display: grid;">
        <slot />
    </div>
    <input
        type="checkbox"
        bind:checked
        on:change
        bind:this={localInput}
        {disabled}
        {value}
    />
</toggle-wrapper>
