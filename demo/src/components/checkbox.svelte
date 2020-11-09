<script>
    import {
        Checkbox,
        Divider,

        Card,
        CardContent,
        Text,
    } from "#lib"

    import Props from "./props.svelte"

    const colors = [
        "default",
        "primary",
        "secondary",
        "danger",
    ]

    const props = {
        group: {
            type: "Array",
            desc: "Group binding, acts the same as Svelte's bind:group"
        },
        value: {
            type: "Object",
            desc: `Value to use with bind:group.
                Binding to value won't have any effect.`
        },
        labelToggle: {
            type: "Boolean",
            defaultValue: true,
            desc: `If true, the label of the checkbox can be clicked to toggle
                it. If false, only the check icon will toggle.`
        }
    }

    let checked = false
;</script>

<style>
    grid-layout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
</style>

<Card>
    <CardContent>
        <Text variant="title">
            Checkbox
        </Text>

        <Text variant="header">
            Colors
        </Text>

        <grid-layout>
            {#each colors as color}
                <Checkbox bind:checked {color}>
                    {color.slice(0, 1).toUpperCase()}{color.slice(1)}
                </Checkbox>
            {/each}
            {#each colors as color}
                <Checkbox bind:checked {color} disabled>
                    Disabled {color.slice(0, 1).toUpperCase()}{color.slice(1)}
                </Checkbox>
            {/each}
        </grid-layout>

        <Divider />
    </CardContent>
</Card>
