<script>
    export let sticky
    export let center
</script>

<style>
    doric-title-bar {
        position: relative;
        z-index: +0;
        grid-template-rows: 56px min-content;
        background-color: var(--title-bar-background);
        color: var(--title-bar-text);

        display: grid;
        grid-template-columns: min-content auto min-content;
        grid-template-areas:
            "start-adornment title end-adornment"
            "bottom-adornment bottom-adornment bottom-adornment"
        ;
        box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.25);

        --text-normal: var(--title-bar-text);
        --ripple-color: var(--ripple-dark);
        --control-border: var(--title-bar-text);
        --control-border-focus: var(--title-bar-text);
    }
    doric-title-bar.sticky {
        position: sticky;
        top: 0px;
        left: 0px;
        right: 0px;
        z-index: +50;
    }
    doric-title-bar > :global(title-text) {
        grid-area: title;
        font-size: var(--text-size-title);
        display: flex;
        align-items: center;
        padding: 8px;
        font-weight: 700;
        user-select: none;
    }
    doric-title-bar.center > :global(title-text) {
        justify-content: center;
    }
</style>

<doric-title-bar class:sticky class:center>
    <slot />
</doric-title-bar>
