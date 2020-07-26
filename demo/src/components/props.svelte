<script>
    import {
        Card,
        CardContent,
        Text,
    } from "#lib"
    export let props

    ;$: entries = Object.entries(props)
;</script>

<style>
    prop-entry {
        display: grid;
        grid-template-areas:
            "name type"
            "name desc"
        ;
        grid-template-columns: min-content auto;
    }
    prop-entry:nth-child(2n + 1) {
        background-color: var(--control-background);
    }

    prop-name, prop-type, prop-description, prop-default {
        display: flex;
        align-items: center;
    }
    prop-name {
        grid-area: name;
        padding: 8px;
        font-size: var(--text-header);
        font-weight: 700;
    }
    prop-type {
        grid-area: type;
        padding: 8px;
        font-style: italic;
    }
    prop-description {
        grid-area: desc;
        padding: 8px;
    }
    prop-default:empty {
        display: none;
    }
    prop-default::before {
        content: "Default: ";
    }
</style>

<Card>
    <CardContent>
        <Text variant="header">
            Component Props
        </Text>
        {#each entries as [name, info] (name)}
            <prop-entry>
                <prop-name>{name}</prop-name>
                <prop-type>
                    {info.type}
                    <prop-default>{info.defaultValue ?? ""}</prop-default>
                </prop-type>
                <prop-description>{info.desc}</prop-description>
            </prop-entry>
        {/each}
    </CardContent>
</Card>
