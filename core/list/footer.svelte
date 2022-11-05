<script>
    import Button from "../button.svelte"
    import Icon from "../icon.svelte"

    export let data
    export let page
    export let pageSize

    $: maxPage = Math.ceil(data.length / (pageSize ?? 1)) - 1

    const prev = () => page = Math.max(0, page - 1)
    const next = () => page = Math.min(maxPage, page + 1)
</script>

<style>
    doric-list-footer {
        bottom: 0px;
        display: grid;
        grid-template-columns: min-content auto min-content;
        height: 32px;
        position: sticky;
        width: 100%;

        background-color: var(--primary);
        color: var(--text-invert);

        --text-normal: var(--text-invert);
    }

    pagination-info {
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>

{#if pageSize !== null}
    <doric-list-footer>
        <Button on:click={prev}>
            <Icon name="arrow-left" />
        </Button>

        <pagination-info>
            Page {page + 1} / {maxPage + 1}
        </pagination-info>

        <Button on:click={next}>
            <Icon name="arrow-right" />
        </Button>
    </doric-list-footer>
{/if}
