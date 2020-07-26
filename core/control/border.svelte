<script>
export let klass
export let style
export let error
;</script>

<style>
control-border {
    position: relative;
    display: inline-grid;
    grid-template-areas: "start-adornment control end-adornment";
    grid-template-columns: auto 1fr auto;
    z-index: +0;

    --border-color: var(--text-normal);
}
control-border.error {
    --border-color: var(--button-danger);
}

fieldset {
    z-index: -2;
    position: absolute;
    top: 6px;
    left: 0px;
    right: 0px;
    bottom: 6px;
    pointer-events: none;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--control-background);
}

*:focus ~ fieldset:not(.error) {
    border-color: var(--button-primary);
}
</style>

<control-border class={klass} {style} class:error>
    <slot />
    <fieldset class:error />
</control-border>
