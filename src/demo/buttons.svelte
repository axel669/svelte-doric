<script>
import Button from "../component/button.svelte"

const buttonTypes = ["normal", "outline", "filled"]
const buttonColors = ["default", "primary", "secondary", "danger"]
;</script>

<style>
grid {
    display: grid;
    grid-template-columns: repeat(
        var(--cols, 12),
        1fr
    );
}
</style>

<grid style="--cols: 4">
    {#each buttonTypes as variant}
        {#each buttonColors as color}
            <Button {variant} {color} on:click={console.log}>
                {variant} / {color}
            </Button>
            <Button {variant} {color} disabled on:click={console.log}>
                disabled - {variant} / {color}
            </Button>
        {/each}
    {/each}
</grid>
