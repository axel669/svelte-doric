<script>
    import Button from "../button.svelte"
    import Icon from "../icon.svelte"
    import vars from "../util/vars"

    export let options = []
    export let value
    export let checkedIcon = "done"
    export let cols = options.length

    const set = (newValue) =>
        () => value = newValue

    $: radioCols = { cols }
</script>

<style>
    doric-radio-buttons {
        display: grid;
        grid-template-columns: repeat(var(--cols), 1fr);
    }

    doric-radio-buttons > :global(doric-button:not(:first-child)) {
        border-top-left-radius: 0px;
        border-bottom-left-radius: 0px;
    }
    doric-radio-buttons > :global(doric-button:not(:last-child)) {
        border-top-right-radius: 0px;
        border-bottom-right-radius: 0px;
    }
</style>

<doric-radio-buttons use:vars={radioCols}>
    {#each options as option (option)}
        <Button on:click={set(option.value)} color={option.color} action>
            {#if option.value === value}
                <Icon name={checkedIcon} size="24px" />
            {/if}
            {option.label}
        </Button>
    {/each}
</doric-radio-buttons>
