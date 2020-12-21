<script>
    let klass = ""
    export {klass as class}
</script>

<style>
    doric-card {
        display: grid;
        border-radius: 4px;
        background-color: var(--card-background);
        border: var(--card-border);
        box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);
        overflow: hidden;
    }

    doric-card > :global(card-content) {
        display: block;
        padding: 16px;
    }
    doric-card > :global(card-actions) {
        display: block;
        padding: 8px;
    }
</style>

<doric-card class={klass}>
    <slot />
</doric-card>
