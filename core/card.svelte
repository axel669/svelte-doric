<script>
    import vars from "./util/vars"

    export let color = "default"
    let klass = ""
    export {klass as class}

    $: cardColor = {
        "border-color": `var(--${color})`
    }
</script>

<style>
    doric-card {
        display: grid;
        border-radius: 4px;
        border-style: solid;
        box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);
        grid-template-rows: min-content auto;
        overflow: hidden;

        background-color: var(--card-background);
        border-color: var(--border-color, var(--layer-border-color));
        border-width: var(--layer-border-width);
    }

    card-title {
        display: flex;
        align-items: center;
        user-select: none;

        min-height: 28px;
        padding: 4px;

        font-size: var(--text-size-header);
        border-bottom: 1px solid var(--border-color, var(--layer-border-color));
    }
</style>

<doric-card class={klass} use:vars={cardColor}>
    {#if $$slots.title}
        <card-title>
            <slot name="title" />
        </card-title>
    {/if}
    <slot />
</doric-card>
