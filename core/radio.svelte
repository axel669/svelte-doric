<script>
    import Button from "./button.svelte"
    import Icon from "./icon.svelte"
    import vars from "./util/vars"

    export let checkedIcon = "check-circle"
    export let cols = 1
    export let labelPosition = "right"
    export let labelToggle = true
    export let options
    export let uncheckedIcon = "circle"
    export let value

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

        --radio-size: 40px;
    }

    radio-item {
        display: grid;
    }
    radio-item.right {
        grid-template-columns: var(--radio-size) auto;
        grid-template-areas:
            "check label"
        ;
    }
    radio-item.left {
        grid-template-columns: auto var(--radio-size);
        grid-template-areas:
            "label check"
        ;
    }
    radio-item.top {
        grid-template-rows: auto var(--radio-size);
        grid-template-areas:
            "label"
            "check"
        ;
    }
    radio-item.bottom {
        grid-template-rows: var(--radio-size) auto;
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
        display: flex;
        align-items: center;
        user-select: none;
        grid-area: label;
    }
    /* center-text {
        display: flex;
        align-items: center;
    } */
    .bottom radio-label, .top radio-label {
        justify-content: center;
    }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<doric-radio use:vars={radioCols}>
    {#each options as option (option)}
        <radio-item class={labelPosition}>
            <radio-check on:click={() => update(option.value)}>
                <Button round="40px"
                color={option.color}
                disabled={option.disabled}>
                    <Icon name={icon(value === option.value)} size="16px" />
                </Button>
            </radio-check>
            <radio-label on:click={() => update(option.value, true)}>
                <slot name="label" {option}>
                    {option.label}
                </slot>
            </radio-label>
        </radio-item>
    {/each}
</doric-radio>
