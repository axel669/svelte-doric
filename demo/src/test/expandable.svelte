<script>
    import {
        Adornment,
        Button,
        Card,
        Icon,
        TitleBar
    } from "#lib"
    export let component
    export let title
    export let id

    let open = false
    const toggle = () => open = !open
    $: name = open ? "expand_less" : "expand_more"
</script>

<style>
    card-content[expandable] {
        display: none;
    }
    card-content.open {
        display: block;
    }
</style>

<div {id} />
<Card>
    <TitleBar>
        <title-text>
            {title}
        </title-text>
        <Adornment position="end">
            <Button round="32px" fab on:tap={toggle}>
                <Icon {name} />
            </Button>
        </Adornment>
    </TitleBar>
    <card-content expandable class:open>
        <svelte:component this={component} />
    </card-content>
</Card>
