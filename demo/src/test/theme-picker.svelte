<script>
    import {
        ActionArea,
        Icon,
    } from "@core"

    export let theme
    export let options
</script>

<style>
    doric-theme-picker {
        display: grid;
        grid-auto-columns: 1fr;
        grid-auto-flow: column;
        min-height: 32px;
        gap: 1px;
    }

    theme-option {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
    }
    theme-option.selected {
        color: var(--secondary);
    }
</style>

<doric-theme-picker>
    {#each options as {label, icon, value}}
        <ActionArea on:tap={() => theme = value}>
            <theme-option class:selected={theme === value}>
                <Icon name={icon} />
                {#if label}
                    {label}
                {/if}
            </theme-option>
        </ActionArea>
    {/each}
</doric-theme-picker>
