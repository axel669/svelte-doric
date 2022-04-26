<script>
    import Button from "../button.svelte"
    import Icon from "../icon.svelte"
    import Text from "../text.svelte"

    export let color = "primary"
    export let variant = "outline"
    export let square = true
    export let info

    $: ({select, currentValue, options} = info)
</script>

<style>
    option-list {
        display: grid;
        grid-template-columns: 24px 1fr;
        grid-auto-rows: 40px;
        padding: 8px;
        gap: 2px;
    }
</style>

<option-list>
    {#each options as {label, value, icon}}
        <Text adorn {color}>
            {#if value === currentValue}
                <Icon name="circle-check" size="20px" />
            {/if}
        </Text>
        <Button on:tap={() => select(value)} {variant} {color} {square}>
            <Icon name={icon} />
            {label}
        </Button>
    {/each}
</option-list>
