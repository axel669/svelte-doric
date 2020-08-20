<script>
    import {
        Button,
        Card,
        CardContent,
        Divider,
        Text,

        Adornment,
        TextInput,
    } from "#lib"

    let value = ""

    const variants = ["flat", "outline"]

    let focusElement
    const focus = () => {
        focusElement.focus()
    }
;</script>

<style>
    layout {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        align-items: start;
    }

    :global(.line-break) {
        grid-column: 1 / -1;
    }
</style>

<Card>
    <CardContent>
        <Text variant="title">
            Text Input
        </Text>

        <Button on:click={focus} color="primary">
            Do the thing!
        </Button>
        <TextInput label="Focused?" bind:this={focusElement} />

        <layout>
            {#each variants as variant}
                <TextInput bind:value {variant} placeholder="Placeholder" />
                <TextInput bind:value label="Normal" {variant} tabindex="1" />
                <TextInput
                    {variant}
                    bind:value
                    label="Information"
                    info="Some information text goes here"
                />

                <Divider class="line-break" />

                <TextInput {value} label="Error" error="wat" {variant} on:focus={console.log} />
                <TextInput bind:value label="Start Adornment" {variant} type="search" on:input={console.log}>
                    <Adornment position="start">
                        $
                    </Adornment>
                </TextInput>
                <TextInput bind:value label="End Adornment" {variant}>
                    <Adornment position="end">
                        Lbs
                    </Adornment>
                </TextInput>

                <Divider class="line-break" />

                <TextInput bind:value label="Adornments" {variant} type="number">
                    <Adornment position="start">
                        $
                    </Adornment>
                    <Adornment position="end">
                        Lbs
                    </Adornment>
                </TextInput>

                <Divider class="line-break" />
            {/each}
        </layout>
    </CardContent>
</Card>
