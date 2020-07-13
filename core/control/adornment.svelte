<script>
export let position = ""
;</script>

<style>
adornment {
    display: inline-flex;
    justify-content: center;
    align-items: center;
}
adornment.start {
    grid-area: start-adornment;
}
control-border > adornment.start {
    padding-left: 12px;
    margin-right: -8px;
}
adornment.end {
    grid-area: end-adornment;
}
control-border > adornment.end {
    padding-right: 12px;
    margin-left: -8px;
}
</style>

<adornment class={position}>
    <slot />
</adornment>
