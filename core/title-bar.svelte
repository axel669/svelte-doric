<script>
    export let sticky
    export let center
    export let compact
</script>

<style>
    doric-title-bar {
        position: relative;
        z-index: +0;
        grid-template-rows: 48px min-content;
        background-color: var(--background-layer);

        display: grid;
    }
    doric-title-bar.sticky {
        position: sticky;
        top: 0px;
        left: 0px;
        right: 0px;
        z-index: +50;
    }
    doric-title-bar.compact {
        grid-template-rows: 32px min-content;
        box-shadow: none;
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
    title-text.compact {
        font-size: var(--text-size-header);
    }
</style>

<doric-title-bar class:sticky class:compact>
    <title-area>
        <slot name="menu">
            <div />
        </slot>
        <title-text class:center class:compact>
            <slot />
        </title-text>
        <slot name="action">
            <div />
        </slot>
    </title-area>
    <slot name="extension" />
</doric-title-bar>
