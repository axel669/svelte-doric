<script>
    import Button from "./button"
    import Icon from "./icon"
    import vars from "./util/vars"

    export let options
    export let value
    export let checkedIcon = "radio_button_checked"
    export let uncheckedIcon = "radio_button_unchecked"
    export let labelPosition = "right"
    export let cols = 1
    export let labelToggle = true

    const icon = (checked) => checked ? checkedIcon : uncheckedIcon
    const update = (newValue, isLabel = false) => {
        if (labelToggle === false && isLabel === true) {
            return
        }
        value = newValue
    }

    $: radioCols = { cols }
</script>

<style>
    doric-radio {
        display: grid;
        grid-template-columns: repeat(var(--cols), 1fr);
        gap: 2px;
    }

    radio-item {
        display: grid;
    }
    radio-item.right {
        grid-template-columns: 48px auto;
        grid-template-areas:
            "check label"
        ;
    }
    radio-item.left {
        grid-template-columns: auto 48px;
        grid-template-areas:
            "label check"
        ;
    }
    radio-item.top {
        grid-template-rows: auto 48px;
        grid-template-areas:
            "label"
            "check"
        ;
    }
    radio-item.bottom {
        grid-template-rows: 48px auto;
        grid-template-areas:
            "check"
            "label"
        ;
    }

    radio-check {
        align-self: center;
        justify-self: center;
        grid-area: check;
    }

    radio-label {
        cursor: pointer;
        display: grid;
        user-select: none;
        grid-area: label;
    }
    center-text {
        display: flex;
        align-items: center;
    }
    .bottom center-text, .top center-text {
        justify-content: center;
    }
</style>

<doric-radio use:vars={radioCols}>
    {#each options as option (option)}
        <radio-item class={labelPosition}>
            <radio-check on:tap={() => update(option.value)}>
                <Button round="48px"
                color={option.color}
                disabled={option.disabled}>
                    <Icon name={icon(value === option.value)} size="24px" />
                </Button>
            </radio-check>
            <radio-label on:tap={() => update(option.value, true)}>
                <slot name="label" {option}>
                    <center-text>
                        {option.label}
                    </center-text>
                </slot>
            </radio-label>
        </radio-item>
    {/each}
</doric-radio>
