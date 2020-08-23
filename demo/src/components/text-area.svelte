<script>
    import {
        Button,
        Card,
        CardContent,
        Divider,
        Text,

        Adornment,
        TextArea,
    } from "#lib"

    let value = ""

    const variants = ["flat", "outline"]
;</script>

<style>
    layout {
        display: grid;
        grid-template-columns: 1fr;
        align-items: start;
    }
</style>

<Card>
    <CardContent>
        <Text variant="title">
            Text Area
        </Text>

        <layout>
            <TextArea label="Textarea" bind:value>
                <Adornment position="start">
                    {value.length} / 250
                </Adornment>
            </TextArea>
        </layout>
    </CardContent>
</Card>
