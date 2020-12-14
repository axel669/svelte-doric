<script>
    import {fade} from "svelte/transition"

    import Button from "./button.svelte"
    import Control from "./control.svelte"
    import Icon from "./icon.svelte"
    import List from "./list.svelte"
    import Popover from "./popover.svelte"
    import Ripple from "./ripple.svelte"

    export let label = ""
    export let error = ""
    export let info = ""
    export let variant
    let klass = ""
    export {klass as class}

    export let value = ""
    export let disabled = false
    export let options = []
    export let origin = {}

    let display = null
    const focus = () => {
        display.focus()
    }

    let visible = false
    const openOptions = () => visible = true
    const closeOptions = () => visible = false

    const keep = (evt) => {
        if (visible === true) {
            evt.preventDefault()
            evt.target.focus()
        }
    }

    const size = {width: "100%"}

    const update = item => {
        value = item.value
        closeOptions()
    }
    $: controlProps = {
        label,
        info,
        error,
        variant,
        klass,
    }
    $: selectedItem = options.find(item => item.value === value) ?? {label: ""}
</script>

<style>
    arrow-icon {
        grid-area: end-adornment;
        display: flex;
        align-items: center;
    }

    tap-area {
        position: absolute;
        top: 0px;
        left: 0px;
        right: 0px;
        bottom: 0px;
        cursor: pointer;
    }

    options-display {
        background-color: var(--background-layer);
        display: inline-block;
        max-height: 20vh;
        min-width: 100%;
        overflow-y: auto;
    }

    selected-item-display {
        display: inline-block;
        padding: 8px;
        grid-area: control;
        user-select: none;
    }
    selected-item-display:focus {
        outline: none;
    }
    list-item {
        cursor: pointer;
    }

    list-item-content > :global(select-label) {
        min-width: 100%;
    }
</style>

<Popover {visible} {origin} {size} modal on:cancel={closeOptions}>
    <Control {...controlProps}>
        <selected-item-display bind:this={display} tabindex="0" on:blur={keep}>
            <slot name="selected" {selectedItem}>
                {selectedItem.label}
            </slot>
        </selected-item-display>
        <arrow-icon>
            <Icon name="arrow_drop_down" size="28px" />
        </arrow-icon>
    </Control>
    <tap-area on:tap={openOptions} on:focus={focus} tabindex="-1">
        <Ripple {disabled} />
    </tap-area>
    <options-display slot="content" transition:fade={{duration: 250}}>
        <List let:item items={options}>
            <list-item on:tap={() => update(item)} dividers>
                <list-item-content>
                    <slot {item}>
                        <select-label>
                            {item.label}
                        </select-label>
                    </slot>
                </list-item-content>
                <Ripple />
            </list-item>
        </List>
    </options-display>
</Popover>
