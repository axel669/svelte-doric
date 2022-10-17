<script>
    import {createEventDispatcher} from "svelte";
    import Ripple from "./ripple.svelte"
    import vars from "./util/vars.js"

    export let adorn
    export let buttonColor = null
    export let color = "default"
    export let compact
    export let disabled = false
    export let round
    export let square
    export let variant = "normal"

    const dispatch = createEventDispatcher()
    const handleTap = evt => {
        if (disabled === true) {
            return
        }
        // Mobile browsers don't like dispatching events inside custom events
        setTimeout(
            () => dispatch("tap", evt),
            0
        )
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
        z-index: +0;
        font-weight: 500;

        --button-color: var(--text-normal);
        --fill-color: var(--button-default-fill);
        --text-color: var(--button-default-text);

        color: var(--button-color);
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

<doric-button
    on:tap={handleTap}
    use:vars={buttonVars}
    class="{color} {variant}"
    class:disabled
    class:round
    class:compact
    class:adorn
    class:square
>
    <slot />
    <Ripple {disabled} />
</doric-button>
