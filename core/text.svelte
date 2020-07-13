<script>
export let variant = ""
export let block = false
export let style
let klass = ""
export {klass as class}
;</script>

<style>
.block {
    display: block;
}

.title {
    display: block;
    font-size: var(--text-size-title);
    font-weight: 400;
    margin: 8px 0px;
}
.header {
    display: block;
    font-size: var(--text-size-header);
    font-weight: 400;
    margin: 4px 0px;
}
.secondary {
    color: var(--text-secondary);
    font-size: var(--text-size-secondary);
}
</style>

<span {style} class:block class="{variant} {klass}">
    <slot />
</span>
