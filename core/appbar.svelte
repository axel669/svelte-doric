<script>
    export let center
</script>

<style>
    doric-app-bar {
        position: relative;
        grid-template-rows: 56px min-content;
        background-color: var(--title-bar-background);

        display: grid;
        box-shadow: 0px 2px 2px var(--shadow-color);
    }
    doric-app-bar > :global(:not(.ignore-appbar-reskin)),
    title-area > :global(:not(.ignore-appbar-reskin)) {
        color: var(--title-bar-text);
        --text-normal: var(--title-bar-text);
        --ripple-color: var(--ripple-dark);
        --control-border: var(--title-bar-text);
        --control-border-focus: var(--title-bar-text);
    }

    title-area {
        display: grid;
        grid-template-columns: max-content auto max-content;
        color: var(--title-bar-text);
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
