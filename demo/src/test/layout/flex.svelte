<script>
export let direction = "column"
export let wrap = "nowrap"
export let style

;$: vars = css.vars({
    "flex-layout-flow": `${direction} ${wrap}`
})
;</script>

<style>
flex-container {
    display: flex;
    flex-flow: var(--flex-layout-flow);
}
</style>

<flex-container style="{style} {vars}">
    <slot />
</flex-container>
