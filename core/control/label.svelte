<script>
export let error
;</script>

<style>
*:focus ~ control-label:not(.error) {
    border-color: var(--button-primary);
    color: var(--button-primary);
}
control-label {
    z-index: -1;
    position: absolute;
    top: 0px;
    left: 13px;
    font-size: 12px;
    pointer-events: none;
    padding: 0px 4px;
    border-radius: 2px;
    border: 1px solid var(--border-color);
    background-color: var(--control-background);
}
control-label:empty {
    display: none;
}
control-label.error {
    top: auto;
    bottom: 0px;
}
</style>

<control-label class:error>
    <slot />
</control-label>
