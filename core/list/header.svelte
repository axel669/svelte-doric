<script>
export let sticky
export let color = "default"
;</script>

<style>
list-header {
    display: grid;
    position: relative;
    padding: 8px;
    color: var(--text-normal);
    background-color: var(--control-background);
    font-weight: 500;
    font-size: var(--text-size-header);
    border-bottom: 2px solid var(--text-normal);
}
list-header.sticky {
    position: sticky;
    top: 0px;
    z-index: +5;
}
list-header.primary {
    color: var(--button-primary);
}
list-header.secondary {
    color: var(--button-secondary);
}
list-header.danger {
    color: var(--button-danger);
}
.compact > list-header {
    padding: 4px;
}
</style>

<list-header class:sticky class={color}>
    <slot />
</list-header>
