<script>
import ControlBorder from "./control/border.svelte"
import ControlLabel from "./control/label.svelte"
import Icon from "./icon.svelte"

export let label = ""
export let error = ""
export let value

;</script>

<style>
select :global(option), select :global(optgroup) {
    background-color: var(--control-background);
    color: var(--text-normal);
    padding: 8px;
}
select {
    border-width: 0px;
    grid-area: control;
    padding: 24px 12px;
    background-color: transparent;
    color: var(--text-normal);
    cursor: pointer;
    -webkit-appearance: none;
}
select:focus {
    outline: none;
}

arrow-icon {
    position: absolute;
    top: 50%;
    right: 12px;
    transform: translateY(-45%);
    pointer-events: none;
}
</style>

<ControlBorder>
    <select on:input bind:value>
        <slot />
    </select>
    <ControlLabel>
        {label}
    </ControlLabel>
    <ControlLabel {error}>
        {error}
    </ControlLabel>
    <arrow-icon>
        <Icon name="arrow_drop_down" size="28px" />
    </arrow-icon>
    <slot name="start-adornment" />
</ControlBorder>
