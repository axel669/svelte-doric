<script>
    import ToggleBase from "./toggle/base.svelte"
    import Button from "./button.svelte"
    import Icon from "./icon.svelte"

    export let disabled
    export let color = "default"
    export let labelPlacement

    export let checkedIcon = "radio_button_checked"
    export let uncheckedIcon = "radio_button_unchecked"
    export let outlined

    export let group = []
    export let value

    const toggle = () => group = value

    ;$: icon = checked ? checkedIcon : uncheckedIcon
    ;$: buttonColor = checked ? color : "default"
    ;$: checked = group === value
;</script>

<style>
    radio-label {
        display: flex;
        align-items: center;
    }
    radio-check {
        grid-area: symbol;
        align-self: center;
        justify-self: center;
    }
</style>

<ToggleBase {checked} {disabled} {toggle} {color} {labelPlacement}>
    <radio-check>
        <Button round="48px" color={buttonColor} {disabled}>
            <Icon name={icon} size="24px" {outlined} />
        </Button>
    </radio-check>
    <radio-label slot="label">
        <slot />
    </radio-label>
</ToggleBase>
