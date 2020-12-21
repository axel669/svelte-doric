<script>
    import {
        Button,
        Card,
        Text,
    } from "#lib"

    let clicked = []

    const buttonTypes = ["normal", "outline", "fill"]
    const buttonColors = ["default", "primary", "secondary", "danger"]

    const showClick = (variant, color) =>
        evt => clicked = [variant, color]
</script>

<style>
    button-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-gap: 4px;
    }
</style>

<Card>
    <card-content>
        <Text variant="title">
            Buttons
        </Text>
    </card-content>
    {#each buttonTypes as variant}
        <Card>
            <card-content>
                <Text variant="header">
                    Button Variant: {variant}
                </Text>
                <button-grid>
                    {#each buttonColors as color}
                        <Button
                            {variant} {color}
                            on:tap={showClick(variant, color)}
                        >
                            {variant} / {color}
                        </Button>
                    {/each}
                    {#each buttonColors as color}
                        <Button
                            {variant} {color}
                            disabled
                            on:tap={showClick(variant, color)}
                        >
                            disabled - {variant} / {color}
                        </Button>
                    {/each}
                </button-grid>
            </card-content>
        </Card>
    {/each}
    <card-content>
        Clicked: {clicked.join(" / ")}
    </card-content>
</Card>
