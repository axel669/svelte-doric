<script>
    export let color = "default"
    let klass = ""
    export {klass as class}
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
    card-title:empty {
        border-width: 0px;
        height: 0px;
        min-height: 0px;
        padding: 0px;
    }
</style>

<doric-card class={klass} style="--border-color: var(--{color});">
    <card-title>
        <slot name="title" />
    </card-title>
    <slot />
</doric-card>
