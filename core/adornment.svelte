<script>
export let position = ""
export let style
;</script>

<style>
adornment {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    padding: 4px;
}
adornment.start {
    grid-area: start-adornment;
}
adornment.end {
    grid-area: end-adornment;
}
</style>

<adornment class={position} {style}>
    <slot />
</adornment>
