<script>
    import ActionArea from "./action-area.svelte"
    import Icon from "./icon.svelte"
    import Text from "./text.svelte"

    export let checkbox
    export let color
    export let disabled
    export let label
    export let iconpos = "left"
    export let on
    export let onIcon
    export let offIcon

    export let area
    export let col
    export let row

    $: icon_on = onIcon ?? (checkbox ? "square-check" : "toggle-on")
    $: icon_off = offIcon ?? (checkbox ? "regular:square" : "toggle-off")
    $: icon = on ? icon_on : icon_off

    const toggle = () => {
        if (disabled === true) {
            return
        }
        on = (on === false)
    }
</script>

<style>
    doric-toggle {
        display: grid;
        user-select: none;
    }
    .disabled {
        opacity: 0.5;
    }
    .left {
        grid-template-columns: max-content 1fr;
        grid-template-areas: "icon label";
    }
    .right {
        grid-template-columns: 1fr max-content;
        grid-template-areas: "label icon";
    }
    .top {
        grid-template-rows: max-content 1fr;
        grid-template-areas: "icon" "label";
    }
    .bottom {
        grid-template-rows: 1fr max-content;
        grid-template-areas: "label" "icon";
    }

    icon-area {
        display: flex;
        align-items: center;
        justify-items: center;
        grid-area: icon;
        padding: 4px;
        font-size: 20px;
        transition: color 200ms linear;

        color: var(--icon-color);
        --icon-color: inherit;
    }
    icon-area.on[color="primary"] {
        --icon-color: var(--primary);
    }
    icon-area.on[color="secondary"] {
        --icon-color: var(--secondary);
    }
    icon-area.on[color="danger"] {
        --icon-color: var(--danger);
    }
    label-area {
        display: flex;
        align-items: center;
        grid-area: label;
        padding: 4px;
    }
</style>

<ActionArea {disabled} on:click={toggle} {area} {col} {row}>
    <doric-toggle class:checkbox class={iconpos} class:disabled>
        <icon-area class:on {color}>
            <Icon name={icon} />
        </icon-area>
        <label-area>
            {#if label}
                {label}
            {:else}
                <slot />
            {/if}
        </label-area>
    </doric-toggle>
</ActionArea>
