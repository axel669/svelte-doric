<script>
    import Adornment from "./adornment.svelte"
    import Button from "./button.svelte"
    import ControlDrawer from "./control-drawer.svelte"
    import Icon from "./icon.svelte"
    import Text from "./text.svelte"
    import TextInput from "./text-input.svelte"
    import TitleBar from "./title-bar.svelte"

    import OptionList from "./select/option-list.svelte"

    export let options
    export let value
    export let label = ""
    export let persistent = false
    export let icon = "caret-right"
    export let disabled
    export let searchable = false

    let drawer = null
    const select = (newValue) => {
        drawer.close()
        filter = ""
        value = newValue
    }

    let filter = ""

    $: shown = options.filter(
        opt => opt.label.toLowerCase().includes(filter.toLowerCase())
    )
    $: info = {
        select,
        options: shown,
        currentValue: value,
    }
    $: selected = options.find(
        option => option.value === value
    )
</script>

<style>
    select-layout {
        display: grid;
        flex-grow: 1;
        grid-template-columns: auto max-content;
    }
</style>

<ControlDrawer {persistent} bind:this={drawer}>
    {#if label}
        <TitleBar compact sticky>
            {label}
            <Adornment slot="extension">
                {#if searchable}
                    <TextInput bind:value={filter} label="Filter" />
                {/if}
            </Adornment>
        </TitleBar>
    {/if}
    <slot name="options" {info}>
        <OptionList {info} />
    </slot>
</ControlDrawer>

<Button variant="outline" {...$$props} on:tap={() => drawer.open()} {disabled}>
    <select-layout>
        <Text adorn>
            <slot name="selected" {selected}>
                {label}: {selected.label}
            </slot>
        </Text>
        <Text adorn>
            <Icon name={icon} />
        </Text>
    </select-layout>
</Button>
