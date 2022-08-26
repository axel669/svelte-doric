<script>
    import vars from "./util/vars.js"

    export let bordered = false
    export let borderColor = null

    $: footerOpts = {
        "border-color": borderColor,
    }
</script>

<style>
    doric-footer {
        display: grid;
        grid-template-columns: max-content auto max-content;
        box-shadow: 0px -2px 4px var(--shadow-color);
        height: 56px;
        gap: 2px;
        padding: 2px;

        background-color: var(--card-background);

        --border-color: var(--layer-border-color);
    }
    doric-footer.bordered {
        border: 1px solid var(--border-color);
    }

    footer-area {
        display: grid;
    }
</style>

<doric-footer class:bordered use:vars={footerOpts}>
    <footer-area>
        <slot name="left" />
    </footer-area>

    <footer-area>
        <slot />
    </footer-area>

    <footer-area>
        <slot name="right" />
    </footer-area>
</doric-footer>
