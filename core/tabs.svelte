<script>
    import ActionArea from "./action-area"
    import Icon from "./icon"

    import vars from "./util/vars"

    export let tabGroup
    export let options
    export let vertical

    const change = (value) =>
        () => tabGroup = value

    $: tabCount = {
        tabs: options.length
    }
</script>

<style>
    doric-tabs {
        display: grid;
        grid-template-columns: repeat(var(--tabs), 1fr);
        background-color: var(--card-background);
        color: var(--text-normal);
    }
    doric-tabs.vertical {
        grid-template-columns: 1fr;
        grid-template-rows: repeat(var(--tabs), 1fr);
    }

    tab-item {
        display: grid;
        border-width: 0px;
        border-bottom-width: 2px;
        border-style: solid;
        border-color: transparent;
    }
    tab-item.selected {
        color: var(--primary);
        border-color: var(--primary);
    }
    .vertical tab-item {
        border-bottom-width: 0px;
        border-right-width: 2px;
    }
    tab-label {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        font-size: var(--text-sixe-header);
    }
</style>

<doric-tabs class:vertical use:vars={tabCount} ignore-titlebar-reskin>
    {#each options as option (option.value)}
        <tab-item class:selected={option.value === tabGroup}>
            <ActionArea on:tap={change(option.value)}>
                <tab-label>
                    {#if option.icon}
                        <Icon name={option.icon} />
                    {/if}
                    {option.label}
                </tab-label>
            </ActionArea>
        </tab-item>
    {/each}
</doric-tabs>
