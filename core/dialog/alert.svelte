<script>
import Button from "../button.svelte"
import Card from "../card.svelte"
import CardActions from "../card/actions.svelte"
import CardContent from "../card/content.svelte"
import Divider from "../divider.svelte"
import Text from "../text.svelte"
import {vars} from "../style/css.js"


export let options
export let close
export let position = {}
export let okText = "OK"

const okClose = () => close(true)

;$: positionVars = {
    "alert-top": position.y,
    "alert-left": position.x
}
;</script>

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
        <CardContent>
            <Text variant="header">
                {options.title || "Alert"}
            </Text>
            <Divider />
            {options.message || ""}
        </CardContent>
        <CardActions>
            <alert-actions>
                <Button color="primary" on:click={okClose}>
                    {okText}
                </Button>
            </alert-actions>
        </CardActions>
    </Card>
</alert-wrapper>
