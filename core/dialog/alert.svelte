<script>
    import Button from "../button.svelte"
    import Card from "../card.svelte"
    import Divider from "../divider.svelte"
    import Text from "../text.svelte"
    import {vars} from "../style/css.js"


    export let options
    export let close
    export let position = {}
    export let okText = "OK"

    const okClose = () => close(true)

    $: positionVars = {
        "alert-top": position.y,
        "alert-left": position.x
    }
</script>

<style>
    alert-wrapper {
        position: absolute;
        top: var(--alert-top, 50%);
        left: var(--alert-left, 50%);
        transform: translate(-50%, -50%);
        width: 70vw;
        max-width: 320px;
    }
    alert-actions {
        display: grid;
    }
</style>

<alert-wrapper use:vars={positionVars}>
    <Card>
        <card-content>
            <Text variant="header">
                {options.title || "Alert"}
            </Text>
            <Divider />
            {options.message || ""}
        </card-content>
        <card-actions>
            <alert-actions>
                <Button color="primary" on:tap={okClose}>
                    {okText}
                </Button>
            </alert-actions>
        </card-actions>
    </Card>
</alert-wrapper>
