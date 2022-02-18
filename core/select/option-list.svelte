<script>
    import Button from "../button.svelte"
    import Icon from "../icon.svelte"

    export let color = "primary"
    export let variant = "outline"
    export let square = true
    export let info

    const {select, currentValue, options} = info
</script>

<style>
    option-list {
        display: grid;
        grid-template-columns: 1fr;
        grid-auto-rows: 40px;
        padding: 8px;
        gap: 2px;
    }
</style>

<option-list>
    {#each options as {label, value}}
        <Button on:tap={() => select(value)} {variant} {color} {square}>
            {#if value === currentValue}
                <Icon name="check-lg" />
            {/if}
            {label}
        </Button>
    {/each}
</option-list>
