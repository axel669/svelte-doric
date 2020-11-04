<script>
    import {
        Button,
        Card,
        CardContent,
        Text,

        Chip,
        Adornment,
        Icon,
    } from "#lib"

    const colors = ["normal", "primary", "secondary", "danger"]
;</script>

<style>
</style>

<Card>
    <CardContent>
        {#each colors as color}
            <div>
                <Chip label={color} {color} />
                <Chip label={color} {color} clickable />
                <Chip label={color} {color} clickable on:click={() => console.log(color)}>
                    <Adornment position="start">
                        <Icon name="check" />
                    </Adornment>
                </Chip>
                <Chip label={color} {color} clickable on:click={() => console.log(color)}>
                    <Adornment position="end">
                        <Icon name="close" />
                    </Adornment>
                </Chip>
            </div>
        {/each}
    </CardContent>
</Card>
