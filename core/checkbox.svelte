<script>
    import ToggleBase from "./toggle/base.svelte"
    import Button from "./button.svelte"
    import Icon from "./icon.svelte"

    export let group = []
    export let value

    export let checked = group.indexOf(value) !== -1
    export let disabled
    export let color = "default"
    export let labelPlacement
    export let labelToggle = true

    export let checkedIcon = "check-square"
    export let uncheckedIcon = "regular:square"
    export let outlined

    const toggle = () => checked = !checked
    const updateGroup = checked => {
        if (checked === false) {
            if (group.indexOf(value) !== -1) {
                group = group.filter(v => v !== value)
            }
            return
        }
        if (group.indexOf(value) === -1) {
            group = [...group, value].sort()
        }
    }

    $: icon = checked ? checkedIcon : uncheckedIcon
    $: buttonColor = checked ? color : "default"
    $: updateGroup(checked)
</script>

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

<ToggleBase {checked} {disabled} {toggle} {color} {labelPlacement} {labelToggle}>
    <checkbox-check>
        <Button round="40px" color={buttonColor} {disabled} fab>
            <Icon name={icon} size="16px" {outlined} />
        </Button>
    </checkbox-check>
    <checkbox-label slot="label">
        <slot />
    </checkbox-label>
</ToggleBase>
