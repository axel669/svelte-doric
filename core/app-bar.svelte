<script>
    export let center
</script>

<style>
    doric-app-bar {
        position: relative;
        z-index: +0;
        grid-template-rows: 56px min-content;
        background-color: var(--title-bar-background);
        color: var(--title-bar-text);

        display: grid;
        box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.25);
    }
    doric-app-bar:not(.compact)
    :global(doric-adornment > *:not([ignore-titlebar-reskin])) {
        --text-normal: var(--title-bar-text);
        --ripple-color: var(--ripple-dark);
        --control-border: var(--title-bar-text);
        --control-border-focus: var(--title-bar-text);
    }

    title-area {
        display: grid;
        grid-template-columns: max-content auto max-content;
    }

    title-text {
        font-size: var(--text-size-title);
        display: flex;
        align-items: center;
        padding: 8px;
        font-weight: 700;
        user-select: none;
    }
    title-text.center {
        justify-content: center;
    }
</style>

<doric-app-bar>
    <title-area>
        <slot name="menu">
            <div />
        </slot>
        <title-text class:center>
            <slot />
        </title-text>
        <slot name="action">
            <div />
        </slot>
    </title-area>
    <slot name="extension" />
</doric-app-bar>
