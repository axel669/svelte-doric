<script>
    export let error = ""
    export let label = ""
    export let info = ""

    export let style
    export let labelStyle
    export let borderStyle
;</script>

<style>
    control-component {
        display: grid;
        position: relative;
    }
    control-content {
        position: relative;
        display: grid;
        grid-template-columns: min-content auto min-content;
        grid-template-areas:
            "start-adornment control end-adornment"
        ;
        padding: 17px 8px 8px 8px;
    }
    fieldset {
        border: 1px solid var(--control-border);
        border-radius: 4px;
        position: absolute;
        top: 0px;
        left: 0px;
        right: 0px;
        bottom: 0px;
        z-index: -1;
    }
    legend {
        font-size: 12px;
        height: 13px;
    }
    legend:empty {
        padding: 0px;
    }

    fieldset.error {
        border-color: var(--control-border-error);
    }
    *:focus ~ fieldset:not(.error) {
        border-color: var(--control-border-focus);
    }
    *:focus ~ fieldset > legend {
        color: var(--control-border-focus);
    }
</style>

<control-component type="text-input" {style}>
    <control-content>
        <slot />
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
