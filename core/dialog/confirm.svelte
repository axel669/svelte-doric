<script>
import Button from "../button.svelte"
import Card from "../card.svelte"
// import CardActions from "../card/actions.svelte"
// import CardContent from "../card/content.svelte"
import Divider from "../divider.svelte"
import Text from "../text.svelte"
import {vars} from "../style/css.js"

export let options
export let close
export let position = {}
export let confirmText = "OK"
export let cancelText = "Cancel"

const cancelClose = () => close(false)
const okClose = () => close(true)

;$: positionVars = {
    "confirm-top": position.y,
    "confirm-left": position.x
}
;</script>

<style>
confirm-wrapper {
    position: absolute;
    top: var(--confirm-top, 50%);
    left: var(--confirm-left, 50%);
    transform: translate(-50%, -50%);
    width: 70vw;
    max-width: 320px;
}
confirm-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 4px;
}
</style>

<confirm-wrapper use:vars={positionVars}>
    <Card>
        <card-content>
            <Text variant="header">
                {options.title || "Confirm"}
            </Text>
            <Divider />
            {options.message || ""}
        </card-content>
        <card-actions>
            <confirm-actions>
                <Button color="danger" on:click={cancelClose}>
                    {cancelText}
                </Button>
                <Button color="primary" on:click={okClose}>
                    {confirmText}
                </Button>
            </confirm-actions>
        </card-actions>
    </Card>
</confirm-wrapper>
