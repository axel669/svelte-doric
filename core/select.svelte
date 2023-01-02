<script>
    import Button from "./button.svelte"
    import ControlDrawer from "./control-drawer.svelte"
    import Icon from "./icon.svelte"
    import Text from "./text.svelte"
    import TextInput from "./text-input.svelte"
    import Titlebar from "./titlebar.svelte"

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
    const open = () => drawer.open()

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
        grid-template-columns: 24px auto;
        grid-template-rows: min-content auto;
    }

    label-area {
        display: block;
        user-select: none;
        font-size: 13px;
        grid-column: span 2;
        padding: 2px 16px;
        border-bottom-right-radius: 4px;
        width: max-content;
        cursor: default;

        border-bottom: 1px solid var(--control-border);
        border-right: 1px solid var(--control-border);

        color: var(--control-border);
    }
    label-area:empty {
        display: none;
    }

    selected-area {
        padding: 8px;
    }
</style>

<ControlDrawer {persistent} bind:this={drawer}>
    {#if label}
        <Titlebar compact sticky>
            {label}
            <svelte:fragment slot="extension">
                {#if searchable}
                    <TextInput bind:value={filter} label="Filter" adorn />
                {/if}
            </svelte:fragment>
        </Titlebar>
    {/if}
    <slot name="options" {info}>
        <OptionList {info} />
    </slot>
</ControlDrawer>

<Button variant="outline" {...$$props} on:click={open} {disabled} control>
    <select-layout>
        <label-area>
            {label}
        </label-area>
        <Text adorn>
            <Icon name={icon} />
        </Text>
        <selected-area>
            <Text>
                <slot name="selected" {selected}>
                    {selected?.label ?? "Not Selected"}
                </slot>
            </Text>
        </selected-area>
    </select-layout>
</Button>
