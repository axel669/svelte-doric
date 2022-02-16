<script>
    export let error = ""
    export let label = ""
    export let info = ""
    export let variant = "normal"

    export let style = ""
    export let labelStyle = ""
    export let borderStyle = ""
    export let klass = ""
</script>

<style>
    control-component {
        display: inline-grid;
        position: relative;
        overflow: visible;
        z-index: 0;
        grid-template-rows: max-content auto;
    }
    control-content {
        position: relative;
        display: grid;
        grid-template-columns: max-content auto max-content;
        padding: 13px 4px 4px 4px;
    }
    fieldset {
        position: absolute;
        top: 0px;
        left: 0px;
        right: 0px;
        bottom: 0px;
        z-index: -1;
    }
    .normal fieldset {
        border-radius: 0px;
        border-width: 0px;
        border-bottom: 2px solid var(--control-border);
    }
    .outline fieldset {
        border: 1px solid var(--control-border);
        border-radius: 4px;
    }
    .flat fieldset {
        border-width: 0px;
    }
    legend {
        font-size: 12px;
        height: 13px;
        color: var(--control-border);
    }
    legend:empty {
        padding: 0px;
    }

    fieldset.error {
        border-color: var(--control-border-error);
    }
    control-content > :global(*:focus ~ fieldset:not(.error)) {
        border-color: var(--control-border-focus);
    }
    control-content > :global(*:focus ~ fieldset > legend) {
        color: var(--control-border-focus);
    }
    info-label {
        font-size: 13px;
        padding-left: 12px;
    }
    info-label.error {
        color: var(--control-border-error);
    }
</style>

<control-component {style} class="{variant} {klass}">
    <control-content>
        <slot name="start">
            <div />
        </slot>
        <slot />
        <slot name="end">
            <div />
        </slot>
        <fieldset class:error style={borderStyle}>
            <legend style={labelStyle}>
                {label}
            </legend>
        </fieldset>
    </control-content>
    <info-label>
        {info}
    </info-label>
    <info-label class="error">
        {error}
    </info-label>
</control-component>
