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
    select-arrow {
        display: grid;
        position: absolute;
        top: 0px;
        right: 0px;
        bottom: 0px;
        padding: 8px;
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
    <slot name="selected" {selected}>
        {label}: {selected.label}
    </slot>

    <select-arrow>
        <Text adorn>
            <Icon name={icon} />
        </Text>
    </select-arrow>
</Button>
