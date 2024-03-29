<script>
    import {createEventDispatcher} from "svelte";
    import Ripple from "./ripple.svelte"
    import vars from "./util/vars.js"
    import linker from "./util/link.mjs"
    import grid from "./util/grid.mjs"

    export let adorn
    export let buttonColor = null
    export let color = "default"
    export let compact
    export let control = false
    export let disabled = false
    export let link = null
    export let round
    export let square
    export let variant = "normal"

    $: openLink = (link === null) ? null : linker(link)
    const dispatch = createEventDispatcher()
    const handleTap = evt => {
        if (disabled === true) {
            return
        }

        if (openLink !== null) {
            openLink(evt)
            return
        }

        dispatch("click", evt)
    }

    $: buttonVars = {
        "button-round-size": round,
        "button-color": buttonColor,
    }
</script>

<style>
    doric-button {
        position: relative;
        padding: 8px 16px;
        border-radius: 4px;
        user-select: none;
        cursor: pointer;
        overflow: hidden;
        box-sizing: border-box;
        vertical-align: middle;

        display: inline-flex;
        justify-content: center;
        align-items: center;
        font-weight: 500;

        --button-color: var(--text-normal);
        --fill-color: var(--button-default-fill);
        --text-color: var(--button-default-text);

        color: var(--button-color);
    }
    doric-button::after {
        position: absolute;
        content: "";
        width: 100%;
        height: 100%;
        transition: background-color 200ms linear;
        background-color: rgba(0, 0, 0, 0);
    }
    doric-button:not(.disabled):active::after {
        transition: none;
        background-color: var(--ripple-color, var(--ripple-normal));
    }

    .round {
        min-width: var(--button-round-size);
        height: var(--button-round-size);
        padding: 8px;
        border-radius: var(--button-round-size);
    }
    .compact {
        width: var(--button-round-size);
        padding: 4px 8px;
    }
    .adorn {
        padding-top: 2px;
        padding-bottom: 2px;
        margin: 4px;
    }
    .control {
        padding: 0px;
    }

    .disabled {
        opacity: 0.5;
    }

    .primary {
        --button-color: var(--button-primary);
        --fill-color: var(--button-primary);
        --ripple-color: var(--button-primary-ripple);
        --text-color: var(--button-primary-text);
    }
    .secondary {
        --button-color: var(--button-secondary);
        --fill-color: var(--button-secondary);
        --ripple-color: var(--button-secondary-ripple);
        --text-color: var(--button-secondary-text);
    }
    .danger {
        --button-color: var(--button-danger);
        --fill-color: var(--button-danger);
        --ripple-color: var(--button-danger-ripple);
        --text-color: var(--button-danger-text);
    }

    .fill {
        --ripple-color: var(--button-filled-ripple);
        background-color: var(--fill-color);
        color: var(--button-filled-text-color);
    }
    .outline {
        border: 1px solid var(--button-color);
        color: var(--button-color);
    }
    .square {
        border-radius: 0px;
    }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<doric-button
    on:click={handleTap}
    use:vars={buttonVars}
    use:grid={$$props}
    class="{color} {variant}"
    class:adorn
    class:compact
    class:control
    class:disabled
    class:round
    class:square
    class:ignore-appbar-reskin={adorn === "no-reskin"}
>
    <slot />
</doric-button>
