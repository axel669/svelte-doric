<script>
    import {
        Button,
        Card,
        Text,
        TitleBar,

        Chip,
        Adornment,
        Icon,
    } from "#lib"

    const colors = ["normal", "primary", "secondary", "danger"]
;</script>

<style>
</style>

<Card>
    <TitleBar>
        <title-text>
            Chips
        </title-text>
    </TitleBar>
    <card-content>
        {#each colors as color}
            <div>
                <Chip label={color} {color} />
                <Chip label={color} {color} clickable />
                <Chip label={color} {color} clickable on:tap={() => console.log(color)}>
                    <Adornment position="start">
                        <Icon name="check" />
                    </Adornment>
                </Chip>
                <Chip label={color} {color} clickable on:tap={() => console.log(color)}>
                    <Adornment position="end">
                        <Icon name="close" />
                    </Adornment>
                </Chip>
            </div>
        {/each}
    </card-content>
</Card>
