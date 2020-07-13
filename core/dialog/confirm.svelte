<script>
import Button from "../button.svelte"
import Card from "../card.svelte"
import CardActions from "../card/actions.svelte"
import CardContent from "../card/content.svelte"
import Divider from "../divider.svelte"
import Text from "../text.svelte"
import css from "../style/css.js"

export let options
export let close
export let position = {}
export let confirmText = "OK"
export let cancelText = "Cancel"

const cancelClose = () => close(false)
const okClose = () => close(true)

;$: positionVars = css.vars({
    "confirm-top": position.y,
    "confirm-left": position.x
})
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

<confirm-wrapper style={positionVars}>
    <Card>
        <CardContent>
            <Text variant="header">
                {options.title || "Confirm"}
            </Text>
            <Divider />
            {options.message || ""}
        </CardContent>
        <CardActions>
            <confirm-actions>
                <Button color="danger" on:click={cancelClose}>
                    {cancelText}
                </Button>
                <Button color="primary" on:click={okClose}>
                    {confirmText}
                </Button>
            </confirm-actions>
        </CardActions>
    </Card>
</confirm-wrapper>
