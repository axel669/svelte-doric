<script>
import {
    Button,
    Card,
    CardContent,
    Text,
} from "#lib"

let clicked = []

const buttonTypes = ["normal", "outline", "fill"]
const buttonColors = ["default", "primary", "secondary", "danger"]

const showClick = (variant, color) =>
    evt => clicked = [variant, color]

;</script>

<style>
grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 4px;
}
</style>

<Card>
    <CardContent>
        <Text variant="title">
            Buttons
        </Text>
    </CardContent>
    {#each buttonTypes as variant}
        <Card>
            <CardContent>
                <Text variant="header">
                    Button Variant: {variant}
                </Text>
                <grid>
                    {#each buttonColors as color}
                        <Button
                            {variant} {color}
                            on:click={showClick(variant, color)}
                        >
                            {variant} / {color}
                        </Button>
                    {/each}
                    {#each buttonColors as color}
                        <Button
                            {variant} {color}
                            disabled
                            on:click={showClick(variant, color)}
                        >
                            disabled - {variant} / {color}
                        </Button>
                    {/each}
                </grid>
            </CardContent>
        </Card>
    {/each}
    <CardContent>
        Clicked: {clicked.join(" / ")}
    </CardContent>
</Card>
