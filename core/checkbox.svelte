<script>
import {createEventDispatcher} from "svelte"

import ToggleBase from "./toggle/base.svelte"
import Button from "./button.svelte"
import Icon from "./icon.svelte"

export let group = []
export let value

export let checked = group.indexOf(value) !== -1
export let disabled
export let color = "default"
export let functional = false
export let labelPlacement

export let checkedIcon = "check_box"
export let uncheckedIcon = "check_box_outline_blank"
export let outlined


const dispatch = createEventDispatcher()
const toggle = () => {
    const next = !checked
    if (functional !== true) {
        checked = next
    }
    dispatch("change", next)
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
checkbox-label {
    display: flex;
    align-items: center;
}
checkbox-check {
    grid-area: symbol;
    align-self: center;
    justify-self: center;
}
</style>

<ToggleBase {checked} {disabled} {toggle} {color} {labelPlacement}>
    <checkbox-check>
        <Button round="48px" color={buttonColor} {disabled}>
            <Icon name={icon} size="24px" {outlined} />
        </Button>
    </checkbox-check>
    <checkbox-label slot="label">
        <slot />
    </checkbox-label>
</ToggleBase>
