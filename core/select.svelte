<script>
    import Button from "./button.svelte"
    import ControlDrawer from "./control-drawer.svelte"
    import Icon from "./icon.svelte"
    import Text from "./text.svelte"
    import TitleBar from "./title-bar.svelte"

    import OptionList from "./select/option-list.svelte"

    export let options
    export let value
    export let label = ""
    export let persistent = false
    export let icon = "caret-right-fill"

    let open = false
    const select = (newValue) => {
        open = false
        value = newValue
    }

    $: info = {
        select,
        options,
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

<ControlDrawer bind:open {persistent}>
    {#if label}
        <TitleBar compact>
            {label}
        </TitleBar>
    {/if}
    <slot name="options" {info}>
        <OptionList {info} />
    </slot>
</ControlDrawer>

<Button variant="outline" {...$$props} on:tap={() => open = true}>
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
